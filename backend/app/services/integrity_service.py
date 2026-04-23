from __future__ import annotations

import hashlib
import json
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Types, Objects, Instances, Properties, InstanceProperties
from app.models.integrity import IntegritySnapshot

ScopeType = Literal["types", "objects", "instances"]


def _normalize_value(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return str(value)


def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _canonical_bytes(scope: str, fields: dict[str, Any]) -> bytes:
    parts = [scope]
    for key in sorted(fields.keys()):
        parts.append(f"{key}={_normalize_value(fields[key])}")
    return "|".join(parts).encode("utf-8")


def _hash_record(scope: str, fields: dict[str, Any]) -> bytes:
    return _sha256(_canonical_bytes(scope, fields))


def _hash_collection(scope: str, items: list[dict[str, Any]]) -> bytes:
    """
    Детеминированный хеш коллекции.
    Порядок элементов фиксируется заранее на уровне SQL ORDER BY.
    """
    h = hashlib.sha256()
    h.update(f"{scope}|count={len(items)}|".encode("utf-8"))
    for item in items:
        h.update(_hash_record(scope, item))
    return h.digest()


def _tree_hash(root_id: int, node_payload_hash: dict[int, bytes], children_map: dict[int | None, list[int]], order_map: dict[int, int]) -> bytes | None:
    root_children = children_map.get(None, [])
    if not root_children:
        return None

 
    root_node_id = None
    for nid in root_children:
        if nid == root_id:
            root_node_id = nid
            break
    if root_node_id is None:
        root_node_id = root_id

    memo: dict[int, bytes] = {}

    def dfs(node_id: int) -> bytes:
        if node_id in memo:
            return memo[node_id]

        child_hashes = [dfs(child_id) for child_id in children_map.get(node_id, [])]
        h = hashlib.sha256()
        h.update(node_payload_hash[node_id])
        for ch in child_hashes:
            h.update(ch)

        memo[node_id] = h.digest()
        return memo[node_id]

    return dfs(root_node_id)


async def compute_scope_root_hash(
    session: AsyncSession,
    scope_type: ScopeType,
    root_id: int,
) -> bytes | None:
    """
    Возвращает root hash для дерева types/objects/instances.
    Derived-поля tin/tout/tree_size в hash НЕ включаем.
    """
    if scope_type == "types":
        result = await session.execute(
            select(Types).where(Types.root_id == root_id).order_by(Types.tin.asc(), Types.id.asc())
        )
        rows = result.scalars().all()
        if not rows:
            return None

        children_map: dict[int | None, list[int]] = defaultdict(list)
        order_map: dict[int, int] = {}
        payload_hash: dict[int, bytes] = {}

        for row in rows:
            order_map[row.id] = row.tin or 0
            children_map[row.parent_id].append(row.id)
            payload_hash[row.id] = _hash_record(
                "type",
                {
                    "id": row.id,
                    "name": row.name,
                    "parent_id": row.parent_id,
                    "root_id": row.root_id,
                },
            )

        # стабильный порядок детей
        for pid in children_map:
            children_map[pid].sort(key=lambda nid: (order_map.get(nid, 0), nid))

        return _tree_hash(root_id, payload_hash, children_map, order_map)

    if scope_type == "objects":
        result = await session.execute(
            select(Objects).where(Objects.root_id == root_id).order_by(Objects.tin.asc(), Objects.id.asc())
        )
        rows = result.scalars().all()
        if not rows:
            return None

        object_ids = [r.id for r in rows]

        prop_rows = []
        if object_ids:
            prop_result = await session.execute(
                select(Properties)
                .where(Properties.object_id.in_(object_ids))
                .order_by(Properties.object_id.asc(), Properties.property_id.asc(), Properties.id.asc())
            )
            prop_rows = prop_result.scalars().all()

        props_by_object: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for p in prop_rows:
            props_by_object[p.object_id].append(
                {
                    "id": p.id,
                    "property_id": p.property_id,
                    "value": p.value,
                    "object_id": p.object_id,
                }
            )

        children_map: dict[int | None, list[int]] = defaultdict(list)
        order_map: dict[int, int] = {}
        payload_hash: dict[int, bytes] = {}

        for row in rows:
            order_map[row.id] = row.tin or 0
            children_map[row.parent_id].append(row.id)

            properties_hash = _hash_collection("properties", props_by_object.get(row.id, []))

            h = hashlib.sha256()
            h.update(_hash_record(
                "object",
                {
                    "id": row.id,
                    "name": row.name,
                    "type_id": row.type_id,
                    "parent_id": row.parent_id,
                    "root_id": row.root_id,
                },
            ))
            h.update(properties_hash)
            payload_hash[row.id] = h.digest()

        for pid in children_map:
            children_map[pid].sort(key=lambda nid: (order_map.get(nid, 0), nid))

        return _tree_hash(root_id, payload_hash, children_map, order_map)

    if scope_type == "instances":
        result = await session.execute(
            select(Instances).where(Instances.root_id == root_id).order_by(Instances.tin.asc(), Instances.id.asc())
        )
        rows = result.scalars().all()
        if not rows:
            return None

        instance_ids = [r.id for r in rows]

        iprop_rows = []
        if instance_ids:
            iprop_result = await session.execute(
                select(InstanceProperties)
                .where(InstanceProperties.instance_id.in_(instance_ids))
                .order_by(InstanceProperties.instance_id.asc(), InstanceProperties.property_type_id.asc(), InstanceProperties.id.asc())
            )
            iprop_rows = iprop_result.scalars().all()

        iprops_by_instance: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for p in iprop_rows:
            iprops_by_instance[p.instance_id].append(
                {
                    "id": p.id,
                    "value": p.value,
                    "instance_id": p.instance_id,
                    "property_type_id": p.property_type_id,
                }
            )

        children_map: dict[int | None, list[int]] = defaultdict(list)
        order_map: dict[int, int] = {}
        payload_hash: dict[int, bytes] = {}

        for row in rows:
            order_map[row.id] = row.tin or 0
            children_map[row.parent_id].append(row.id)

            properties_hash = _hash_collection("instance_properties", iprops_by_instance.get(row.id, []))

            h = hashlib.sha256()
            h.update(_hash_record(
                "instance",
                {
                    "id": row.id,
                    "name": row.name,
                    "object_id": row.object_id,
                    "parent_id": row.parent_id,
                    "root_id": row.root_id,
                    "is_active": row.is_active,
                },
            ))
            h.update(properties_hash)
            payload_hash[row.id] = h.digest()

        for pid in children_map:
            children_map[pid].sort(key=lambda nid: (order_map.get(nid, 0), nid))

        return _tree_hash(root_id, payload_hash, children_map, order_map)

    raise ValueError(f"Unsupported scope_type: {scope_type}")


async def rebuild_and_store_snapshot(
    session: AsyncSession,
    scope_type: ScopeType,
    root_id: int,
    changed_by_user_id: uuid.UUID | None = None,
) -> bytes | None:
    """
    Считает root_hash и сохраняет snapshot.
    """
    root_hash = await compute_scope_root_hash(session, scope_type, root_id)
    if root_hash is None:
        return None

    session.add(
        IntegritySnapshot(
            scope_type=scope_type,
            root_id=root_id,
            root_hash=root_hash,
            changed_by_user_id=changed_by_user_id,
        )
    )
    await session.flush()
    return root_hash
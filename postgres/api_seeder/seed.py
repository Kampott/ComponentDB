from __future__ import annotations

import asyncio
import itertools
import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from .catalog import EVENT_TYPES, ROOT_SPECS, EventTypeSpec, NodeSpec
from .client import ApiClient, ApiError
from .progress import ProgressReporter
from .schemas.core import (
    InstancePropertiesCreate,
    InstancesCreate,
    ObjectsCreate,
    PropertiesCreate,
    PropertyTypesCreate,
    TypesCreate,
)
from .schemas.events import EventTypesCreate, EventTypesTypesCreate, EventsCreate, ReplacementsCreate


@dataclass(frozen=True)
class PropertyTemplate:
    name: str
    is_static: bool


@dataclass
class CreatedType:
    id: int
    spec: NodeSpec
    depth: int
    path_label: str


@dataclass
class CreatedObject:
    id: int
    type_key: str
    type_id: int
    name: str
    parent_id: int | None
    root_id: int
    depth: int
    path_code: str


@dataclass
class CreatedInstance:
    id: int
    object_id: int
    parent_id: int | None
    root_id: int
    is_active: bool


@dataclass
class SeedStats:
    types: int = 0
    objects: int = 0
    property_types: int = 0
    object_properties: int = 0
    root_instances: int = 0
    instances_total: int = 0
    instance_properties: int = 0
    event_types: int = 0
    event_links: int = 0
    events: int = 0
    replacements: int = 0


@dataclass
class SeedConfig:
    prefix: str
    base_url: str
    username: str
    password: str
    instances_per_root_object: int = 5
    events_per_instance_min: int = 10
    events_per_instance_max: int = 12
    replacement_probability: float = 0.18
    seed: int = 42
    dry_run: bool = False
    concurrency: int = 20


class Seeder:
    def __init__(self, client: ApiClient, config: SeedConfig, progress: ProgressReporter) -> None:
        self.client = client
        self.config = config
        self.progress = progress
        self.rng = random.Random(config.seed)
        self.stats = SeedStats()
        self.type_by_key: dict[str, CreatedType] = {}
        self.objects_by_id: dict[int, CreatedObject] = {}
        self.root_object_ids: list[int] = []
        self.property_type_ids: dict[tuple[str, bool], list[tuple[str, int]]] = {}
        self.event_type_ids: dict[str, int] = {}
        self.existing_roots: list[str] = []
        self._fake_ids = itertools.count(1)

    async def run(self) -> SeedStats:
        if not self.config.dry_run:
            await self._guard_prefix()
        await self._init_progress()
        await self._seed_types()
        await self._seed_property_types()
        await self._seed_objects()
        await self._seed_object_properties()
        await self._seed_event_types()
        await self._seed_instances_and_events()
        return self.stats

    async def _init_progress(self) -> None:
        object_total = self._count_objects()
        type_total = self._count_types()
        leaf_object_total = self._count_leaf_objects()
        property_type_total = type_total * 8
        object_properties_total = object_total * 4
        root_instances_total = len(ROOT_SPECS) * self.config.instances_per_root_object
        instance_properties_total = object_total * 4 * self.config.instances_per_root_object
        event_type_total = len(EVENT_TYPES)
        event_links_total = sum(len(self._event_specs_for_type(created.spec)) for created in self._preview_types().values())
        avg_events_per_instance = (self.config.events_per_instance_min + self.config.events_per_instance_max) // 2
        events_total = object_total * self.config.instances_per_root_object * avg_events_per_instance
        replacements_total = max(1, round(leaf_object_total * self.config.instances_per_root_object * self.config.replacement_probability))
        await self.progress.add_phase("types", type_total)
        await self.progress.add_phase("property_types", property_type_total)
        await self.progress.add_phase("objects", object_total)
        await self.progress.add_phase("properties", object_properties_total)
        await self.progress.add_phase("root_instances", root_instances_total)
        await self.progress.add_phase("instance_properties", instance_properties_total)
        await self.progress.add_phase("event_types", event_type_total)
        await self.progress.add_phase("event_links", event_links_total)
        await self.progress.add_phase("events", events_total)
        await self.progress.add_phase("replacements", replacements_total)

    def _preview_types(self) -> dict[str, CreatedType]:
        preview: dict[str, CreatedType] = {}
        fake_ids = itertools.count(1)

        def walk(node: NodeSpec, depth: int, path: str) -> None:
            preview[node.key] = CreatedType(id=next(fake_ids), spec=node, depth=depth, path_label=path)
            for child in node.children:
                walk(child, depth + 1, f"{path} / {child.name}")

        for root in ROOT_SPECS:
            walk(root, 0, root.name)
        return preview

    def _count_types(self) -> int:
        def count(node: NodeSpec) -> int:
            return 1 + sum(count(child) for child in node.children)
        return sum(count(root) for root in ROOT_SPECS)

    def _count_objects(self) -> int:
        def count(node: NodeSpec) -> int:
            total = 1
            for child in node.children:
                total += child.count * count(child)
            return total
        return sum(count(root) for root in ROOT_SPECS)

    def _count_leaf_objects(self) -> int:
        def count(node: NodeSpec) -> int:
            if not node.children:
                return 1
            return sum(child.count * count(child) for child in node.children)
        return sum(count(root) for root in ROOT_SPECS)

    async def _guard_prefix(self) -> None:
        roots = await self.client.get("/data-manip/root-types") or []
        self.existing_roots = [
            item["name"]
            for item in roots
            if isinstance(item, dict) and str(item.get("name", "")).startswith(self.config.prefix)
        ]
        if self.existing_roots:
            raise ApiError(
                f"Prefix '{self.config.prefix}' already exists in root types: {', '.join(self.existing_roots[:5])}"
            )

    async def _seed_types(self) -> None:
        await asyncio.gather(*(self._create_type_root(root_spec) for root_spec in ROOT_SPECS))

    async def _create_type_root(self, root_spec: NodeSpec) -> None:
        type_name = self._type_name(root_spec, 0)
        if self.config.dry_run:
            root_type = CreatedType(
                id=next(self._fake_ids),
                spec=root_spec,
                depth=0,
                path_label=root_spec.name,
            )
        else:
            payload = TypesCreate(name=type_name, parent_id=None).model_dump()
            await self.client.post("/types/", payload)
            created = self._find_exact(
                await self.client.get("/types/", {"name": type_name}),
                lambda item: item["name"] == type_name and item["parent_id"] is None,
            )
            if created is None:
                raise ApiError(f"Cannot resolve created root type '{type_name}'")
            root_type = CreatedType(
                id=created["id"],
                spec=root_spec,
                depth=0,
                path_label=root_spec.name,
            )
        self.type_by_key[root_spec.key] = root_type
        self.stats.types += 1
        await self.progress.advance("types")
        await self._create_type_children(root_spec, root_type.id, 1, root_spec.name)

    async def _create_type_children(self, parent_spec: NodeSpec, parent_id: int, depth: int, parent_path: str) -> None:
        if not parent_spec.children:
            return

        pending = [(child, f"{parent_path} / {child.name}") for child in parent_spec.children]
        if self.config.dry_run:
            resolved = {
                child.key: CreatedType(
                    id=next(self._fake_ids),
                    spec=child,
                    depth=depth,
                    path_label=child_path,
                )
                for child, child_path in pending
            }
        else:
            await asyncio.gather(
                *(
                    self.client.post("/types/", TypesCreate(name=child.name, parent_id=parent_id).model_dump())
                    for child, _ in pending
                )
            )
            raw_children = await self.client.get("/types/", {"parent_id": parent_id}) or []
            resolved = {}
            for child, child_path in pending:
                created = self._find_exact(
                    raw_children,
                    lambda item, child_name=child.name: item["name"] == child_name and item["parent_id"] == parent_id,
                )
                if created is None:
                    raise ApiError(f"Cannot resolve type '{child.name}' under parent {parent_id}")
                resolved[child.key] = CreatedType(
                    id=created["id"],
                    spec=child,
                    depth=depth,
                    path_label=child_path,
                )

        self.stats.types += len(pending)
        await self.progress.advance("types", len(pending))
        for child, _ in pending:
            self.type_by_key[child.key] = resolved[child.key]
        await asyncio.gather(
            *(
                self._create_type_children(child, resolved[child.key].id, depth + 1, resolved[child.key].path_label)
                for child, _ in pending
            )
        )

    async def _seed_property_types(self) -> None:
        await asyncio.gather(*(self._create_property_types(type_key, created_type) for type_key, created_type in self.type_by_key.items()))

    async def _create_property_types(self, type_key: str, created_type: CreatedType) -> None:
        templates = self._property_templates(created_type.spec)
        if self.config.dry_run:
            static_entries = [(template.name, next(self._fake_ids)) for template in templates if template.is_static]
            dynamic_entries = [(template.name, next(self._fake_ids)) for template in templates if not template.is_static]
        else:
            await asyncio.gather(
                *(
                    self.client.post(
                        "/property_types/",
                        PropertyTypesCreate(
                            type_id=created_type.id,
                            name=template.name,
                            is_static=template.is_static,
                        ).model_dump(),
                    )
                    for template in templates
                )
            )
            existing = await self.client.get("/property_types/", {"type_id": created_type.id}) or []
            static_entries = []
            dynamic_entries = []
            for template in templates:
                created = self._find_exact(
                    existing,
                    lambda item, tpl=template: (
                        item["type_id"] == created_type.id
                        and item["name"] == tpl.name
                        and item["is_static"] is tpl.is_static
                    ),
                )
                if created is None:
                    raise ApiError(f"Cannot resolve property type '{template.name}' for '{created_type.path_label}'")
                target = static_entries if template.is_static else dynamic_entries
                target.append((template.name, created["id"]))
        self.property_type_ids[(type_key, True)] = static_entries
        self.property_type_ids[(type_key, False)] = dynamic_entries
        self.stats.property_types += len(templates)
        await self.progress.advance("property_types", len(templates))

    async def _seed_objects(self) -> None:
        created_ids = await asyncio.gather(*(self._create_object_root(root_spec) for root_spec in ROOT_SPECS))
        self.root_object_ids.extend(created_ids)

    async def _create_object_root(self, root_spec: NodeSpec) -> int:
        path_code = root_spec.key.split(".")[0]
        object_name = self._object_name(root_spec.name, path_code, 1)
        type_id = self.type_by_key[root_spec.key].id
        if self.config.dry_run:
            object_id = next(self._fake_ids)
            object_root_id = object_id
        else:
            await self.client.post("/objects/", ObjectsCreate(name=object_name, type_id=type_id, parent_id=None).model_dump())
            created = self._find_exact(
                await self.client.get("/objects/", {"name": object_name}),
                lambda item: item["name"] == object_name and item["parent_id"] is None,
            )
            if created is None:
                raise ApiError(f"Cannot resolve created root object '{object_name}'")
            object_id = created["id"]
            object_root_id = created["root_id"]
        self.objects_by_id[object_id] = CreatedObject(
            id=object_id,
            type_key=root_spec.key,
            type_id=type_id,
            name=object_name,
            parent_id=None,
            root_id=object_root_id,
            depth=0,
            path_code=path_code,
        )
        self.stats.objects += 1
        await self.progress.advance("objects")
        await self._create_object_children(root_spec, object_id, object_root_id, path_code, 1)
        return object_id

    async def _create_object_children(
        self,
        parent_spec: NodeSpec,
        parent_object_id: int,
        root_id: int,
        parent_path_code: str,
        depth: int,
    ) -> None:
        if not parent_spec.children:
            return
        pending: list[tuple[NodeSpec, str, str]] = []
        child_index = 1
        for child_spec in parent_spec.children:
            for count_index in range(1, child_spec.count + 1):
                child_path = f"{parent_path_code}.{child_index}"
                object_name = self._object_name(child_spec.name, child_path, count_index)
                pending.append((child_spec, child_path, object_name))
                child_index += 1

        if self.config.dry_run:
            created_map = {
                object_name: {
                    "id": next(self._fake_ids),
                    "root_id": root_id,
                    "name": object_name,
                    "parent_id": parent_object_id,
                }
                for _, _, object_name in pending
            }
        else:
            await asyncio.gather(
                *(
                    self.client.post(
                        "/objects/",
                        ObjectsCreate(
                            name=object_name,
                            type_id=self.type_by_key[child_spec.key].id,
                            parent_id=parent_object_id,
                        ).model_dump(),
                    )
                    for child_spec, _, object_name in pending
                )
            )
            raw_children = await self.client.get("/objects/", {"parent_id": parent_object_id}) or []
            created_map = {item["name"]: item for item in raw_children if item["parent_id"] == parent_object_id}

        self.stats.objects += len(pending)
        await self.progress.advance("objects", len(pending))
        for child_spec, child_path, object_name in pending:
            created = created_map.get(object_name)
            if created is None:
                raise ApiError(f"Cannot resolve object '{object_name}' under parent {parent_object_id}")
            self.objects_by_id[created["id"]] = CreatedObject(
                id=created["id"],
                type_key=child_spec.key,
                type_id=self.type_by_key[child_spec.key].id,
                name=object_name,
                parent_id=parent_object_id,
                root_id=root_id,
                depth=depth,
                path_code=child_path,
            )

        await asyncio.gather(
            *(
                self._create_object_children(
                    child_spec,
                    created_map[object_name]["id"],
                    root_id,
                    child_path,
                    depth + 1,
                )
                for child_spec, child_path, object_name in pending
            )
        )

    async def _seed_object_properties(self) -> None:
        total = 0
        coroutines = []
        for created_object in self.objects_by_id.values():
            for property_name, property_type_id in self.property_type_ids[(created_object.type_key, True)]:
                total += 1
                if not self.config.dry_run:
                    coroutines.append(
                        self.client.post(
                            "/properties/",
                            PropertiesCreate(
                                property_id=property_type_id,
                                value=self._object_property_value(created_object, property_name),
                                object_id=created_object.id,
                            ).model_dump(),
                        )
                    )
        if coroutines:
            await asyncio.gather(*coroutines)
        self.stats.object_properties += total
        await self.progress.advance("properties", total)

    async def _seed_event_types(self) -> None:
        if self.config.dry_run:
            for spec in EVENT_TYPES:
                self.event_type_ids[spec.key] = next(self._fake_ids)
        else:
            created = await asyncio.gather(
                *(
                    self.client.post("/event_types/", EventTypesCreate(name=f"{self.config.prefix} :: {spec.name}").model_dump())
                    for spec in EVENT_TYPES
                )
            )
            for spec, item in zip(EVENT_TYPES, created, strict=True):
                self.event_type_ids[spec.key] = item["id"]
        self.stats.event_types += len(EVENT_TYPES)
        await self.progress.advance("event_types", len(EVENT_TYPES))

        link_coroutines = []
        for created_type in self.type_by_key.values():
            event_specs = self._event_specs_for_type(created_type.spec)
            for event_type_spec in event_specs:
                if not self.config.dry_run:
                    link_coroutines.append(
                        self.client.post(
                            "/event_types_types/",
                            EventTypesTypesCreate(
                                event_type_id=self.event_type_ids[event_type_spec.key],
                                type_id=created_type.id,
                            ).model_dump(),
                        )
                    )
            self.stats.event_links += len(event_specs)
        if link_coroutines:
            await asyncio.gather(*link_coroutines)
        await self.progress.advance("event_links", self.stats.event_links)

    async def _seed_instances_and_events(self) -> None:
        if self.config.dry_run:
            self.stats.root_instances += len(self.root_object_ids) * self.config.instances_per_root_object
            await self.progress.advance("root_instances", len(self.root_object_ids) * self.config.instances_per_root_object)
            return
        await asyncio.gather(*(self._seed_root_object_instances(root_object_id) for root_object_id in self.root_object_ids))

    async def _seed_root_object_instances(self, root_object_id: int) -> None:
        for instance_ordinal in range(1, self.config.instances_per_root_object + 1):
            root_instance = await self.client.post(f"/objects/{root_object_id}/instance", None)
            self.stats.root_instances += 1
            await self.progress.advance("root_instances")
            instances = await self._load_root_instances(root_instance["id"])
            self.stats.instances_total += len(instances)
            await asyncio.gather(*(self._seed_instance_properties(instance) for instance in instances))
            await self._seed_events_for_tree(instances, instance_ordinal)

    async def _load_root_instances(self, root_instance_id: int) -> list[CreatedInstance]:
        raw_instances = await self.client.get("/instances/", {"root_id": root_instance_id}) or []
        instances = [
            CreatedInstance(
                id=item["id"],
                object_id=item["object_id"],
                parent_id=item["parent_id"],
                root_id=item["root_id"],
                is_active=item["is_active"],
            )
            for item in raw_instances
        ]
        return sorted(instances, key=lambda item: (item.parent_id or 0, item.id))

    async def _seed_instance_properties(self, instance: CreatedInstance) -> None:
        created_object = self.objects_by_id[instance.object_id]
        coroutines = []
        total = 0
        for property_name, property_type_id in self.property_type_ids[(created_object.type_key, False)]:
            total += 1
            if not self.config.dry_run:
                coroutines.append(
                    self.client.post(
                        "/instanceproperties/",
                        InstancePropertiesCreate(
                            value=self._instance_property_value(instance, created_object, property_name),
                            instance_id=instance.id,
                            property_type_id=property_type_id,
                        ).model_dump(),
                    )
                )
        if coroutines:
            await asyncio.gather(*coroutines)
        self.stats.instance_properties += total
        await self.progress.advance("instance_properties", total)

    async def _seed_events_for_tree(self, instances: list[CreatedInstance], instance_ordinal: int) -> None:
        children_by_parent: dict[int, list[int]] = {}
        for instance in instances:
            if instance.parent_id is not None:
                children_by_parent.setdefault(instance.parent_id, []).append(instance.id)

        active_by_id = {instance.id: instance for instance in instances}
        for sequence_index, instance in enumerate(instances, start=1):
            current = active_by_id[instance.id]
            created_object = self.objects_by_id[current.object_id]
            event_specs = self._event_specs_for_type(self.type_by_key[created_object.type_key].spec)
            replacement_specs = [spec for spec in event_specs if spec.replacement]
            regular_specs = [spec for spec in event_specs if not spec.replacement]
            total_events = self.rng.randint(self.config.events_per_instance_min, self.config.events_per_instance_max)
            is_leaf = current.id not in children_by_parent
            replacement_turn = None
            if is_leaf and replacement_specs and self.rng.random() < self.config.replacement_probability:
                replacement_turn = self.rng.randint(2, total_events)

            for event_index in range(1, total_events + 1):
                if replacement_turn == event_index:
                    replacement_spec = self.rng.choice(replacement_specs)
                    event_id = await self._create_event(current, replacement_spec, sequence_index, event_index, instance_ordinal)
                    replacement_instance = await self._create_replacement_instance(current, created_object)
                    await self._seed_instance_properties(replacement_instance)
                    await self.client.post(
                        "/replacements/",
                        ReplacementsCreate(
                            event_id=event_id,
                            new_instance_id=replacement_instance.id,
                        ).model_dump(),
                    )
                    self.stats.replacements += 1
                    await self.progress.advance("replacements")
                    active_by_id[current.id] = replacement_instance
                    current = replacement_instance
                    continue
                chosen = self.rng.choice(regular_specs or event_specs)
                await self._create_event(current, chosen, sequence_index, event_index, instance_ordinal)

    async def _create_replacement_instance(self, current: CreatedInstance, created_object: CreatedObject) -> CreatedInstance:
        new_instance = await self.client.post(
            "/instances/",
            InstancesCreate(
                name=f"{created_object.name} :: replacement",
                object_id=current.object_id,
                parent_id=current.parent_id,
                is_active=False,
            ).model_dump(),
        )
        self.stats.instances_total += 1
        return CreatedInstance(
            id=new_instance["id"],
            object_id=new_instance["object_id"],
            parent_id=new_instance["parent_id"],
            root_id=new_instance["root_id"],
            is_active=new_instance["is_active"],
        )

    async def _create_event(
        self,
        instance: CreatedInstance,
        spec: EventTypeSpec,
        sequence_index: int,
        event_index: int,
        instance_ordinal: int,
    ) -> int:
        timestamp = (
            datetime.now(UTC)
            - timedelta(days=(sequence_index % 23), hours=event_index, minutes=instance_ordinal)
        )
        response = await self.client.post(
            "/events/",
            EventsCreate(
                event_type_id=self.event_type_ids[spec.key],
                instance_id=instance.id,
                timestamp=timestamp,
                info={
                    "seed_prefix": self.config.prefix,
                    "event_key": spec.key,
                    "sequence": sequence_index,
                    "event_index": event_index,
                    "tree_instance_ordinal": instance_ordinal,
                },
            ).model_dump(),
        )
        self.stats.events += 1
        await self.progress.advance("events")
        return response["id"]

    def _property_templates(self, spec: NodeSpec) -> list[PropertyTemplate]:
        static_specific = self._pick_names(
            spec.tags,
            {
                "power": "rated_power_kw",
                "network": "bandwidth_class",
                "storage": "capacity_class",
                "sensor": "measurement_class",
                "cooling": "thermal_class",
                "mechanical": "mounting_class",
                "compute": "performance_class",
                "software": "firmware_family",
                "relay": "switching_class",
                "control": "control_profile",
                "electrical": "voltage_class",
            },
            default="application_class",
        )
        dynamic_specific = self._pick_names(
            spec.tags,
            {
                "power": "load_pct",
                "network": "packet_error_rate",
                "storage": "wear_pct",
                "sensor": "calibration_state",
                "cooling": "temperature_c",
                "mechanical": "vibration_mm_s",
                "compute": "utilization_pct",
                "software": "firmware_version",
                "relay": "switch_cycles",
                "control": "control_mode",
                "electrical": "current_a",
            },
            default="state_code",
        )
        static_names = ["manufacturer", "series", "revision", static_specific]
        dynamic_names = ["inventory_code", "installation_zone", "operating_hours", dynamic_specific]
        return [PropertyTemplate(name=name, is_static=True) for name in static_names] + [
            PropertyTemplate(name=name, is_static=False) for name in dynamic_names
        ]

    def _pick_names(self, tags: tuple[str, ...], mapping: dict[str, str], default: str) -> str:
        for tag in tags:
            if tag in mapping:
                return mapping[tag]
        return default

    def _object_property_value(self, created_object: CreatedObject, property_name: str) -> str:
        if property_name == "manufacturer":
            return self._pick_names(
                self.type_by_key[created_object.type_key].spec.tags,
                {
                    "compute": "Vector Systems",
                    "control": "Astra Control",
                    "power": "Energo Stack",
                    "network": "WireForge",
                    "mechanical": "PromMash",
                    "sensor": "SensoLab",
                },
                "ComponentDB Seed Works",
            )
        if property_name == "series":
            return f"{created_object.type_key.split('.')[-1].upper()}-{created_object.depth + 1:02d}"
        if property_name == "revision":
            return f"rev-{(len(created_object.path_code) % 5) + 1}"
        if property_name.endswith("_class") or property_name.endswith("_profile") or property_name.endswith("_family"):
            return f"{property_name}:{created_object.depth + 2}"
        return f"{property_name}:{created_object.path_code}"

    def _instance_property_value(self, instance: CreatedInstance, created_object: CreatedObject, property_name: str) -> str:
        if property_name == "inventory_code":
            return f"{self.config.prefix}-{instance.root_id}-{instance.id}"
        if property_name == "installation_zone":
            return f"zone-{(instance.id % 7) + 1}"
        if property_name == "operating_hours":
            return str(500 + (instance.id % 25000))
        if property_name == "load_pct":
            return f"{35 + (instance.id % 60)}"
        if property_name == "packet_error_rate":
            return f"0.{instance.id % 50:02d}"
        if property_name == "wear_pct":
            return f"{5 + (instance.id % 70)}"
        if property_name == "calibration_state":
            return "valid" if instance.id % 5 else "requires_check"
        if property_name == "temperature_c":
            return f"{22 + (instance.id % 38)}"
        if property_name == "vibration_mm_s":
            return f"{1 + (instance.id % 12)}"
        if property_name == "utilization_pct":
            return f"{20 + (instance.id % 75)}"
        if property_name == "firmware_version":
            return f"fw-{created_object.depth + 1}.{instance.id % 9}.{instance.id % 13}"
        if property_name == "switch_cycles":
            return str(1000 + instance.id % 90000)
        if property_name == "control_mode":
            return ("auto", "manual", "reserve")[instance.id % 3]
        if property_name == "current_a":
            return f"{3 + (instance.id % 25)}"
        return f"state-{instance.id}"

    def _event_specs_for_type(self, spec: NodeSpec) -> list[EventTypeSpec]:
        result: list[EventTypeSpec] = []
        tag_set = set(spec.tags)
        for event_type_spec in EVENT_TYPES:
            event_tags = set(event_type_spec.tags)
            if "all" in event_tags or tag_set.intersection(event_tags):
                result.append(event_type_spec)
        return result

    def _type_name(self, spec: NodeSpec, depth: int) -> str:
        if depth == 0:
            return f"{self.config.prefix} :: {spec.name}"
        return spec.name

    def _object_name(self, name: str, path_code: str, ordinal: int) -> str:
        return f"{self.config.prefix} :: {name} [{path_code}.{ordinal}]"

    @staticmethod
    def _find_exact(items: list[dict] | None, predicate) -> dict | None:
        if not items:
            return None
        for item in items:
            if predicate(item):
                return item
        return None

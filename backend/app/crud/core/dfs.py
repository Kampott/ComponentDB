from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update as sa_update


async def recalculate_tree(session: AsyncSession, model, root_id: int) -> None:
    result = await session.execute(
        select(model).where(
            (model.root_id == root_id) | (model.id == root_id)
        )
    )
    nodes = result.scalars().all()

    if not nodes:
        return

    node_by_id = {n.id: n for n in nodes}
    children_map: dict[int, list] = {n.id: [] for n in nodes}

    for node in nodes:
        if node.parent_id is not None and node.parent_id in children_map:
            children_map[node.parent_id].append(node)


    timer = 0
    size_map: dict[int, int] = {}

    stack = [(root_id, False)]
    while stack:
        node_id, visited = stack.pop()
        node = node_by_id.get(node_id)
        if node is None:
            continue

        if not visited:
            node.tin = timer
            timer += 1
            stack.append((node_id, True))
            for child in reversed(children_map.get(node_id, [])):
                stack.append((child.id, False))
        else:
            node.tout = timer
            timer += 1
            node.tree_size = 1 + sum(
                size_map.get(c.id, 1) for c in children_map.get(node_id, [])
            )
            size_map[node_id] = node.tree_size

    await session.flush()
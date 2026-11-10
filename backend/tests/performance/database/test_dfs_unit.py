import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.core.dfs import recalculate_tree
from app.models.core import Types


@pytest_asyncio.fixture(autouse=True)
async def _savepoint(db_session: AsyncSession):
    await db_session.execute(text("SAVEPOINT dfs_test"))
    yield
    await db_session.execute(text("ROLLBACK TO SAVEPOINT dfs_test"))


@pytest.mark.asyncio
async def test_recalculate_single_root(db_session: AsyncSession):
    t = Types(name="root", parent_id=None, root_id=None, tin=0, tout=0, tree_size=0)
    db_session.add(t)
    await db_session.flush()
    t.root_id = t.id
    await db_session.flush()

    await recalculate_tree(db_session, Types, t.id)
    assert t.tin == 0
    assert t.tout == 1
    assert t.tree_size == 1


@pytest.mark.asyncio
async def test_recalculate_chain(db_session: AsyncSession):
    parent = Types(name="parent", parent_id=None, root_id=None, tin=0, tout=0, tree_size=0)
    db_session.add(parent)
    await db_session.flush()
    parent.root_id = parent.id
    await db_session.flush()

    child = Types(name="child", parent_id=parent.id, root_id=parent.id, tin=0, tout=0, tree_size=0)
    db_session.add(child)
    await db_session.flush()

    grandchild = Types(name="grandchild", parent_id=child.id, root_id=parent.id, tin=0, tout=0, tree_size=0)
    db_session.add(grandchild)
    await db_session.flush()

    await recalculate_tree(db_session, Types, parent.id)

    assert parent.tin < child.tin < grandchild.tin
    assert grandchild.tout < child.tout < parent.tout
    assert parent.tree_size == 3
    assert child.tree_size == 2
    assert grandchild.tree_size == 1


@pytest.mark.asyncio
async def test_recalculate_wide_tree(db_session: AsyncSession):
    root = Types(name="root", parent_id=None, root_id=None, tin=0, tout=0, tree_size=0)
    db_session.add(root)
    await db_session.flush()
    root.root_id = root.id
    root_id = root.id
    await db_session.flush()

    children = []
    for i in range(5):
        c = Types(name=f"child{i}", parent_id=root_id, root_id=root_id, tin=0, tout=0, tree_size=0)
        db_session.add(c)
        await db_session.flush()
        children.append(c)

    await recalculate_tree(db_session, Types, root_id)

    assert root.tin == 0
    assert root.tree_size == 6
    for c in children:
        assert c.tout == c.tin + 1
        assert c.tree_size == 1


@pytest.mark.asyncio
async def test_recalculate_after_insert(db_session: AsyncSession):
    root = Types(name="root", parent_id=None, root_id=None, tin=0, tout=0, tree_size=0)
    db_session.add(root)
    await db_session.flush()
    root.root_id = root.id
    root_id = root.id
    await db_session.flush()

    await recalculate_tree(db_session, Types, root_id)
    assert root.tree_size == 1
    tout_before = root.tout

    child = Types(name="child", parent_id=root_id, root_id=root_id, tin=0, tout=0, tree_size=0)
    db_session.add(child)
    await db_session.flush()

    await recalculate_tree(db_session, Types, root_id)
    assert root.tree_size == 2
    assert root.tout > tout_before


@pytest.mark.asyncio
async def test_recalculate_empty_tree(db_session: AsyncSession):
    await recalculate_tree(db_session, Types, 99999)

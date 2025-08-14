import {useEffect, useState} from 'react';

import {useStore} from "../../../store/Zustand.ts";
import FileSystemTreeView, {type DataNode} from "../../Common/FileSystemTreeView.tsx";
import type {Object} from "../../../schemas/Object.ts";
import Button from "react-bootstrap/Button";

interface Props {
    objectId: number
}

function ObjectTreeView({objectId}: Props) {
    const services = useStore((state) => state.services)

    const [objectTree, setObjectTree] = useState<DataNode<Object>[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())
    const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())

    async function loadObjectTree() {
        await services.objectService.getObjectsByParentId(objectId)
    }

    useEffect(() => {
        loadObjectTree()
            .then(() => setLoading(false))
    }, []);

    async function onToggle(id: number): Promise<void> {
        setOpenIds((prev: Set<number>): Set<number> => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next;
        })
    }

    async function onRequestChildren(id: number): Promise<DataNode<Object>[]> {
        setLoadingIds((prev) => new Set(prev).add(id))

        const children: Object[] = await services.objectService.getObjectsByParentId(id)

        return children.map((element: Object) => {
            return {
                id: element.id,
                data: element,
                hasChildren: false,
                children: null,
            } as DataNode<Object>
        })
    }

    function onChildrenLoaded(id: number, children: DataNode<Object>[]) {
        const attachChildren = (nodes: DataNode<Object>[]): DataNode<Object>[] => {
            return nodes.map((n) => {
                if (n.id === id) {
                    return {...n, children, childrenLoaded: true}
                }
                if (n.children) {
                    return {...n, children: attachChildren(n.children)}
                }
                return n
            })
        }

        setObjectTree((prev) => attachChildren(prev));
        setLoadingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    function renderItem(node: DataNode<Object>, meta: { isOpen: boolean; depth: number; toggle: () => void }) {
        return (
            <div className="cursor-pointer" onClick={meta.toggle} role="button">
                <span className="font-medium">ID: {node.data.id}</span>
            </div>
        )
    }

    return (
        <>
            <Button variant="primary" className="mt-4">Добавить объект</Button>
            {loading ? <p>Загрузка...</p> : <FileSystemTreeView
                data={objectTree}
                openIds={openIds}
                onToggle={onToggle}
                renderItem={renderItem}
                onRequestChildren={onRequestChildren}
                onChildrenLoaded={onChildrenLoaded}
                loadingIds={loadingIds}
            />}
        </>
    )
}

export default ObjectTreeView

import {useEffect, useState} from 'react';

import Button from "react-bootstrap/Button";

import {useStore} from "../../../store/Zustand.ts";
import FileSystemTreeView, {type DataNode} from "../../Common/FileSystemTreeView.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {ObjectType} from "../../../schemas/ObjectType.ts";

interface Props {
    objectType: ObjectType;
}

function TypeTreeView({objectType}: Props) {
    const services = useStore((state) => state.services)

    const [typeTree, setTypeTree] = useState<DataNode<ObjectType>[] | null>(null);

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())
    const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())

    async function loadObjectTypeChildren(id: number): Promise<DataNode<ObjectType>[]> {
        setLoadingIds((prev) => new Set(prev).add(id))

        const children: ObjectType[] = await services.objectsTypesService.getTypesByParentId(id)

        return children.map((element: ObjectType) => {
            return {
                id: element.id,
                data: element,
                hasChildren: false,
                children: null,
            } as DataNode<ObjectType>
        })
    }

    useEffect(() => {
        setTypeTree(null);
        loadObjectTypeChildren(objectType.id)
            .then((data) => setTypeTree(data));
    }, [objectType]);

    async function onObjectChildrenToggle(id: number): Promise<void> {
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

    function onObjectChildrenLoaded(id: number, children: DataNode<ObjectType>[]) {
        const attachChildren = (nodes: DataNode<ObjectType>[]): DataNode<ObjectType>[] => {
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

        setTypeTree((prev) => prev && attachChildren(prev));
        setLoadingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    function renderItem(node: DataNode<ObjectType>, meta: { isOpen: boolean; depth: number; toggle: () => void }) {
        return (
            <div className="cursor-pointer" onClick={meta.toggle} role="button">
                <span className="font-medium">{node.data.name}</span>
            </div>
        )
    }

    return (
        <>
            <Button variant="primary" className="mt-4">Добавить тип</Button>
            <LoadEffect data={typeTree} contentSize={{height: "20px", width: "100%"}}>
                <FileSystemTreeView
                    data={typeTree ? typeTree : []}
                    openIds={openIds}
                    onToggle={onObjectChildrenToggle}
                    renderItem={renderItem}
                    onRequestChildren={loadObjectTypeChildren}
                    onChildrenLoaded={onObjectChildrenLoaded}
                    loadingIds={loadingIds}
                />
            </LoadEffect>
        </>
    )
}

export default TypeTreeView

import {useEffect, useState} from 'react';
import {useNavigate} from "react-router-dom";

import {useServicesStore} from "../../../stores/Zustand.ts";
import FileSystemTreeView, {type DataNode} from "../../Common/FileSystemTreeView.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import {toString} from "../../../utility/to_string.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";

interface Props {
    instance: ObjectInstance;
}

function InstanceTreeView({instance}: Props) {
    const navigate = useNavigate();

    const services = useServicesStore((state) => state.services)

    const [instanceTree, setInstanceTree] = useState<DataNode<ObjectInstance>[] | null>(null);

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())
    const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())

    async function loadInstanceChildren(id: number): Promise<DataNode<ObjectInstance>[]> {
        setLoadingIds((prev) => new Set(prev).add(id))

        try {
            const children: ObjectInstance[] = await services.objectsInstancesService.getInstancesByParentId(id)

            return children.map((element: ObjectInstance) => {
                return {
                    id: element.id,
                    data: element,
                    children: null,
                } as DataNode<ObjectInstance>
            })
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: (m) => alert(m)
            });
            return [];
        }
    }

    useEffect(() => {
        setInstanceTree(null)
        loadInstanceChildren(instance.id)
            .then((data) => setInstanceTree(data))
    }, [instance]);

    async function onInstanceChildrenToggle(id: number): Promise<void> {
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

    function onInstanceChildrenLoaded(id: number, children: DataNode<ObjectInstance>[]) {
        const attachChildren = (nodes: DataNode<ObjectInstance>[]): DataNode<ObjectInstance>[] => {
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

        setInstanceTree((prev) => prev && attachChildren(prev));
        setLoadingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
    }

    function onInstanceChildrenClick(id: number) {
        navigate(`/instances/${id}`);
    }

    function renderItem(node: DataNode<ObjectInstance>) {
        return (
            <span
                onClick={() => onInstanceChildrenClick(node.id)}
                className="ms-2 text-primary"
                role="button"
                style={{cursor: 'pointer'}}
            >{toString(node.data)}</span>
        )
    }

    return (
        <>
            <LoadEffect data={instanceTree} contentSize={{height: "20px", width: "100%"}}>
                <FileSystemTreeView
                    data={instanceTree ? instanceTree : []}
                    openIds={openIds}
                    onToggle={onInstanceChildrenToggle}
                    renderItem={renderItem}
                    onRequestChildren={loadInstanceChildren}
                    onChildrenLoaded={onInstanceChildrenLoaded}
                    loadingIds={loadingIds}
                />
            </LoadEffect>
        </>
    )
}

export default InstanceTreeView

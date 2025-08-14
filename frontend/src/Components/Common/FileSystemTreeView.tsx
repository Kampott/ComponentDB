import React, {useState} from "react";

export type DataNode<T> = {
    id: number
    data: T
    children?: DataNode<T>[] | null
    hasChildren?: boolean
    childrenLoaded?: boolean
}

export interface Props<T> {
    data: DataNode<T>[]
    openIds: Set<number>
    onToggle: (id: number) => void

    renderItem: (
        node: DataNode<T>,
        meta: { isOpen: boolean; depth: number; toggle: () => void }
    ) => React.ReactNode;

    onRequestChildren?: (id: number) => Promise<DataNode<T>[]>;
    onChildrenLoaded?: (id: number, children: DataNode<T>[]) => void;

    loadingIds?: Set<number>;
}

function FileSystemTreeView<T>(
    {
        data,
        openIds,
        onToggle,
        renderItem,
        onRequestChildren,
        onChildrenLoaded,
        loadingIds,
    }: Props<T>) {
    const [internalLoading, setInternalLoading] = useState<Set<number>>(new Set());

    function isLoading(id: number): boolean {
        if (loadingIds) {
            return loadingIds.has(id);
        }
        return internalLoading.has(id);
    }

    async function handleToggle(node: DataNode<T>) {
        onToggle(node.id)

        const willOpen = !openIds.has(node.id)
        if (willOpen && node.hasChildren && node.children === undefined && onRequestChildren && onChildrenLoaded) {
            if (!loadingIds) {
                setInternalLoading((prev) => prev.add(node.id))
            }

            try {
                const children = await onRequestChildren(node.id)
                onChildrenLoaded(node.id, children)
            } catch (e) {
                console.error("Failed to load children for", node.id, e)
            } finally {
                if (!loadingIds) setInternalLoading((prev) => {
                    const next = new Set(prev);
                    next.delete(node.id);
                    return next;
                })
            }
        }
    }

    async function renderNodes (nodes: DataNode<T>[], depth = 0) {
        return (
            <div>
                {nodes.map((node) => {
                    const isOpen = openIds.has(node.id)
                    const loading = isLoading(node.id)

                    return (
                        <div key={node.id} className="py-1">
                            <div className="flex items-center">
                                <button
                                    onClick={() => handleToggle(node)}
                                    className="w-6 h-6 inline-flex items-center justify-center"
                                    aria-label={isOpen ? "collapse" : "expand"}
                                >
                                    {node.hasChildren ? (isOpen ? "▾" : "▸") : ""}
                                </button>

                                <div className="ml-2 flex-1">
                                    {renderItem(node, {isOpen, depth, toggle: () => handleToggle(node)})}
                                </div>

                                {loading && <div className="ml-2 text-sm italic">loading...</div>}
                            </div>

                            {isOpen && node.children && node.children.length > 0 && (
                                <div className="ml-6">{renderNodes(node.children, depth + 1)}</div>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return <div>{renderNodes(data)}</div>;
}

export default FileSystemTreeView;
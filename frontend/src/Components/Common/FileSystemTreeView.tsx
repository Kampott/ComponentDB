import React from "react";

import ListGroup from "react-bootstrap/ListGroup";

export type DataNode<T> = {
    id: number
    data: T
    children: DataNode<T>[] | null
    childrenLoaded?: boolean
}

export interface Props<T> {
    data: DataNode<T>[]
    openIds: Set<number>
    onToggle: (id: number) => void

    renderItem: (node: DataNode<T>) => React.ReactNode;

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
    }: Props<T>) {
    async function handleToggle(node: DataNode<T>) {
        onToggle(node.id)

        const willOpen = !openIds.has(node.id)
        if (willOpen && node.children === null && onRequestChildren && onChildrenLoaded) {
            try {
                const children = await onRequestChildren(node.id)
                onChildrenLoaded(node.id, children)
            } catch (e) {
                console.error("Failed to load children for", node.id, e)
            }
        }
    }

    function renderNodes (nodes: DataNode<T>[], depth = 0) {
        return (
            <ListGroup variant="flush">
                {nodes.map((node) => {
                    const isOpen = openIds.has(node.id);

                    return (
                        <React.Fragment key={node.id}>
                            <ListGroup.Item className="d-flex align-items-center pb-3 pt-3">
                                <div
                                    onClick={() => handleToggle(node)}
                                    style={{ cursor: 'pointer', width: '20px' }}
                                >
                                    {isOpen ? "▾" : "▸"}
                                </div>

                                {renderItem(node)}
                            </ListGroup.Item>

                            {isOpen && node.children && node.children.length > 0 && (
                                <div className="ms-4">
                                    {renderNodes(node.children, depth + 1)}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </ListGroup>

        )
    }

    return <div>{renderNodes(data)}</div>;
}

export default FileSystemTreeView;
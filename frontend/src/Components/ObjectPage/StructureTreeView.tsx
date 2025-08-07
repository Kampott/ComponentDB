import React, {useState} from "react";
import ListGroup from "react-bootstrap/ListGroup";

export interface TmpData {
    name: string;
    children: TmpData[];
}

export interface Props {
    data: TmpData[]
}

function StructureTreeView({data}: Props) {
    const [openNodes, setOpenNodes] = useState(new Set());

    const toggleNode = (name: string) => {
        setOpenNodes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(name)) {
                newSet.delete(name);
            } else {
                newSet.add(name);
            }
            return newSet;
        });
    };

    const renderTree = (items: TmpData[]) => (
        <ListGroup variant="flush">
            {items?.map((item, idx) => {
                const key = `${item.name}-${idx}`

                const isOpen = openNodes.has(item.name);

                return (
                    <React.Fragment key={key}>
                        <ListGroup.Item className="d-flex align-items-center pb-3 pt-3">
                            <div
                                onClick={() => toggleNode(item.name)}
                                style={{ cursor: 'pointer', width: '20px' }}
                            >
                                {isOpen ? '▾' : '▸'}
                            </div>
                            <span
                                onClick={() => console.log('Переход к объекту:', item.name)}
                                className="ms-2 text-primary"
                                role="button"
                                style={{cursor: 'pointer'}}
                            >
                                {item.name}
                            </span>
                        </ListGroup.Item>

                        {isOpen && (
                            <div className="ms-4">
                                {renderTree(item.children)}
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </ListGroup>
    );

    return renderTree(data);
}

export default StructureTreeView;
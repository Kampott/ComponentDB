import type {ReactNode} from "react";

import Placeholder from "react-bootstrap/Placeholder";

type ContentSize = {
    width: string,
    height: string
}

interface Props<T> {
    data: T | null
    children: ReactNode
    contentSize: ContentSize
}

function LoadEffect<T>({data, children, contentSize}: Props<T>) {
    return (
        <>
            {data == null ? (
                <Placeholder as="div" animation="glow">
                    <Placeholder xs={12} style={{height: contentSize.height, width: contentSize.width, borderRadius: "4px"}}/>
                </Placeholder>
            ) : (
                children
            )}
        </>
    );
}

export default LoadEffect

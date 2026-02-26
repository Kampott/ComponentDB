import type { ReactNode } from 'react'

import { Skeleton } from '@Components/ui/skeleton'

type ContentSize = {
    width: string
    height: string
}

interface Props<T> {
    data: T | null
    children: ReactNode
    contentSize: ContentSize
}

function LoadEffect<T>({ data, children, contentSize }: Props<T>) {
    return (
        <>
            {data == null ? (
                <Skeleton
                    style={{
                        height: contentSize.height,
                        width: contentSize.width,
                        borderRadius: '4px',
                    }}
                />
            ) : (
                children
            )}
        </>
    )
}

export default LoadEffect

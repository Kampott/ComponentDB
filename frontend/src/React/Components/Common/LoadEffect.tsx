import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { Skeleton } from '@Components/ui/skeleton'

type ContentSize = {
    width: string
    height: string
}

interface Props<T> {
    data: T | null
    children: ReactNode
    contentSize: ContentSize
    preserveContentOnReload?: boolean
    className?: string
}

function LoadEffect<T>({
    data,
    children,
    contentSize,
    preserveContentOnReload = true,
    className,
}: Props<T>) {
    const [hasResolvedOnce, setHasResolvedOnce] = useState(data != null)

    useEffect(() => {
        if (data != null) {
            setHasResolvedOnce(true)
        }
    }, [data])

    if (data == null && (!preserveContentOnReload || !hasResolvedOnce)) {
        return (
            <Skeleton
                style={{
                    height: contentSize.height,
                    width: contentSize.width,
                    borderRadius: '4px',
                }}
            />
        )
    }

    return (
        <div className={cn('relative', className)} aria-busy={data == null}>
            {children}

            {data == null && (
                <div className='bg-background/70 absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] backdrop-blur-[1px]'>
                    <Skeleton
                        style={{
                            height: contentSize.height,
                            width: contentSize.width,
                            borderRadius: '4px',
                        }}
                    />
                </div>
            )}
        </div>
    )
}

export default LoadEffect

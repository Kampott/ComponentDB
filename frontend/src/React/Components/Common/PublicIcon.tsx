import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils.ts'

interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    src: string
    alt?: string
}

function PublicIcon({ src, alt = '', className, style, ...props }: Props) {
    return (
        <span
            role={alt ? 'img' : undefined}
            aria-label={alt || undefined}
            aria-hidden={alt ? undefined : true}
            className={cn(
                'inline-block size-4 shrink-0 bg-current align-middle',
                className,
            )}
            style={{
                WebkitMaskImage: `url("${src}")`,
                maskImage: `url("${src}")`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                ...style,
            }}
            {...props}
        />
    )
}

export default PublicIcon

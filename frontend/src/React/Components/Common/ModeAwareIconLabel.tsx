import type { ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@Components/ui/tooltip'
import { useUserStore } from '@StorageImpl'

interface Props {
    icon: ReactNode
    label: string
    className?: string
    contentClassName?: string
    withTooltip?: boolean
}

function ModeAwareIconLabel({
    icon,
    label,
    className,
    contentClassName,
    withTooltip = true,
}: Props) {
    const actionDisplayMode = useUserStore(state => state.actionDisplayMode)

    const content = (
        <span
            className={cn(
                'inline-flex items-center justify-center gap-2 leading-none align-middle',
                actionDisplayMode === 'material' ? 'gap-0' : undefined,
                contentClassName,
            )}
        >
            {icon}
            {actionDisplayMode === 'text' ? <span>{label}</span> : null}
        </span>
    )

    if (actionDisplayMode !== 'material' || !withTooltip) {
        return <span className={className}>{content}</span>
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className={cn(
                        'inline-flex rounded-md transition-[background-color,box-shadow,transform] hover:bg-accent/60 hover:shadow-sm',
                        className,
                    )}
                >
                    {content}
                </span>
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>{label}</TooltipContent>
        </Tooltip>
    )
}

export default ModeAwareIconLabel

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { Button } from '@Components/ui/button'
import { useUserStore } from '@StorageImpl'

interface Props extends React.ComponentProps<typeof Button> {
    icon: ReactNode
    label: string
}

function ToolbarActionButton({
    icon,
    label,
    className,
    size,
    children,
    ...props
}: Props) {
    const actionDisplayMode = useUserStore(state => state.actionDisplayMode)

    return (
        <Button
            size={actionDisplayMode === 'material' ? 'icon-sm' : (size ?? 'sm')}
            aria-label={props['aria-label'] ?? label}
            className={cn(
                actionDisplayMode === 'material' ? 'px-0' : undefined,
                className,
            )}
            {...props}
        >
            {icon}
            {actionDisplayMode === 'text' ? <span>{label}</span> : null}
            {children}
        </Button>
    )
}

export default ToolbarActionButton

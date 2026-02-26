import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useContextMenuStore } from '@StorageImpl'

function ContextMenu() {
    const { visible, position, elementData, contextMenuOptions, hideMenu } =
        useContextMenuStore()
    const availableOptions = Object.entries(contextMenuOptions ?? {}).filter(
        ([, action]) => action != null,
    )

    return (
        <DropdownMenu
            open={visible}
            onOpenChange={open => {
                if (!open) {
                    hideMenu()
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <button
                    aria-hidden
                    tabIndex={-1}
                    className='pointer-events-none fixed h-px w-px opacity-0'
                    style={{
                        left: position.x,
                        top: position.y,
                    }}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-44'>
                {availableOptions.map(([option, action]) => (
                    <DropdownMenuItem
                        key={option}
                        onClick={() => {
                            if (action) {
                                ;(action as (entity: unknown) => void)(
                                    elementData,
                                )
                            }
                            hideMenu()
                        }}
                    >
                        {option}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => hideMenu()}>
                    Закрыть
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default ContextMenu

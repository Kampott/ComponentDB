import { X } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@Components/ui/button'
import { useToastStore } from '@StorageImpl'

interface ToastItemProps {
    id: number
    header: string
    message: string
    onClose: (id: number) => void
}

function ToastItem({ id, header, message, onClose }: ToastItemProps) {
    useEffect(() => {
        const timer = window.setTimeout(() => onClose(id), 3000)
        return () => window.clearTimeout(timer)
    }, [id, onClose])

    return (
        <div className='bg-background w-[320px] rounded-lg border p-3 shadow-lg'>
            <div className='mb-1 flex items-start justify-between gap-2'>
                <strong className='text-sm font-semibold'>{header}</strong>
                <Button
                    variant='ghost'
                    size='icon'
                    className='size-6'
                    onClick={() => onClose(id)}
                    aria-label='Закрыть уведомление'
                >
                    <X className='size-4' />
                </Button>
            </div>
            <p className='text-muted-foreground text-sm'>{message}</p>
        </div>
    )
}

function GlobalToaster() {
    const { toasts, removeToast } = useToastStore()

    return (
        <div className='pointer-events-none fixed top-16 right-3 z-50 flex flex-col gap-2'>
            {toasts.map(({ id, header, message }) => (
                <div key={id} className='pointer-events-auto'>
                    <ToastItem
                        id={id}
                        header={header}
                        message={message}
                        onClose={removeToast}
                    />
                </div>
            ))}
        </div>
    )
}

export default GlobalToaster

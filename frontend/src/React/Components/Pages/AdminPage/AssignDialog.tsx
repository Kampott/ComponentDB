import { useState } from 'react'

import { Button } from '@Components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'

interface AssignOption {
    id: number
    label: string
}

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    options: AssignOption[]
    excludeIds: number[]
    onAssign: (id: number) => void
}

function AssignDialog({
    open,
    onOpenChange,
    title,
    options,
    excludeIds,
    onAssign,
}: Props) {
    const [selectedId, setSelectedId] = useState<string>('')

    const availableOptions = options.filter(opt => !excludeIds.includes(opt.id))

    function handleSubmit() {
        const id = Number(selectedId)
        if (!isNaN(id) && id > 0) {
            onAssign(id)
            setSelectedId('')
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className='py-4'>
                    {availableOptions.length > 0 ? (
                        <Select
                            value={selectedId}
                            onValueChange={setSelectedId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Выберите...' />
                            </SelectTrigger>
                            <SelectContent>
                                {availableOptions.map(opt => (
                                    <SelectItem
                                        key={opt.id}
                                        value={String(opt.id)}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <p className='text-muted-foreground text-sm'>
                            Нет доступных вариантов
                        </p>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedId || availableOptions.length === 0}
                    >
                        Назначить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default AssignDialog

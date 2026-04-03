import type { FormEventHandler } from 'react'

import { Plus } from 'lucide-react'

import { Button } from '@Components/ui/button'
import { Checkbox } from '@Components/ui/checkbox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import { Input } from '@Components/ui/input'
import { Label } from '@Components/ui/label'

interface Props {
    open: boolean
    templateName: string
    templateDescription: string
    templateCheckpointTimeout: string
    templateIncludeWal: boolean
    isCreatingTemplate: boolean
    onOpenChange: (open: boolean) => void
    onTemplateNameChange: (value: string) => void
    onTemplateDescriptionChange: (value: string) => void
    onTemplateCheckpointTimeoutChange: (value: string) => void
    onTemplateIncludeWalChange: (value: boolean) => void
    onSubmit: FormEventHandler<HTMLFormElement>
}

function CreateBackupTemplateDialog({
    open,
    templateName,
    templateDescription,
    templateCheckpointTimeout,
    templateIncludeWal,
    isCreatingTemplate,
    onOpenChange,
    onTemplateNameChange,
    onTemplateDescriptionChange,
    onTemplateCheckpointTimeoutChange,
    onTemplateIncludeWalChange,
    onSubmit,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Новый шаблон бэкапа</DialogTitle>
                    <DialogDescription>
                        Создай шаблон, который потом можно использовать для
                        ручного запуска.
                    </DialogDescription>
                </DialogHeader>

                <form className='space-y-4' onSubmit={onSubmit}>
                    <div className='space-y-2'>
                        <Label htmlFor='backup-template-name'>Название</Label>
                        <Input
                            id='backup-template-name'
                            value={templateName}
                            onChange={event =>
                                onTemplateNameChange(event.target.value)
                            }
                            placeholder='Ежедневный физический бэкап'
                            disabled={isCreatingTemplate}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor='backup-template-description'>
                            Описание
                        </Label>
                        <Input
                            id='backup-template-description'
                            value={templateDescription}
                            onChange={event =>
                                onTemplateDescriptionChange(event.target.value)
                            }
                            placeholder='Полный physical backup с WAL'
                            disabled={isCreatingTemplate}
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <Label htmlFor='backup-template-type'>Тип</Label>
                            <Input
                                id='backup-template-type'
                                value='full_physical'
                                disabled
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='backup-template-checkpoint'>
                                Checkpoint timeout, c
                            </Label>
                            <Input
                                id='backup-template-checkpoint'
                                type='number'
                                min='1'
                                step='1'
                                value={templateCheckpointTimeout}
                                onChange={event =>
                                    onTemplateCheckpointTimeoutChange(
                                        event.target.value,
                                    )
                                }
                                disabled={isCreatingTemplate}
                            />
                        </div>
                    </div>

                    <div className='flex items-center gap-3 rounded-lg border p-3'>
                        <Checkbox
                            id='backup-template-include-wal'
                            checked={templateIncludeWal}
                            onCheckedChange={checked =>
                                onTemplateIncludeWalChange(Boolean(checked))
                            }
                            disabled={isCreatingTemplate}
                        />
                        <Label htmlFor='backup-template-include-wal'>
                            Включать WAL в бэкап
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => onOpenChange(false)}
                            disabled={isCreatingTemplate}
                        >
                            Отмена
                        </Button>
                        <Button type='submit' disabled={isCreatingTemplate}>
                            <Plus />
                            Создать шаблон
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CreateBackupTemplateDialog

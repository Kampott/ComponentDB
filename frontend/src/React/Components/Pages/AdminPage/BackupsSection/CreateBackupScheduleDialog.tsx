import type { FormEventHandler } from 'react'

import { CalendarPlus } from 'lucide-react'

import { Button } from '@Components/ui/button'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'
import type { BackupDatabase, BackupTemplate } from '@Schemas'

interface Props {
    open: boolean
    databases: BackupDatabase[] | null
    templates: BackupTemplate[] | null
    displayName: string
    cronExpression: string
    timezone: string
    databaseName: string
    templateId: string
    isCreating: boolean
    onOpenChange: (open: boolean) => void
    onDisplayNameChange: (value: string) => void
    onCronExpressionChange: (value: string) => void
    onTimezoneChange: (value: string) => void
    onDatabaseNameChange: (value: string) => void
    onTemplateIdChange: (value: string) => void
    onSubmit: FormEventHandler<HTMLFormElement>
}

function CreateBackupScheduleDialog({
    open,
    databases,
    templates,
    displayName,
    cronExpression,
    timezone,
    databaseName,
    templateId,
    isCreating,
    onOpenChange,
    onDisplayNameChange,
    onCronExpressionChange,
    onTimezoneChange,
    onDatabaseNameChange,
    onTemplateIdChange,
    onSubmit,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Запланировать бэкап</DialogTitle>
                    <DialogDescription>
                        Создай расписание, которое будет запускать резервную
                        копию по cron-выражению.
                    </DialogDescription>
                </DialogHeader>

                <form className='space-y-4' onSubmit={onSubmit}>
                    <div className='space-y-2'>
                        <Label htmlFor='backup-schedule-name'>
                            Название расписания
                        </Label>
                        <Input
                            id='backup-schedule-name'
                            value={displayName}
                            onChange={event =>
                                onDisplayNameChange(event.target.value)
                            }
                            placeholder='Ночной backup main'
                            disabled={isCreating}
                        />
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <Label htmlFor='backup-schedule-database'>
                                База данных
                            </Label>
                            <Select
                                value={databaseName || undefined}
                                onValueChange={onDatabaseNameChange}
                                disabled={isCreating}
                            >
                                <SelectTrigger id='backup-schedule-database'>
                                    <SelectValue placeholder='Выбери базу' />
                                </SelectTrigger>
                                <SelectContent>
                                    {databases?.map(database => (
                                        <SelectItem
                                            key={database.name}
                                            value={database.name}
                                        >
                                            {database.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='backup-schedule-template'>
                                Шаблон
                            </Label>
                            <Select
                                value={templateId || undefined}
                                onValueChange={onTemplateIdChange}
                                disabled={isCreating}
                            >
                                <SelectTrigger id='backup-schedule-template'>
                                    <SelectValue placeholder='Выбери шаблон' />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates?.map(template => (
                                        <SelectItem
                                            key={template.template_id}
                                            value={String(template.template_id)}
                                        >
                                            {template.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <Label htmlFor='backup-schedule-cron'>
                                Cron-выражение
                            </Label>
                            <Input
                                id='backup-schedule-cron'
                                value={cronExpression}
                                onChange={event =>
                                    onCronExpressionChange(event.target.value)
                                }
                                placeholder='0 3 * * *'
                                disabled={isCreating}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='backup-schedule-timezone'>
                                Timezone
                            </Label>
                            <Input
                                id='backup-schedule-timezone'
                                value={timezone}
                                onChange={event =>
                                    onTimezoneChange(event.target.value)
                                }
                                placeholder='Europe/Moscow'
                                disabled={isCreating}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => onOpenChange(false)}
                            disabled={isCreating}
                        >
                            Отмена
                        </Button>
                        <Button type='submit' disabled={isCreating}>
                            <CalendarPlus />
                            Создать расписание
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CreateBackupScheduleDialog

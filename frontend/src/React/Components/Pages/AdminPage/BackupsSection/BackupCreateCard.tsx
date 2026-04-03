import type { FormEventHandler } from 'react'

import { Badge } from '@Components/ui/badge'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import { Label } from '@Components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'
import type { BackupDatabase, BackupTemplate } from '@Schemas'
import { getDatabaseSummary } from './backupFormatters.tsx'

interface Props {
    databases: BackupDatabase[] | null
    templates: BackupTemplate[] | null
    selectedDatabaseName: string
    selectedTemplateId: string
    selectedDatabase: BackupDatabase | null
    selectedTemplate: BackupTemplate | null
    isStartingBackup: boolean
    onDatabaseChange: (value: string) => void
    onTemplateChange: (value: string) => void
    onCreateTemplateRequest: () => void
    onSubmit: FormEventHandler<HTMLFormElement>
}

function BackupCreateCard({
    databases,
    templates,
    selectedDatabaseName,
    selectedTemplateId,
    selectedDatabase,
    selectedTemplate,
    isStartingBackup,
    onDatabaseChange,
    onTemplateChange,
    onCreateTemplateRequest,
    onSubmit,
}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Создать бэкап</CardTitle>
                <CardDescription>
                    Выбери базу и шаблон. Запуск создаётся сразу через backend
                    API.
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <form className='space-y-4' onSubmit={onSubmit}>
                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <Label htmlFor='backup-database'>База данных</Label>
                            <Select
                                value={selectedDatabaseName || undefined}
                                onValueChange={onDatabaseChange}
                                disabled={(databases?.length ?? 0) === 0}
                            >
                                <SelectTrigger id='backup-database'>
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
                            <div className='flex items-center justify-between gap-3'>
                                <Label htmlFor='backup-template'>Шаблон</Label>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={onCreateTemplateRequest}
                                >
                                    Новый шаблон
                                </Button>
                            </div>
                            <Select
                                value={selectedTemplateId || undefined}
                                onValueChange={onTemplateChange}
                                disabled={(templates?.length ?? 0) === 0}
                            >
                                <SelectTrigger id='backup-template'>
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
                        <div className='bg-muted/30 rounded-lg border p-4'>
                            <p className='text-sm font-medium'>
                                Выбранная база
                            </p>
                            {selectedDatabase ? (
                                <div className='text-muted-foreground mt-2 space-y-1 text-sm'>
                                    <p>
                                        {getDatabaseSummary(selectedDatabase)}
                                    </p>
                                    {selectedDatabase.connection && (
                                        <p>
                                            PostgreSQL{' '}
                                            {
                                                selectedDatabase.connection
                                                    .pg_version_string
                                            }
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className='text-muted-foreground mt-2 text-sm'>
                                    Нет доступных баз данных.
                                </p>
                            )}
                        </div>

                        <div className='bg-muted/30 rounded-lg border p-4'>
                            <p className='text-sm font-medium'>
                                Выбранный шаблон
                            </p>
                            {selectedTemplate ? (
                                <div className='text-muted-foreground mt-2 space-y-2 text-sm'>
                                    <p>{selectedTemplate.description}</p>
                                    <div className='flex flex-wrap gap-2'>
                                        <Badge variant='outline'>
                                            {selectedTemplate.type}
                                        </Badge>
                                        <Badge variant='outline'>
                                            WAL:{' '}
                                            {selectedTemplate.include_wal
                                                ? 'вкл'
                                                : 'выкл'}
                                        </Badge>
                                        <Badge variant='outline'>
                                            checkpoint:{' '}
                                            {
                                                selectedTemplate.checkpoint_timeout
                                            }
                                            c
                                        </Badge>
                                    </div>
                                </div>
                            ) : (
                                <p className='text-muted-foreground mt-2 text-sm'>
                                    Нет шаблонов. Создай шаблон, чтобы запускать
                                    бэкапы.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className='flex justify-end'>
                        <Button
                            type='submit'
                            disabled={
                                isStartingBackup ||
                                !selectedDatabaseName ||
                                !selectedTemplateId
                            }
                        >
                            Создать бэкап
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

export default BackupCreateCard

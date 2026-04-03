import { Plus } from 'lucide-react'

import { Badge } from '@Components/ui/badge'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import type { BackupTemplate } from '@Schemas'
import { formatDateTime } from './backupFormatters.tsx'

interface Props {
    templates: BackupTemplate[] | null
    onCreateTemplateRequest: () => void
}

function BackupTemplatesCard({ templates, onCreateTemplateRequest }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Шаблоны бэкапов</CardTitle>
                <CardDescription>
                    Используются для ручного запуска резервных копий.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {templates && templates.length > 0 ? (
                    <div className='space-y-3'>
                        {templates.map(template => (
                            <div
                                key={template.template_id}
                                className='rounded-lg border p-4'
                            >
                                <div className='flex flex-wrap items-start justify-between gap-3'>
                                    <div className='space-y-1'>
                                        <div className='flex items-center gap-2'>
                                            <p className='font-medium'>
                                                {template.name}
                                            </p>
                                            <Badge variant='secondary'>
                                                #{template.template_id}
                                            </Badge>
                                        </div>
                                        <p className='text-muted-foreground text-sm'>
                                            {template.description}
                                        </p>
                                    </div>
                                    <div className='flex flex-wrap gap-2'>
                                        <Badge variant='outline'>
                                            {template.type}
                                        </Badge>
                                        <Badge variant='outline'>
                                            WAL:{' '}
                                            {template.include_wal
                                                ? 'вкл'
                                                : 'выкл'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className='text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs'>
                                    <span>
                                        Checkpoint timeout:{' '}
                                        {template.checkpoint_timeout}c
                                    </span>
                                    <span>
                                        Обновлён:{' '}
                                        {formatDateTime(template.updated_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='rounded-lg border border-dashed p-6 text-center'>
                        <p className='text-muted-foreground text-sm'>
                            Шаблонов пока нет.
                        </p>
                        <Button
                            type='button'
                            variant='outline'
                            className='mt-4'
                            onClick={onCreateTemplateRequest}
                        >
                            <Plus />
                            Создать шаблон
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default BackupTemplatesCard

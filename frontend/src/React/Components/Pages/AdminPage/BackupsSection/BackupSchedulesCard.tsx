import { Pause, Play, Plus, Trash2 } from 'lucide-react'

import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import type { BackupSchedule, BackupTemplate } from '@Schemas'
import {
    formatDateTime,
    renderBackupStatusBadge,
    renderScheduleStateBadge,
} from './backupFormatters.tsx'

interface Props {
    schedules: BackupSchedule[] | null
    templates: BackupTemplate[] | null
    processingScheduleId: number | null
    onCreateRequest: () => void
    onPause: (schedule: BackupSchedule) => void
    onResume: (schedule: BackupSchedule) => void
    onDelete: (schedule: BackupSchedule) => void
}

function BackupSchedulesCard({
    schedules,
    templates,
    processingScheduleId,
    onCreateRequest,
    onPause,
    onResume,
    onDelete,
}: Props) {
    const templateNameById = new Map(
        (templates ?? []).map(template => [
            template.template_id,
            template.name,
        ]),
    )

    return (
        <Card>
            <CardHeader>
                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                    <div>
                        <CardTitle>Расписания бэкапов</CardTitle>
                        <CardDescription>
                            Плановый запуск резервных копий по cron-выражению.
                        </CardDescription>
                    </div>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={onCreateRequest}
                    >
                        <Plus />
                        Запланировать
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {schedules && schedules.length > 0 ? (
                    <div className='space-y-3'>
                        {schedules.map(schedule => (
                            <div
                                key={schedule.schedule_id}
                                className='rounded-lg border p-4'
                            >
                                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                    <div className='space-y-2'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <p className='font-medium'>
                                                {schedule.display_name}
                                            </p>
                                            {renderScheduleStateBadge(
                                                schedule.state,
                                            )}
                                        </div>
                                        <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm'>
                                            <span>
                                                База: {schedule.database_name}
                                            </span>
                                            <span>
                                                Шаблон:{' '}
                                                {templateNameById.get(
                                                    schedule.template_id,
                                                ) ?? `#${schedule.template_id}`}
                                            </span>
                                            <span>
                                                Cron: {schedule.cron_expression}
                                            </span>
                                            <span>TZ: {schedule.timezone}</span>
                                        </div>
                                        <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs'>
                                            <span>
                                                Следующий запуск:{' '}
                                                {formatDateTime(
                                                    schedule.next_run_at,
                                                )}
                                            </span>
                                            <span>
                                                Последний запуск:{' '}
                                                {formatDateTime(
                                                    schedule.last_run_at,
                                                )}
                                            </span>
                                            <span>
                                                Последний статус:{' '}
                                                {schedule.last_run_status
                                                    ? renderBackupStatusBadge(
                                                          schedule.last_run_status,
                                                      )
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className='flex flex-wrap gap-2'>
                                        {schedule.state === 'active' ? (
                                            <Button
                                                type='button'
                                                variant='outline'
                                                size='sm'
                                                onClick={() =>
                                                    onPause(schedule)
                                                }
                                                disabled={
                                                    processingScheduleId ===
                                                    schedule.schedule_id
                                                }
                                            >
                                                <Pause />
                                                Пауза
                                            </Button>
                                        ) : (
                                            <Button
                                                type='button'
                                                variant='outline'
                                                size='sm'
                                                onClick={() =>
                                                    onResume(schedule)
                                                }
                                                disabled={
                                                    processingScheduleId ===
                                                    schedule.schedule_id
                                                }
                                            >
                                                <Play />
                                                Возобновить
                                            </Button>
                                        )}
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='sm'
                                            onClick={() => onDelete(schedule)}
                                            disabled={
                                                processingScheduleId ===
                                                schedule.schedule_id
                                            }
                                        >
                                            <Trash2 />
                                            Удалить
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className='rounded-lg border border-dashed p-6 text-center'>
                        <p className='text-muted-foreground text-sm'>
                            Расписаний пока нет.
                        </p>
                        <Button
                            type='button'
                            variant='outline'
                            className='mt-4'
                            onClick={onCreateRequest}
                        >
                            <Plus />
                            Запланировать бэкап
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default BackupSchedulesCard

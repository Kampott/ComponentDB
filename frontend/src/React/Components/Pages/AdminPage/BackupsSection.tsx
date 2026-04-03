import { RefreshCw } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
    type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import { useDataTableState } from '@/lib/useDataTableState.ts'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { Button } from '@Components/ui/button'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    backupSchema,
    type Backup,
    type BackupDatabase,
    type BackupSchedule,
    type BackupTemplate,
} from '@Schemas'
import {
    useContextMenuStore,
    useServicesStore,
    useToastStore,
} from '@StorageImpl'
import { createBackupColumns } from './BackupsSection/backupColumns.tsx'
import BackupCreateCard from './BackupsSection/BackupCreateCard.tsx'
import BackupSchedulesCard from './BackupsSection/BackupSchedulesCard.tsx'
import BackupsTableCard from './BackupsSection/BackupsTableCard.tsx'
import BackupTemplatesCard from './BackupsSection/BackupTemplatesCard.tsx'
import CreateBackupScheduleDialog from './BackupsSection/CreateBackupScheduleDialog.tsx'
import CreateBackupTemplateDialog from './BackupsSection/CreateBackupTemplateDialog.tsx'

function BackupsSection() {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const addToast = useToastStore(state => state.addToast)

    const [databases, setDatabases] = useState<BackupDatabase[] | null>(null)
    const [templates, setTemplates] = useState<BackupTemplate[] | null>(null)
    const [backups, setBackups] = useState<Backup[] | null>(null)
    const [schedules, setSchedules] = useState<BackupSchedule[] | null>(null)
    const [selectedDatabaseName, setSelectedDatabaseName] = useState('')
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [scheduleDatabaseName, setScheduleDatabaseName] = useState('')
    const [scheduleTemplateId, setScheduleTemplateId] = useState('')
    const [scheduleDisplayName, setScheduleDisplayName] = useState('')
    const [scheduleCronExpression, setScheduleCronExpression] =
        useState('0 3 * * *')
    const [scheduleTimezone, setScheduleTimezone] = useState(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    )
    const [isStartingBackup, setIsStartingBackup] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] =
        useState(false)
    const [isCreateScheduleDialogOpen, setIsCreateScheduleDialogOpen] =
        useState(false)
    const [templateName, setTemplateName] = useState('')
    const [templateDescription, setTemplateDescription] = useState('')
    const [templateCheckpointTimeout, setTemplateCheckpointTimeout] =
        useState('300')
    const [templateIncludeWal, setTemplateIncludeWal] = useState(true)
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
    const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)
    const [processingScheduleId, setProcessingScheduleId] = useState<
        number | null
    >(null)

    const columns = useMemo(() => createBackupColumns(), [])
    const { onContextMenuCall } = useContextMenuStore()

    const tableState = useDataTableState({
        schema: backupSchema,
        columns,
        defaultPageSize: 10,
        defaultSorting: {
            field: 'started_at',
            direction: 'desc',
        },
        initialColumnVisibility: {
            type: false,
        },
    })

    const showError = useCallback(
        (message: string) => {
            addToast('Ошибка', message)
        },
        [addToast],
    )

    const handleError = useCallback(
        (error: unknown) => {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: showError,
            })
        },
        [navigate, showError],
    )

    const loadAllData = useCallback(async () => {
        setDatabases(null)
        setTemplates(null)
        setBackups(null)

        try {
            const [nextDatabases, nextTemplates, nextBackups, nextSchedules] =
                await Promise.all([
                    services.backupService.listDatabases(),
                    services.backupService.listTemplates(),
                    services.backupService.listBackups(),
                    services.backupService.listSchedules(),
                ])

            setDatabases(nextDatabases)
            setTemplates(nextTemplates)
            setBackups(nextBackups)
            setSchedules(nextSchedules)
        } catch (error) {
            handleError(error)
        }
    }, [handleError, services.backupService])

    const loadBackups = useCallback(async () => {
        setBackups(null)

        try {
            const nextBackups = await services.backupService.listBackups()
            setBackups(nextBackups)
        } catch (error) {
            handleError(error)
        }
    }, [handleError, services.backupService])

    const loadTemplates = useCallback(async () => {
        setTemplates(null)

        try {
            setTemplates(await services.backupService.listTemplates())
        } catch (error) {
            handleError(error)
        }
    }, [handleError, services.backupService])

    const loadSchedules = useCallback(async () => {
        setSchedules(null)

        try {
            setSchedules(await services.backupService.listSchedules())
        } catch (error) {
            handleError(error)
        }
    }, [handleError, services.backupService])

    useEffect(() => {
        void loadAllData()
    }, [loadAllData])

    useEffect(() => {
        if (
            databases?.some(database => database.name === selectedDatabaseName)
        ) {
            return
        }

        setSelectedDatabaseName(databases?.[0]?.name ?? '')
    }, [databases, selectedDatabaseName])

    useEffect(() => {
        if (
            databases?.some(database => database.name === scheduleDatabaseName)
        ) {
            return
        }

        setScheduleDatabaseName(databases?.[0]?.name ?? '')
    }, [databases, scheduleDatabaseName])

    useEffect(() => {
        if (
            templates?.some(
                template => String(template.template_id) === selectedTemplateId,
            )
        ) {
            return
        }

        setSelectedTemplateId(templates?.[0]?.template_id?.toString() ?? '')
    }, [selectedTemplateId, templates])

    useEffect(() => {
        if (
            templates?.some(
                template => String(template.template_id) === scheduleTemplateId,
            )
        ) {
            return
        }

        setScheduleTemplateId(templates?.[0]?.template_id?.toString() ?? '')
    }, [scheduleTemplateId, templates])

    const selectedDatabase = useMemo(
        () =>
            databases?.find(
                database => database.name === selectedDatabaseName,
            ) ?? null,
        [databases, selectedDatabaseName],
    )

    const selectedTemplate = useMemo(
        () =>
            templates?.find(
                template => String(template.template_id) === selectedTemplateId,
            ) ?? null,
        [selectedTemplateId, templates],
    )

    const isReady =
        databases !== null &&
        templates !== null &&
        backups !== null &&
        schedules !== null
            ? true
            : null

    async function handleStartBackup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!selectedDatabaseName || !selectedTemplateId) {
            showError('Выбери базу и шаблон для запуска бэкапа')
            return
        }

        setIsStartingBackup(true)

        try {
            const response = await services.backupService.startBackup({
                database_name: selectedDatabaseName,
                template_id: Number(selectedTemplateId),
            })

            addToast(
                'Бэкап создан',
                `Запуск #${response.backup_id} создан для базы ${selectedDatabaseName}`,
            )
            await loadBackups()
        } catch (error) {
            handleError(error)
        } finally {
            setIsStartingBackup(false)
        }
    }

    async function handleRefresh() {
        setIsRefreshing(true)

        try {
            await loadAllData()
        } finally {
            setIsRefreshing(false)
        }
    }

    async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!templateName.trim() || !templateDescription.trim()) {
            showError('Заполни имя и описание шаблона')
            return
        }

        const checkpointTimeout = Number(templateCheckpointTimeout)
        if (!Number.isFinite(checkpointTimeout) || checkpointTimeout <= 0) {
            showError('Checkpoint timeout должен быть положительным числом')
            return
        }

        setIsCreatingTemplate(true)

        try {
            const template = await services.backupService.createTemplate({
                name: templateName.trim(),
                description: templateDescription.trim(),
                type: 'full_physical',
                include_wal: templateIncludeWal,
                checkpoint_timeout: checkpointTimeout,
            })

            addToast(
                'Шаблон создан',
                `Шаблон «${template.name}» готов к использованию`,
            )
            setIsCreateTemplateDialogOpen(false)
            setTemplateName('')
            setTemplateDescription('')
            setTemplateCheckpointTimeout('300')
            setTemplateIncludeWal(true)
            await loadTemplates()
            setSelectedTemplateId(String(template.template_id))
        } catch (error) {
            handleError(error)
        } finally {
            setIsCreatingTemplate(false)
        }
    }

    async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (
            !scheduleDisplayName.trim() ||
            !scheduleCronExpression.trim() ||
            !scheduleTimezone.trim() ||
            !scheduleDatabaseName ||
            !scheduleTemplateId
        ) {
            showError('Заполни все поля расписания')
            return
        }

        setIsCreatingSchedule(true)

        try {
            const schedule = await services.backupService.createSchedule({
                database_name: scheduleDatabaseName,
                display_name: scheduleDisplayName.trim(),
                cron_expression: scheduleCronExpression.trim(),
                timezone: scheduleTimezone.trim(),
                template_id: Number(scheduleTemplateId),
            })

            addToast(
                'Расписание создано',
                `Расписание «${schedule.display_name}» добавлено`,
            )
            setIsCreateScheduleDialogOpen(false)
            setScheduleDisplayName('')
            setScheduleCronExpression('0 3 * * *')
            setScheduleTimezone(
                Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            )
            await loadSchedules()
        } catch (error) {
            handleError(error)
        } finally {
            setIsCreatingSchedule(false)
        }
    }

    async function handleDeleteBackup(backup: Backup) {
        try {
            await services.backupService.deleteBackup(backup.backup_id)
            addToast(
                'Бэкап удалён',
                `Бэкап #${backup.backup_id} удалён из списка`,
            )
            await loadBackups()
        } catch (error) {
            handleError(error)
        }
    }

    async function handlePauseSchedule(schedule: BackupSchedule) {
        setProcessingScheduleId(schedule.schedule_id)

        try {
            await services.backupService.pauseSchedule(schedule.schedule_id)
            addToast(
                'Расписание обновлено',
                `Расписание «${schedule.display_name}» поставлено на паузу`,
            )
            await loadSchedules()
        } catch (error) {
            handleError(error)
        } finally {
            setProcessingScheduleId(null)
        }
    }

    async function handleResumeSchedule(schedule: BackupSchedule) {
        setProcessingScheduleId(schedule.schedule_id)

        try {
            await services.backupService.resumeSchedule(schedule.schedule_id)
            addToast(
                'Расписание обновлено',
                `Расписание «${schedule.display_name}» снова активно`,
            )
            await loadSchedules()
        } catch (error) {
            handleError(error)
        } finally {
            setProcessingScheduleId(null)
        }
    }

    async function handleDeleteSchedule(schedule: BackupSchedule) {
        setProcessingScheduleId(schedule.schedule_id)

        try {
            await services.backupService.deleteSchedule(schedule.schedule_id)
            addToast(
                'Расписание удалено',
                `Расписание «${schedule.display_name}» удалено`,
            )
            await loadSchedules()
        } catch (error) {
            handleError(error)
        } finally {
            setProcessingScheduleId(null)
        }
    }

    async function handleCancelBackup(backup: Backup) {
        try {
            const response = await services.backupService.cancelBackup(
                backup.backup_id,
            )
            addToast(
                'Операция завершена',
                response.message ??
                    `Запрос на остановку бэкапа #${backup.backup_id} отправлен`,
            )
            await loadBackups()
        } catch (error) {
            handleError(error)
        }
    }

    function openBackupPage(backup: Backup) {
        navigate(`/admin/backups/${backup.backup_id}`)
    }

    function getContextMenuOptions(backup: Backup) {
        return buildContextMenuOptions<Backup>({
            onViewRequest: openBackupPage,
            extraOptions: {
                Отменить:
                    backup.status === 'queued' || backup.status === 'running'
                        ? handleCancelBackup
                        : undefined,
                Удалить:
                    backup.status !== 'queued' && backup.status !== 'running'
                        ? handleDeleteBackup
                        : undefined,
            },
        })
    }

    function handleContextMenu(event: MouseEvent<HTMLElement>, backup: Backup) {
        const contextMenuOptions = getContextMenuOptions(backup)
        if (!hasContextMenuActions(contextMenuOptions)) {
            return
        }

        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            backup,
            contextMenuOptions,
        )
    }

    return (
        <>
            <LoadEffect
                data={isReady}
                contentSize={{ height: '32px', width: '100%' }}
            >
                <div className='space-y-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                        <div>
                            <h2 className='text-2xl font-semibold'>Бэкапы</h2>
                            <p className='text-muted-foreground text-sm'>
                                Ручной запуск резервных копий и просмотр
                                последних операций.
                            </p>
                        </div>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw
                                className={
                                    isRefreshing ? 'animate-spin' : undefined
                                }
                            />
                            Обновить
                        </Button>
                    </div>

                    <div className='grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]'>
                        <BackupCreateCard
                            databases={databases}
                            templates={templates}
                            selectedDatabaseName={selectedDatabaseName}
                            selectedTemplateId={selectedTemplateId}
                            selectedDatabase={selectedDatabase}
                            selectedTemplate={selectedTemplate}
                            isStartingBackup={isStartingBackup}
                            onDatabaseChange={setSelectedDatabaseName}
                            onTemplateChange={setSelectedTemplateId}
                            onCreateTemplateRequest={() =>
                                setIsCreateTemplateDialogOpen(true)
                            }
                            onSubmit={handleStartBackup}
                        />

                        <BackupTemplatesCard
                            templates={templates}
                            onCreateTemplateRequest={() =>
                                setIsCreateTemplateDialogOpen(true)
                            }
                        />
                    </div>

                    <BackupSchedulesCard
                        schedules={schedules}
                        templates={templates}
                        processingScheduleId={processingScheduleId}
                        onCreateRequest={() =>
                            setIsCreateScheduleDialogOpen(true)
                        }
                        onPause={handlePauseSchedule}
                        onResume={handleResumeSchedule}
                        onDelete={handleDeleteSchedule}
                    />

                    <BackupsTableCard
                        tableState={tableState}
                        columns={columns}
                        backups={backups}
                        isRefreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        onViewBackup={openBackupPage}
                        onRowContextMenu={handleContextMenu}
                    />
                </div>
            </LoadEffect>

            <CreateBackupTemplateDialog
                open={isCreateTemplateDialogOpen}
                templateName={templateName}
                templateDescription={templateDescription}
                templateCheckpointTimeout={templateCheckpointTimeout}
                templateIncludeWal={templateIncludeWal}
                isCreatingTemplate={isCreatingTemplate}
                onOpenChange={setIsCreateTemplateDialogOpen}
                onTemplateNameChange={setTemplateName}
                onTemplateDescriptionChange={setTemplateDescription}
                onTemplateCheckpointTimeoutChange={setTemplateCheckpointTimeout}
                onTemplateIncludeWalChange={setTemplateIncludeWal}
                onSubmit={handleCreateTemplate}
            />

            <CreateBackupScheduleDialog
                open={isCreateScheduleDialogOpen}
                databases={databases}
                templates={templates}
                displayName={scheduleDisplayName}
                cronExpression={scheduleCronExpression}
                timezone={scheduleTimezone}
                databaseName={scheduleDatabaseName}
                templateId={scheduleTemplateId}
                isCreating={isCreatingSchedule}
                onOpenChange={setIsCreateScheduleDialogOpen}
                onDisplayNameChange={setScheduleDisplayName}
                onCronExpressionChange={setScheduleCronExpression}
                onTimezoneChange={setScheduleTimezone}
                onDatabaseNameChange={setScheduleDatabaseName}
                onTemplateIdChange={setScheduleTemplateId}
                onSubmit={handleCreateSchedule}
            />
        </>
    )
}

export default BackupsSection

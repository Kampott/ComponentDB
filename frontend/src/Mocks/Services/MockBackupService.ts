import type IBackupService from '@/Interfaces/Services/IBackupService.ts'
import type {
    Backup,
    BackupDatabase,
    BackupDeleteQuery,
    BackupInfo,
    BackupListQuery,
    BackupSchedule,
    BackupScheduleAdd,
    BackupScheduleListQuery,
    BackupScheduleUpdate,
    BackupTemplate,
    BackupTemplateAdd,
    BackupTemplateListQuery,
    BackupTemplateUpdate,
    BackupVerification,
    CancelBackupResponse,
    StartBackupRequest,
    StartBackupResponse,
    VerifyBackupRequest,
} from '@Schemas'

function nowIso(): string {
    return new Date().toISOString()
}

function normalizeArrayFilter<T>(value?: T | T[]): T[] | undefined {
    if (value === undefined) {
        return undefined
    }

    return Array.isArray(value) ? value : [value]
}

export default class MockBackupService implements IBackupService {
    private nextTemplateId = 3
    private nextBackupId = 1
    private nextScheduleId = 1

    private readonly databases: BackupDatabase[] = [
        {
            name: 'main',
            config: {
                schema: 'main',
                user: 'replicator',
                host: 'localhost',
                port: 5432,
            },
        },
        {
            name: 'logging',
            config: {
                schema: 'logging',
                user: 'replicator',
                host: 'localhost',
                port: 5431,
            },
        },
    ]

    private readonly templates: BackupTemplate[] = [
        {
            template_id: 1,
            name: 'Полный daily backup',
            description: 'Полный physical backup с WAL для ежедневного запуска',
            type: 'full_physical',
            include_wal: true,
            checkpoint_timeout: 300,
            created_at: '2026-04-01T09:00:00.000Z',
            updated_at: '2026-04-01T09:00:00.000Z',
        },
        {
            template_id: 2,
            name: 'Быстрый full backup',
            description: 'Полный physical backup без WAL для ручных операций',
            type: 'full_physical',
            include_wal: false,
            checkpoint_timeout: 120,
            created_at: '2026-04-02T11:30:00.000Z',
            updated_at: '2026-04-02T11:30:00.000Z',
        },
    ]
    private readonly backups: Backup[] = []
    private readonly schedules: BackupSchedule[] = []
    private readonly verifications = new Map<number, BackupVerification>()

    public async listDatabases(): Promise<BackupDatabase[]> {
        return this.databases
    }

    public async listTemplates(
        query?: BackupTemplateListQuery,
    ): Promise<BackupTemplate[]> {
        const offset = query?.offset ?? 0
        const limit = query?.limit ?? this.templates.length
        return this.templates.slice(offset, offset + limit)
    }

    public async readTemplate(templateId: number): Promise<BackupTemplate> {
        const template = this.templates.find(
            item => item.template_id === templateId,
        )
        if (!template) {
            throw new Error(`Backup template ${templateId} not found`)
        }
        return template
    }

    public async createTemplate(
        data: BackupTemplateAdd,
    ): Promise<BackupTemplate> {
        const timestamp = nowIso()
        const template: BackupTemplate = {
            template_id: this.nextTemplateId++,
            created_at: timestamp,
            updated_at: timestamp,
            ...data,
        }
        this.templates.push(template)
        return template
    }

    public async updateTemplate(
        templateId: number,
        data: BackupTemplateUpdate,
    ): Promise<BackupTemplate> {
        const template = await this.readTemplate(templateId)
        Object.assign(template, data, { updated_at: nowIso() })
        return template
    }

    public async deleteTemplate(templateId: number): Promise<null> {
        const hasBackupReference = this.backups.some(
            backup => backup.backup_template?.template_id === templateId,
        )
        const hasScheduleReference = this.schedules.some(
            schedule => schedule.template_id === templateId,
        )
        if (hasBackupReference || hasScheduleReference) {
            throw new Error(
                `Cannot delete template ${templateId}: it is still referenced`,
            )
        }

        const index = this.templates.findIndex(
            item => item.template_id === templateId,
        )
        if (index >= 0) {
            this.templates.splice(index, 1)
        }
        return null
    }

    public async startBackup(
        data: StartBackupRequest,
    ): Promise<StartBackupResponse> {
        const template = await this.readTemplate(data.template_id)
        const backupId = this.nextBackupId++
        const timestamp = nowIso()
        const info: BackupInfo = {
            kind: 'store',
            store_info: {
                size_bytes: 0,
                original_size_bytes: 0,
                storage_path: `mock://backup/${backupId}`,
                verification: null,
            },
        }

        this.backups.unshift({
            backup_id: backupId,
            database_name: data.database_name,
            backup_template: template,
            status: 'completed',
            info,
            started_at: timestamp,
            finished_at: timestamp,
            duration_seconds: 0,
            pg_version_num: 0,
            parent_backup_id: null,
        })

        return {
            backup_id: backupId,
        }
    }

    public async listBackups(query?: BackupListQuery): Promise<Backup[]> {
        const typeFilter = normalizeArrayFilter(query?.type)
        const statusFilter = normalizeArrayFilter(query?.status)

        return this.backups.filter(backup => {
            if (
                query?.database_name !== undefined &&
                backup.database_name !== query.database_name
            ) {
                return false
            }

            if (
                typeFilter !== undefined &&
                backup.backup_template !== null &&
                !typeFilter.includes(backup.backup_template.type)
            ) {
                return false
            }

            if (
                statusFilter !== undefined &&
                !statusFilter.includes(backup.status)
            ) {
                return false
            }

            if (
                query?.only_after !== undefined &&
                backup.started_at !== undefined &&
                backup.started_at !== null &&
                new Date(backup.started_at) <= new Date(query.only_after)
            ) {
                return false
            }

            return true
        })
    }

    public async readBackup(backupId: number): Promise<Backup> {
        const backup = this.backups.find(item => item.backup_id === backupId)
        if (!backup) {
            throw new Error(`Backup ${backupId} not found`)
        }
        return backup
    }

    public async deleteBackup(
        backupId: number,
        _query?: BackupDeleteQuery,
    ): Promise<null> {
        const index = this.backups.findIndex(
            item => item.backup_id === backupId,
        )
        if (index >= 0) {
            this.backups.splice(index, 1)
        }
        this.verifications.delete(backupId)
        return null
    }

    public async cancelBackup(backupId: number): Promise<CancelBackupResponse> {
        const backup = this.backups.find(item => item.backup_id === backupId)
        if (!backup) {
            return {
                result: 'not_found',
                message: 'Backup not found',
            }
        }

        if (backup.status !== 'queued' && backup.status !== 'running') {
            return {
                result: 'already_finished',
                message: 'Backup already finished',
            }
        }

        backup.status = 'cancelled'
        backup.finished_at = nowIso()
        backup.info = {
            kind: 'error',
            error_info: {
                error_message: 'Cancelled by user',
            },
        }

        return {
            result: 'success',
        }
    }

    public async verifyBackup(
        backupId: number,
        data: VerifyBackupRequest = {},
    ): Promise<BackupVerification> {
        await this.readBackup(backupId)

        const verification: BackupVerification = {
            backup_id: backupId,
            verify_hash: data.verify_hash ?? false,
            verified_at: nowIso(),
            checksum_sha256: null,
        }

        this.verifications.set(backupId, verification)

        const backup = await this.readBackup(backupId)
        if (backup.info?.store_info) {
            backup.info.store_info.verification = verification
        }

        return verification
    }

    public async listSchedules(
        query?: BackupScheduleListQuery,
    ): Promise<BackupSchedule[]> {
        return this.schedules.filter(schedule => {
            return (
                query?.database_name === undefined ||
                schedule.database_name === query.database_name
            )
        })
    }

    public async readSchedule(scheduleId: number): Promise<BackupSchedule> {
        const schedule = this.schedules.find(
            item => item.schedule_id === scheduleId,
        )
        if (!schedule) {
            throw new Error(`Backup schedule ${scheduleId} not found`)
        }
        return schedule
    }

    public async createSchedule(
        data: BackupScheduleAdd,
    ): Promise<BackupSchedule> {
        const timestamp = nowIso()
        const schedule: BackupSchedule = {
            schedule_id: this.nextScheduleId++,
            state: 'active',
            created_at: timestamp,
            updated_at: timestamp,
            next_run_at: null,
            last_run_at: null,
            last_backup_id: null,
            last_run_status: null,
            ...data,
        }
        this.schedules.push(schedule)
        return schedule
    }

    public async updateSchedule(
        scheduleId: number,
        data: BackupScheduleUpdate,
    ): Promise<BackupSchedule> {
        const schedule = await this.readSchedule(scheduleId)
        Object.assign(schedule, data, { updated_at: nowIso() })
        return schedule
    }

    public async deleteSchedule(scheduleId: number): Promise<null> {
        const index = this.schedules.findIndex(
            item => item.schedule_id === scheduleId,
        )
        if (index >= 0) {
            this.schedules.splice(index, 1)
        }
        return null
    }

    public async pauseSchedule(scheduleId: number): Promise<BackupSchedule> {
        const schedule = await this.readSchedule(scheduleId)
        schedule.state = 'paused'
        schedule.updated_at = nowIso()
        return schedule
    }

    public async resumeSchedule(scheduleId: number): Promise<BackupSchedule> {
        const schedule = await this.readSchedule(scheduleId)
        schedule.state = 'active'
        schedule.updated_at = nowIso()
        return schedule
    }
}

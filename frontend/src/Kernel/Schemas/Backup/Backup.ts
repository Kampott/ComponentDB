import {
    defineEntitySchema,
    type EntityQueryParams,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export type BackupType = 'full_physical'

export type BackupStatus =
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'deleting'
    | 'verifying'

export type BackupScheduleState = 'active' | 'paused'

export type CancelBackupResult = 'success' | 'not_found' | 'already_finished'

export type BackupInfoKind = 'store' | 'active' | 'error'

export interface BackupDatabaseConfig {
    schema: string
    user: string
    host: string
    port: number
}

export interface BackupDatabaseConnection {
    pg_version_num: number
    pg_version_string: string
    wal_lsn: string
    db_size_bytes: number
    latency_seconds?: number | null
}

export interface BackupDatabase {
    name: string
    config: BackupDatabaseConfig
    connection?: BackupDatabaseConnection | null
}

export interface BackupDatabasesResponse {
    databases: BackupDatabase[]
}

export interface BackupTemplate {
    template_id: number
    name: string
    description: string
    type: BackupType
    include_wal: boolean
    checkpoint_timeout: number
    created_at?: string | null
    updated_at?: string | null
}

type BackupTemplateQueryShape = {
    offset: number
    limit: number
}

export const backupTemplateSchema = defineEntitySchema<
    BackupTemplate,
    Record<string, never>,
    BackupTemplateQueryShape
>()({
    entity: 'BackupTemplate',
    resource: 'backup/templates',
    query: {
        offset: ['exact'],
        limit: ['exact'],
    },
    fields: {
        template_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        description: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        type: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        include_wal: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        checkpoint_timeout: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        created_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        updated_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

export type BackupTemplateAdd = InferCreate<typeof backupTemplateSchema>
export type BackupTemplateUpdate = InferUpdate<typeof backupTemplateSchema>
export type BackupTemplateListQuery = EntityQueryParams & {
    offset?: number
    limit?: number
}

export interface BackupTemplateListResponse {
    templates: BackupTemplate[]
}

export interface StartBackupRequest {
    database_name: string
    template_id: number
}

export interface StartBackupResponse {
    backup_id: number
}

export type BackupDeleteQuery = EntityQueryParams & {
    force?: boolean
}

export interface CancelBackupResponse {
    result: CancelBackupResult
    message?: string | null
}

export interface VerifyBackupRequest {
    verify_hash?: boolean
}

export interface BackupVerification {
    backup_id: number
    verify_hash: boolean
    verified_at?: string | null
    checksum_sha256?: string | null
}

export interface BackupStoreInfo {
    size_bytes: number
    original_size_bytes: number
    storage_path: string
    verification?: BackupVerification | null
}

export interface ActiveBackupInfo {
    bytes_processed: number
    bytes_total_estimate: number
    files_processed: number
    files_total_estimate: number
}

export interface ErrorBackupInfo {
    error_message: string
}

export interface BackupInfo {
    kind: BackupInfoKind
    store_info?: BackupStoreInfo | null
    active_info?: ActiveBackupInfo | null
    error_info?: ErrorBackupInfo | null
}

export interface Backup {
    backup_id: number
    database_name: string
    backup_template: BackupTemplate | null
    status: BackupStatus
    info?: BackupInfo | null
    started_at?: string | null
    finished_at?: string | null
    duration_seconds?: number | null
    pg_version_num: number
    parent_backup_id?: number | null
}

type BackupQueryShape = {
    backup_id: number
    database_name: string
    status: BackupStatus
    type: BackupType
    started_at: string
}

export const backupSchema = defineEntitySchema<
    Backup,
    Record<string, never>,
    BackupQueryShape
>()({
    entity: 'Backup',
    resource: 'backups',
    query: {
        backup_id: ['exact', 'in', 'sort'],
        database_name: ['exact', 'like'],
        status: ['exact', 'in'],
        type: ['exact', 'in'],
        started_at: ['exact', 'gte', 'lte', 'gt', 'lt', 'sort'],
    },
    fields: {
        backup_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        database_name: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        backup_template: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        status: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        info: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        started_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        finished_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        duration_seconds: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        pg_version_num: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        parent_backup_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

export type BackupListQuery = EntityQueryParams & {
    database_name?: string
    type?: BackupType | BackupType[]
    status?: BackupStatus | BackupStatus[]
    only_after?: string | Date
}

export interface BackupListResponse {
    backups: Backup[]
}

export interface BackupSchedule {
    schedule_id: number
    database_name: string
    display_name: string
    cron_expression: string
    timezone: string
    template_id: number
    state: BackupScheduleState
    created_at?: string | null
    updated_at?: string | null
    next_run_at?: string | null
    last_run_at?: string | null
    last_backup_id?: number | null
    last_run_status?: BackupStatus | null
}

type BackupScheduleQueryShape = {
    database_name: string
}

export const backupScheduleSchema = defineEntitySchema<
    BackupSchedule,
    Record<string, never>,
    BackupScheduleQueryShape
>()({
    entity: 'BackupSchedule',
    resource: 'backup/schedules',
    query: {
        database_name: ['exact'],
    },
    fields: {
        schedule_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        database_name: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        display_name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        cron_expression: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        timezone: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        template_id: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        state: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        created_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        updated_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        next_run_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        last_run_at: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        last_backup_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        last_run_status: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

export type BackupScheduleAdd = InferCreate<typeof backupScheduleSchema>
export type BackupScheduleUpdate = InferUpdate<typeof backupScheduleSchema>
export type BackupScheduleListQuery = EntityQueryParams & {
    database_name?: string
}

export interface BackupScheduleListResponse {
    schedules: BackupSchedule[]
}

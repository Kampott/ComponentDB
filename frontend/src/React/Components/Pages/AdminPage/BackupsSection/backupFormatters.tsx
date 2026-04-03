import { Badge } from '@Components/ui/badge'
import type {
    Backup,
    BackupDatabase,
    BackupScheduleState,
    BackupStatus,
} from '@Schemas'

export const BACKUP_STATUS_LABELS: Record<BackupStatus, string> = {
    queued: 'В очереди',
    running: 'Выполняется',
    completed: 'Завершён',
    failed: 'Ошибка',
    cancelled: 'Отменён',
    deleting: 'Удаляется',
    verifying: 'Проверяется',
}

export const BACKUP_SCHEDULE_STATE_LABELS: Record<BackupScheduleState, string> =
    {
        active: 'Активно',
        paused: 'Пауза',
    }

export function getBackupStatusVariant(
    status: BackupStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'completed':
            return 'default'
        case 'failed':
        case 'cancelled':
            return 'destructive'
        case 'queued':
        case 'running':
            return 'secondary'
        case 'deleting':
        case 'verifying':
            return 'outline'
    }
}

export function renderBackupStatusBadge(status: BackupStatus) {
    return (
        <Badge variant={getBackupStatusVariant(status)}>
            {BACKUP_STATUS_LABELS[status]}
        </Badge>
    )
}

export function renderScheduleStateBadge(state: BackupScheduleState) {
    return (
        <Badge variant={state === 'active' ? 'default' : 'secondary'}>
            {BACKUP_SCHEDULE_STATE_LABELS[state]}
        </Badge>
    )
}

export function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date)
}

export function formatDuration(value?: number | null): string {
    if (value == null) {
        return '—'
    }

    if (value < 60) {
        return `${value} сек`
    }

    const hours = Math.floor(value / 3600)
    const minutes = Math.floor((value % 3600) / 60)
    const seconds = value % 60
    const parts = [
        hours > 0 ? `${hours} ч` : null,
        minutes > 0 ? `${minutes} мин` : null,
        seconds > 0 && hours === 0 ? `${seconds} сек` : null,
    ].filter((part): part is string => part !== null)

    return parts.join(' ')
}

export function formatBytes(value?: number | null): string {
    if (value == null) {
        return '—'
    }

    if (value === 0) {
        return '0 Б'
    }

    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
    let size = value
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex += 1
    }

    const maximumFractionDigits = size >= 10 || unitIndex === 0 ? 0 : 1

    return `${size.toLocaleString('ru-RU', {
        maximumFractionDigits,
    })} ${units[unitIndex]}`
}

export function getBackupSize(backup: Backup): string {
    if (backup.info?.kind === 'store' && backup.info.store_info) {
        return formatBytes(backup.info.store_info.size_bytes)
    }

    return '—'
}

export function getDatabaseSummary(database: BackupDatabase): string {
    return `${database.config.user}@${database.config.host}:${database.config.port}/${database.config.schema}`
}

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import { Badge } from '@Components/ui/badge'
import { backupSchema, type Backup } from '@Schemas'
import {
    formatDateTime,
    formatDuration,
    getBackupSize,
    renderBackupStatusBadge,
} from './backupFormatters.tsx'

export type BackupTableColumnId =
    | 'backup_id'
    | 'database_name'
    | 'template'
    | 'type'
    | 'status'
    | 'started_at'
    | 'duration'
    | 'size'

export function createBackupColumns(): readonly DataTableColumnSchema<
    Backup,
    typeof backupSchema,
    BackupTableColumnId
>[] {
    return [
        {
            id: 'backup_id',
            label: 'ID',
            queryField: 'backup_id',
            renderCell: backup => `#${backup.backup_id}`,
            getValue: backup => backup.backup_id,
            visibleByDefault: true,
            hideable: false,
            headerClassName: 'w-20',
            filter: {
                variant: 'number',
                operators: ['exact', 'in'],
                placeholder: 'ID',
            },
        },
        {
            id: 'database_name',
            label: 'База',
            queryField: 'database_name',
            renderCell: backup => backup.database_name,
            getValue: backup => backup.database_name,
            visibleByDefault: true,
            filter: {
                variant: 'text',
                operators: ['exact', 'like'],
                placeholder: 'Имя базы',
            },
        },
        {
            id: 'template',
            label: 'Шаблон',
            renderCell: backup => backup.backup_template?.name ?? '—',
            getValue: backup => backup.backup_template?.name ?? null,
            visibleByDefault: true,
        },
        {
            id: 'type',
            label: 'Тип',
            queryField: 'type',
            renderCell: backup => (
                <Badge variant='outline'>
                    {backup.backup_template?.type ?? '—'}
                </Badge>
            ),
            getValue: backup => backup.backup_template?.type ?? null,
            visibleByDefault: true,
            filter: {
                variant: 'text',
                operators: ['exact', 'in'],
                placeholder: 'full_physical',
            },
        },
        {
            id: 'status',
            label: 'Статус',
            queryField: 'status',
            renderCell: backup => renderBackupStatusBadge(backup.status),
            getValue: backup => backup.status,
            visibleByDefault: true,
            filter: {
                variant: 'text',
                operators: ['exact', 'in'],
                placeholder: 'completed',
            },
        },
        {
            id: 'started_at',
            label: 'Начат',
            queryField: 'started_at',
            renderCell: backup => formatDateTime(backup.started_at),
            getValue: backup =>
                backup.started_at ? new Date(backup.started_at) : null,
            getSortValue: backup =>
                backup.started_at ? new Date(backup.started_at) : null,
            visibleByDefault: true,
            filter: {
                variant: 'datetime-local',
                operators: ['gte', 'lte', 'gt', 'lt'],
            },
        },
        {
            id: 'duration',
            label: 'Длительность',
            renderCell: backup => formatDuration(backup.duration_seconds),
            getValue: backup => backup.duration_seconds ?? null,
            visibleByDefault: true,
        },
        {
            id: 'size',
            label: 'Размер',
            renderCell: backup => getBackupSize(backup),
            getValue: backup =>
                backup.info?.kind === 'store'
                    ? (backup.info.store_info?.size_bytes ?? null)
                    : null,
            visibleByDefault: true,
        },
    ]
}

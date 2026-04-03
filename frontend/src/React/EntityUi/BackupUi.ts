import { createElement } from 'react'

import KeyValueObjectView from '@Components/Common/Forms/KeyValueObjectView.tsx'
import { backupSchema, type BackupInfo, type BackupStatus } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

const STATUS_LABELS: Record<BackupStatus, string> = {
    queued: 'В очереди',
    running: 'Выполняется',
    completed: 'Завершён',
    failed: 'Ошибка',
    cancelled: 'Отменён',
    deleting: 'Удаляется',
    verifying: 'Проверяется',
}

function formatDateTime(value?: string | null): string {
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

function formatDuration(value?: number | null): string {
    if (value == null) {
        return '—'
    }

    if (value < 60) {
        return `${value} сек`
    }

    const hours = Math.floor(value / 3600)
    const minutes = Math.floor((value % 3600) / 60)
    const seconds = value % 60

    return [
        hours > 0 ? `${hours} ч` : null,
        minutes > 0 ? `${minutes} мин` : null,
        seconds > 0 && hours === 0 ? `${seconds} сек` : null,
    ]
        .filter((part): part is string => part !== null)
        .join(' ')
}

function normalizeBackupInfo(
    info?: BackupInfo | null,
): Record<string, unknown> | null {
    if (!info) {
        return null
    }

    switch (info.kind) {
        case 'store':
            return {
                kind: 'store',
                ...info.store_info,
            }
        case 'active':
            return {
                kind: 'active',
                ...info.active_info,
            }
        case 'error':
            return {
                kind: 'error',
                ...info.error_info,
            }
    }
}

export const backupUiSchema = defineEntityUiSchema<typeof backupSchema>()({
    entity: 'Backup',
    fields: {
        backup_id: {
            common: {
                label: 'ID',
                description: 'Идентификатор бэкапа',
            },
            create: { visible: false },
            update: { visible: false },
            form: { input: 'number' },
        },
        database_name: {
            common: {
                label: 'База данных',
                description: 'Имя базы данных',
            },
            form: { input: 'text' },
        },
        backup_template: {
            common: {
                label: 'Шаблон',
                description: 'Шаблон, использованный для запуска бэкапа',
            },
            read: {
                printValue: value => {
                    if (!value) {
                        return '—'
                    }

                    return createElement(KeyValueObjectView, {
                        value: {
                            template_id: value.template_id,
                            name: value.name,
                            description: value.description,
                            type: value.type,
                            include_wal: value.include_wal,
                            checkpoint_timeout: value.checkpoint_timeout,
                        },
                    })
                },
            },
            form: { input: 'text' },
        },
        status: {
            common: {
                label: 'Статус',
                description: 'Текущее состояние бэкапа',
            },
            read: {
                printValue: value => STATUS_LABELS[value] ?? value,
            },
            form: { input: 'text' },
        },
        info: {
            common: {
                label: 'Техническая информация',
                description: 'Служебные данные о результате или ходе бэкапа',
            },
            read: {
                printValue: value =>
                    createElement(KeyValueObjectView, {
                        value: normalizeBackupInfo(value),
                    }),
            },
            form: { input: 'text' },
        },
        started_at: {
            common: {
                label: 'Начат',
                description: 'Время запуска бэкапа',
            },
            read: {
                printValue: value => formatDateTime(value),
            },
            form: { input: 'text' },
        },
        finished_at: {
            common: {
                label: 'Завершён',
                description: 'Время завершения бэкапа',
            },
            read: {
                printValue: value => formatDateTime(value),
            },
            form: { input: 'text' },
        },
        duration_seconds: {
            common: {
                label: 'Длительность',
                description: 'Продолжительность выполнения',
            },
            read: {
                printValue: value => formatDuration(value),
            },
            form: { input: 'number' },
        },
        pg_version_num: {
            common: {
                label: 'PostgreSQL version',
                description: 'Числовая версия PostgreSQL',
            },
            form: { input: 'number' },
        },
        parent_backup_id: {
            common: {
                label: 'Родительский бэкап',
                description: 'Идентификатор родительского бэкапа',
            },
            read: {
                printValue: value => value ?? '—',
            },
            form: { input: 'number' },
        },
    },
})

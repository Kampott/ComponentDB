import type { MouseEvent } from 'react'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import type { DataTableStateResult } from '@/lib/useDataTableState.ts'
import CompactDataTableToolbar from '@Components/Common/CompactDataTableToolbar.tsx'
import DataTable from '@Components/Common/DataTable.tsx'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import { backupSchema, type Backup } from '@Schemas'
import type { BackupTableColumnId } from './backupColumns.tsx'

interface Props {
    tableState: DataTableStateResult<typeof backupSchema, BackupTableColumnId>
    columns: readonly DataTableColumnSchema<
        Backup,
        typeof backupSchema,
        BackupTableColumnId
    >[]
    backups: Backup[] | null
    isRefreshing: boolean
    onRefresh: () => void
    onViewBackup: (backup: Backup) => void
    onRowContextMenu?: (event: MouseEvent<HTMLElement>, backup: Backup) => void
}

function BackupsTableCard({
    tableState,
    columns,
    backups,
    isRefreshing,
    onRefresh,
    onViewBackup,
    onRowContextMenu,
}: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Последние бэкапы</CardTitle>
                <CardDescription>
                    Таблица построена на стандартных table-компонентах проекта.
                </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <CompactDataTableToolbar
                    state={tableState}
                    columns={columns}
                    actions={
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={onRefresh}
                            disabled={isRefreshing}
                        >
                            Обновить
                        </Button>
                    }
                />

                <DataTable
                    state={tableState}
                    columns={columns}
                    rows={backups ?? []}
                    getRowId={backup => backup.backup_id}
                    emptyMessage='Бэкапов пока нет'
                    tableClassName='table-fixed'
                    onRowClick={onViewBackup}
                    onRowContextMenu={onRowContextMenu}
                    rowClassName='cursor-pointer'
                />
            </CardContent>
        </Card>
    )
}

export default BackupsTableCard

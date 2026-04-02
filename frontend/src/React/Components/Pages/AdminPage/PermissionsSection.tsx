import { Plus } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import { useDataTableState } from '@/lib/useDataTableState.ts'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import DataTable from '@Components/Common/DataTable.tsx'
import DataTableFilters from '@Components/Common/DataTableFilters.tsx'
import DataTableToolbar from '@Components/Common/DataTableToolbar.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import { permissionUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    permissionSchema,
    userCanManagePermissions,
    type Permission,
    type PermissionAdd,
    type PermissionUpdate,
} from '@Schemas'
import {
    useContextMenuStore,
    useServicesStore,
    useUserStore,
} from '@StorageImpl'

interface PermissionTableRow {
    permission: Permission
}

type PermissionTableColumnId = 'id' | 'name' | 'description'

const PERMISSION_TABLE_QUERY_LABELS = {
    id: 'ID',
    name: 'Код',
} satisfies Partial<Record<keyof typeof permissionSchema.query, string>>

function PermissionsSection() {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const user = useUserStore(state => state.user)
    const canManageRecords = userCanManagePermissions(user)

    const [permissions, setPermissions] = useState<Permission[] | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [editTarget, setEditTarget] = useState<Permission | null>(null)
    const [viewTarget, setViewTarget] = useState<Permission | null>(null)

    const columns: readonly DataTableColumnSchema<
        PermissionTableRow,
        typeof permissionSchema,
        PermissionTableColumnId
    >[] = useMemo(
        () => [
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: row => `#${row.permission.id}`,
                getValue: row => row.permission.id,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-16',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID',
                },
            },
            {
                id: 'name',
                label: 'Код',
                queryField: 'name',
                renderCell: row => row.permission.name,
                getValue: row => row.permission.name,
                visibleByDefault: true,
                headerClassName: 'w-1/3',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like'],
                    placeholder: 'Код права',
                },
            },
            {
                id: 'description',
                label: 'Описание',
                renderCell: row => row.permission.description || '—',
                getValue: row => row.permission.description,
                visibleByDefault: true,
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: permissionSchema,
        columns,
        defaultPageSize: 20,
    })

    const loadPermissions = useCallback(async () => {
        setPermissions(null)
        try {
            setPermissions(
                await services.permissionsService.list(tableState.query),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, services.permissionsService, tableState.query])

    useEffect(() => {
        loadPermissions()
    }, [loadPermissions])

    const rows = useMemo<PermissionTableRow[]>(
        () => (permissions ?? []).map(permission => ({ permission })),
        [permissions],
    )

    async function handleCreate(data: PermissionAdd | null) {
        setShowAddForm(false)
        if (!data) return
        try {
            await services.permissionsService.create(data)
            await loadPermissions()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleUpdate(data: PermissionUpdate | null) {
        if (!editTarget || !data) {
            setEditTarget(null)
            return
        }
        try {
            await services.permissionsService.update(editTarget.id, data)
            setEditTarget(null)
            await loadPermissions()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleDelete(permission: Permission) {
        try {
            await services.permissionsService.delete(permission.id)
            if (viewTarget?.id === permission.id) {
                setViewTarget(null)
            }
            await loadPermissions()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    const { onContextMenuCall } = useContextMenuStore()
    const contextMenuOptions = buildContextMenuOptions<Permission>({
        onViewRequest: permission => setViewTarget(permission),
        onChangeRequest: canManageRecords
            ? permission => setEditTarget(permission)
            : undefined,
        onDeleteRequest: canManageRecords ? handleDelete : undefined,
    })
    const isContextMenuEnabled = hasContextMenuActions(contextMenuOptions)

    function handleContextMenu(
        event: MouseEvent<HTMLElement>,
        permission: Permission,
    ) {
        if (!isContextMenuEnabled) return

        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            permission,
            contextMenuOptions,
        )
    }

    return (
        <>
            <LoadEffect
                data={permissions ? rows : null}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <div className='space-y-4'>
                    <DataTableToolbar
                        state={tableState}
                        queryLabels={PERMISSION_TABLE_QUERY_LABELS}
                        searchPlaceholder='Поиск по правам'
                        actions={
                            canManageRecords ? (
                                <ToolbarActionButton
                                    type='button'
                                    variant='default'
                                    icon={<Plus />}
                                    label='Добавить'
                                    aria-label='Добавить право доступа'
                                    onClick={() => setShowAddForm(true)}
                                />
                            ) : undefined
                        }
                    />
                    <DataTableFilters state={tableState} columns={columns} />

                    <DataTable
                        state={tableState}
                        columns={columns}
                        rows={rows}
                        processingMode='manual'
                        getRowId={row => row.permission.id}
                        emptyMessage='Прав доступа пока нет'
                        tableClassName='table-fixed'
                        onRowClick={row => setViewTarget(row.permission)}
                        onRowContextMenu={(event, row) =>
                            handleContextMenu(event, row.permission)
                        }
                    />
                </div>
            </LoadEffect>

            {viewTarget && (
                <ViewEntityModal
                    uiSchema={permissionUiSchema}
                    context={{}}
                    source={viewTarget}
                    title={`Право доступа: ${viewTarget.name}`}
                    onClose={() => setViewTarget(null)}
                />
            )}

            {showAddForm && canManageRecords && (
                <AddEntityForm
                    schema={permissionSchema}
                    uiSchema={permissionUiSchema}
                    context={{}}
                    title='Добавление права доступа'
                    submitCallback={handleCreate}
                />
            )}

            {editTarget && canManageRecords && (
                <EditEntityForm
                    schema={permissionSchema}
                    uiSchema={permissionUiSchema}
                    context={{}}
                    source={editTarget}
                    title={`Редактирование: ${editTarget.name}`}
                    submitCallback={handleUpdate}
                />
            )}
        </>
    )
}

export default PermissionsSection

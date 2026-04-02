import { Plus, ShieldPlus, Trash2 } from 'lucide-react'
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
import { Badge } from '@Components/ui/badge'
import { Button } from '@Components/ui/button'
import { roleUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    roleSchema,
    userCanManagePermissions,
    userCanManageRoles,
    type Permission,
    type Role,
    type RoleAdd,
    type RoleUpdate,
} from '@Schemas'
import {
    useContextMenuStore,
    useServicesStore,
    useUserStore,
} from '@StorageImpl'
import AssignDialog from './AssignDialog.tsx'

interface RoleTableRow {
    role: Role
    permissions: Permission[]
}

type RoleTableColumnId = 'id' | 'name' | 'description' | 'permissions'

const ROLE_TABLE_QUERY_LABELS = {
    id: 'ID',
    name: 'Название',
} satisfies Partial<Record<keyof typeof roleSchema.query, string>>

function RolesSection() {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const user = useUserStore(state => state.user)
    const canManageRoleRecords = userCanManageRoles(user)
    const canManageRolePermissions = userCanManagePermissions(user)

    const [roles, setRoles] = useState<Role[] | null>(null)
    const [allPermissions, setAllPermissions] = useState<Permission[]>([])
    const [rolePermsMap, setRolePermsMap] = useState<Map<number, Permission[]>>(
        new Map(),
    )
    const [showAddForm, setShowAddForm] = useState(false)
    const [editTarget, setEditTarget] = useState<Role | null>(null)
    const [viewTarget, setViewTarget] = useState<Role | null>(null)
    const [assignPermTarget, setAssignPermTarget] = useState<Role | null>(null)

    const columns: readonly DataTableColumnSchema<
        RoleTableRow,
        typeof roleSchema,
        RoleTableColumnId
    >[] = useMemo(
        () => [
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: row => `#${row.role.id}`,
                getValue: row => row.role.id,
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
                label: 'Название',
                queryField: 'name',
                renderCell: row => row.role.name,
                getValue: row => row.role.name,
                visibleByDefault: true,
                headerClassName: 'w-1/4',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like'],
                    placeholder: 'Название',
                },
            },
            {
                id: 'description',
                label: 'Описание',
                renderCell: row => row.role.description || '—',
                getValue: row => row.role.description,
                visibleByDefault: true,
                headerClassName: 'w-1/3',
            },
            {
                id: 'permissions',
                label: 'Права доступа',
                renderCell: row => (
                    <div className='flex flex-wrap gap-1'>
                        {row.permissions.map(perm => (
                            <Badge key={perm.id} variant='outline'>
                                {perm.name}
                            </Badge>
                        ))}
                        {row.permissions.length === 0 && (
                            <span className='text-muted-foreground text-xs'>
                                Нет прав
                            </span>
                        )}
                    </div>
                ),
                getValue: row => row.permissions.map(p => p.name).join(', '),
                visibleByDefault: true,
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: roleSchema,
        columns,
        defaultPageSize: 20,
    })

    const loadPermissions = useCallback(async () => {
        if (!canManageRolePermissions) {
            setAllPermissions([])
            return
        }

        try {
            setAllPermissions(await services.permissionsService.list())
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [canManageRolePermissions, navigate, services.permissionsService])

    const loadRoles = useCallback(async () => {
        setRoles(null)
        try {
            const rolesResp = await services.rolesService.list(tableState.query)
            setRoles(rolesResp)

            const permsMap = new Map<number, Permission[]>()
            await Promise.all(
                rolesResp.map(async role => {
                    try {
                        const perms =
                            await services.rolesService.getRolePermissions(
                                role.id,
                            )
                        permsMap.set(role.id, perms)
                    } catch {
                        permsMap.set(role.id, [])
                    }
                }),
            )
            setRolePermsMap(permsMap)
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, services.rolesService, tableState.query])

    useEffect(() => {
        loadPermissions()
    }, [loadPermissions])

    useEffect(() => {
        loadRoles()
    }, [loadRoles])

    const rows = useMemo<RoleTableRow[]>(
        () =>
            (roles ?? []).map(role => ({
                role,
                permissions: rolePermsMap.get(role.id) ?? [],
            })),
        [roles, rolePermsMap],
    )

    async function handleCreate(data: RoleAdd | null) {
        setShowAddForm(false)
        if (!data) return
        try {
            await services.rolesService.create(data)
            await loadRoles()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleUpdate(data: RoleUpdate | null) {
        if (!editTarget || !data) {
            setEditTarget(null)
            return
        }
        try {
            await services.rolesService.update(editTarget.id, data)
            setEditTarget(null)
            await loadRoles()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleDelete(role: Role) {
        try {
            await services.rolesService.delete(role.id)
            await loadRoles()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    const { onContextMenuCall } = useContextMenuStore()

    const contextMenuOptions = buildContextMenuOptions<Role>({
        onViewRequest: role => setViewTarget(role),
        onChangeRequest: canManageRoleRecords
            ? role => setEditTarget(role)
            : undefined,
        onDeleteRequest: canManageRoleRecords ? handleDelete : undefined,
    })
    const isContextMenuEnabled = hasContextMenuActions(contextMenuOptions)

    function handleContextMenu(e: MouseEvent<HTMLElement>, role: Role) {
        if (!isContextMenuEnabled) return
        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            role,
            contextMenuOptions,
        )
    }

    async function handleAssignPermission(permissionId: number) {
        if (!assignPermTarget) return
        try {
            await services.rolesService.assignPermission({
                role_id: assignPermTarget.id,
                permission_id: permissionId,
            })
            setAssignPermTarget(null)
            await loadRoles()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleRemovePermission(
        roleId: number,
        permissionId: number,
    ) {
        try {
            await services.rolesService.removePermission(roleId, permissionId)
            await loadRoles()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    return (
        <>
            <LoadEffect
                data={roles ? rows : null}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <div className='space-y-4'>
                    <DataTableToolbar
                        state={tableState}
                        queryLabels={ROLE_TABLE_QUERY_LABELS}
                        searchPlaceholder='Поиск по ролям'
                        actions={
                            canManageRoleRecords ? (
                                <ToolbarActionButton
                                    type='button'
                                    variant='default'
                                    icon={<Plus />}
                                    label='Добавить'
                                    aria-label='Добавить роль'
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
                        getRowId={row => row.role.id}
                        emptyMessage='Ролей пока нет'
                        tableClassName='table-fixed'
                        onRowClick={row => setViewTarget(row.role)}
                        onRowContextMenu={(event, row) =>
                            handleContextMenu(event, row.role)
                        }
                    />
                </div>
            </LoadEffect>

            {viewTarget && (
                <ViewEntityModal
                    uiSchema={roleUiSchema}
                    context={{}}
                    source={viewTarget}
                    title={`Роль: ${viewTarget.name}`}
                    onClose={() => setViewTarget(null)}
                >
                    <div className='mt-4 space-y-3'>
                        <div className='flex items-center justify-between'>
                            <h4 className='text-sm font-medium'>
                                Права доступа
                            </h4>
                            <Button
                                size='sm'
                                variant='outline'
                                disabled={!canManageRolePermissions}
                                onClick={() => {
                                    setViewTarget(null)
                                    setAssignPermTarget(viewTarget)
                                }}
                            >
                                <ShieldPlus className='mr-1 size-4' />
                                Назначить право
                            </Button>
                        </div>
                        <div className='space-y-2'>
                            {(rolePermsMap.get(viewTarget.id) ?? []).map(
                                perm => (
                                    <div
                                        key={perm.id}
                                        className='flex items-center justify-between rounded border px-3 py-2'
                                    >
                                        <div>
                                            <span className='text-sm font-medium'>
                                                {perm.name}
                                            </span>
                                            {perm.description && (
                                                <p className='text-muted-foreground text-xs'>
                                                    {perm.description}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            size='icon'
                                            variant='ghost'
                                            className='size-7'
                                            disabled={!canManageRolePermissions}
                                            onClick={() =>
                                                handleRemovePermission(
                                                    viewTarget.id,
                                                    perm.id,
                                                )
                                            }
                                        >
                                            <Trash2 className='size-4 text-red-500' />
                                        </Button>
                                    </div>
                                ),
                            )}
                            {(rolePermsMap.get(viewTarget.id) ?? []).length ===
                                0 && (
                                <p className='text-muted-foreground text-sm'>
                                    Нет назначенных прав
                                </p>
                            )}
                        </div>
                    </div>
                </ViewEntityModal>
            )}

            {showAddForm && canManageRoleRecords && (
                <AddEntityForm
                    schema={roleSchema}
                    uiSchema={roleUiSchema}
                    context={{}}
                    title='Добавление роли'
                    submitCallback={handleCreate}
                />
            )}

            {editTarget && canManageRoleRecords && (
                <EditEntityForm
                    schema={roleSchema}
                    uiSchema={roleUiSchema}
                    context={{}}
                    source={editTarget}
                    title={`Редактирование роли: ${editTarget.name}`}
                    submitCallback={handleUpdate}
                />
            )}

            <AssignDialog
                open={assignPermTarget !== null && canManageRolePermissions}
                onOpenChange={open => {
                    if (!open) setAssignPermTarget(null)
                }}
                title={`Назначить право — ${assignPermTarget?.name ?? ''}`}
                options={allPermissions.map(p => ({
                    id: p.id,
                    label: `${p.name}${p.description ? ` (${p.description})` : ''}`,
                }))}
                excludeIds={(
                    rolePermsMap.get(assignPermTarget?.id ?? -1) ?? []
                ).map(p => p.id)}
                onAssign={handleAssignPermission}
            />
        </>
    )
}

export default RolesSection

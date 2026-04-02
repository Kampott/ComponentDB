import { Plus, Trash2, UserPlus } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import { Input } from '@Components/ui/input'
import { Label } from '@Components/ui/label'
import { adminUserUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    adminUserSchema,
    type AdminUser,
    type AdminUserAdd,
    type AdminUserUpdate,
    type Role,
} from '@Schemas'
import { useContextMenuStore, useServicesStore } from '@StorageImpl'
import AssignDialog from './AssignDialog.tsx'

interface UserTableRow {
    user: AdminUser
    roles: Role[]
}

type UserTableColumnId = 'id' | 'email' | 'is_active' | 'roles'
type RegisterFormErrors = Partial<
    Record<'email' | 'password' | 'passwordConfirmation', string>
>

const USER_TABLE_QUERY_LABELS = {
    id: 'ID',
    email: 'Email',
} satisfies Partial<Record<keyof typeof adminUserSchema.query, string>>

function UsersSection() {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const supportsUsersCrud = services.features.adminUsersCrud

    const [users, setUsers] = useState<AdminUser[] | null>(null)
    const [allRoles, setAllRoles] = useState<Role[]>([])
    const [userRolesMap, setUserRolesMap] = useState<Map<number, Role[]>>(
        new Map(),
    )
    const [showAddForm, setShowAddForm] = useState(false)
    const [showRegisterDialog, setShowRegisterDialog] = useState(false)
    const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
    const [viewTarget, setViewTarget] = useState<AdminUser | null>(null)
    const [assignRoleTarget, setAssignRoleTarget] = useState<AdminUser | null>(
        null,
    )
    const [registerEmail, setRegisterEmail] = useState('')
    const [registerPassword, setRegisterPassword] = useState('')
    const [registerPasswordConfirmation, setRegisterPasswordConfirmation] =
        useState('')
    const [registerErrors, setRegisterErrors] = useState<RegisterFormErrors>({})
    const [registerGlobalError, setRegisterGlobalError] = useState<
        string | null
    >(null)
    const [isRegistering, setIsRegistering] = useState(false)

    const columns: readonly DataTableColumnSchema<
        UserTableRow,
        typeof adminUserSchema,
        UserTableColumnId
    >[] = useMemo(
        () => [
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: row => `#${row.user.id}`,
                getValue: row => row.user.id,
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
                id: 'email',
                label: 'Email',
                queryField: 'email',
                renderCell: row => row.user.email,
                getValue: row => row.user.email,
                visibleByDefault: true,
                headerClassName: 'w-1/4',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like'],
                    placeholder: 'Email',
                },
            },
            {
                id: 'is_active',
                label: 'Статус',
                renderCell: row => (
                    <Badge
                        variant={row.user.is_active ? 'default' : 'secondary'}
                    >
                        {row.user.is_active ? 'Активен' : 'Неактивен'}
                    </Badge>
                ),
                getValue: row => row.user.is_active,
                visibleByDefault: true,
                headerClassName: 'w-28',
            },
            {
                id: 'roles',
                label: 'Роли',
                renderCell: row => (
                    <div className='flex flex-wrap gap-1'>
                        {row.roles.map(role => (
                            <Badge key={role.id} variant='outline'>
                                {role.name}
                            </Badge>
                        ))}
                        {row.roles.length === 0 && (
                            <span className='text-muted-foreground text-xs'>
                                Нет ролей
                            </span>
                        )}
                    </div>
                ),
                getValue: row => row.roles.map(r => r.name).join(', '),
                visibleByDefault: true,
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: adminUserSchema,
        columns,
        defaultPageSize: 20,
    })

    const loadRoles = useCallback(async () => {
        try {
            setAllRoles(await services.rolesService.list())
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, services.rolesService])

    const loadUsers = useCallback(async () => {
        setUsers(null)
        try {
            const usersResp = await services.adminUsersService.list(
                tableState.query,
            )
            setUsers(usersResp)

            const rolesMap = new Map<number, Role[]>()
            await Promise.all(
                usersResp.map(async user => {
                    try {
                        const roles =
                            await services.adminUsersService.getUserRoles(
                                user.id,
                            )
                        rolesMap.set(user.id, roles)
                    } catch {
                        rolesMap.set(user.id, [])
                    }
                }),
            )
            setUserRolesMap(rolesMap)
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, services.adminUsersService, tableState.query])

    useEffect(() => {
        if (!supportsUsersCrud) {
            return
        }

        loadRoles()
    }, [loadRoles, supportsUsersCrud])

    useEffect(() => {
        if (!supportsUsersCrud) {
            return
        }

        loadUsers()
    }, [loadUsers, supportsUsersCrud])

    const rows = useMemo<UserTableRow[]>(
        () =>
            (users ?? []).map(user => ({
                user,
                roles: userRolesMap.get(user.id) ?? [],
            })),
        [users, userRolesMap],
    )

    async function handleCreate(data: AdminUserAdd | null) {
        setShowAddForm(false)
        if (!data) return
        try {
            await services.adminUsersService.create(data)
            await loadUsers()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleUpdate(data: AdminUserUpdate | null) {
        if (!editTarget || !data) {
            setEditTarget(null)
            return
        }
        try {
            await services.adminUsersService.update(editTarget.id, data)
            setEditTarget(null)
            await loadUsers()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleDelete(user: AdminUser) {
        try {
            await services.adminUsersService.delete(user.id)
            await loadUsers()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    function resetRegisterForm() {
        setRegisterEmail('')
        setRegisterPassword('')
        setRegisterPasswordConfirmation('')
        setRegisterErrors({})
        setRegisterGlobalError(null)
    }

    function handleRegisterDialogChange(open: boolean) {
        setShowRegisterDialog(open)
        if (!open) {
            resetRegisterForm()
        }
    }

    function validateRegisterForm(): boolean {
        const nextErrors: RegisterFormErrors = {}

        if (!registerEmail.trim()) {
            nextErrors.email = 'Email не может быть пустым'
        }

        if (!registerPassword) {
            nextErrors.password = 'Пароль не может быть пустым'
        } else if (registerPassword.length < 4) {
            nextErrors.password = 'Пароль должен быть не короче 4 символов'
        }

        if (!registerPasswordConfirmation) {
            nextErrors.passwordConfirmation =
                'Подтверждение пароля не может быть пустым'
        } else if (registerPassword !== registerPasswordConfirmation) {
            nextErrors.passwordConfirmation = 'Пароли не совпадают'
        }

        setRegisterErrors(nextErrors)
        setRegisterGlobalError(null)

        return Object.keys(nextErrors).length === 0
    }

    async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!validateRegisterForm()) {
            return
        }

        setIsRegistering(true)
        setRegisterGlobalError(null)

        try {
            await services.authService.register({
                email: registerEmail.trim(),
                password: registerPassword,
            })
            handleRegisterDialogChange(false)
            alert(`Пользователь ${registerEmail.trim()} зарегистрирован`)
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setGlobalError: setRegisterGlobalError,
            })
        } finally {
            setIsRegistering(false)
        }
    }

    const { onContextMenuCall } = useContextMenuStore()

    const contextMenuOptions = buildContextMenuOptions<AdminUser>({
        onViewRequest: user => setViewTarget(user),
        onChangeRequest: user => setEditTarget(user),
        onDeleteRequest: handleDelete,
    })
    const isContextMenuEnabled = hasContextMenuActions(contextMenuOptions)

    function handleContextMenu(e: MouseEvent<HTMLElement>, user: AdminUser) {
        if (!isContextMenuEnabled) return
        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            user,
            contextMenuOptions,
        )
    }

    async function handleAssignRole(roleId: number) {
        if (!assignRoleTarget) return
        try {
            await services.adminUsersService.assignRole({
                user_id: assignRoleTarget.id,
                role_id: roleId,
            })
            setAssignRoleTarget(null)
            await loadUsers()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleRemoveRole(userId: number, roleId: number) {
        try {
            await services.adminUsersService.removeRole(userId, roleId)
            await loadUsers()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    if (!supportsUsersCrud) {
        return (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle>Регистрация пользователей</CardTitle>
                        <CardDescription>
                            Backend в REST-режиме не отдает полноценный список
                            пользователей, но позволяет регистрировать новых
                            пользователей через `auth/register`.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                            <p className='text-muted-foreground text-sm'>
                                После регистрации роли и дополнительные доступы
                                при необходимости назначаются отдельно.
                            </p>
                            <ToolbarActionButton
                                type='button'
                                variant='default'
                                icon={<Plus />}
                                label='Зарегистрировать'
                                aria-label='Зарегистрировать пользователя'
                                onClick={() => handleRegisterDialogChange(true)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Dialog
                    open={showRegisterDialog}
                    onOpenChange={handleRegisterDialogChange}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Регистрация пользователя</DialogTitle>
                            <DialogDescription>
                                Создаёт нового пользователя через `POST
                                /auth/register`.
                            </DialogDescription>
                        </DialogHeader>

                        <form
                            className='space-y-4'
                            onSubmit={handleRegisterSubmit}
                        >
                            <div className='space-y-2'>
                                <Label htmlFor='register-user-email'>
                                    Email
                                </Label>
                                <Input
                                    id='register-user-email'
                                    type='email'
                                    value={registerEmail}
                                    onChange={event =>
                                        setRegisterEmail(event.target.value)
                                    }
                                    placeholder='user@example.com'
                                    autoComplete='email'
                                />
                                {registerErrors.email && (
                                    <p className='text-sm text-red-500'>
                                        {registerErrors.email}
                                    </p>
                                )}
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='register-user-password'>
                                    Пароль
                                </Label>
                                <Input
                                    id='register-user-password'
                                    type='password'
                                    value={registerPassword}
                                    onChange={event =>
                                        setRegisterPassword(event.target.value)
                                    }
                                    autoComplete='new-password'
                                />
                                {registerErrors.password && (
                                    <p className='text-sm text-red-500'>
                                        {registerErrors.password}
                                    </p>
                                )}
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='register-user-password-confirm'>
                                    Подтверждение пароля
                                </Label>
                                <Input
                                    id='register-user-password-confirm'
                                    type='password'
                                    value={registerPasswordConfirmation}
                                    onChange={event =>
                                        setRegisterPasswordConfirmation(
                                            event.target.value,
                                        )
                                    }
                                    autoComplete='new-password'
                                />
                                {registerErrors.passwordConfirmation && (
                                    <p className='text-sm text-red-500'>
                                        {registerErrors.passwordConfirmation}
                                    </p>
                                )}
                            </div>

                            {registerGlobalError && (
                                <p className='text-sm text-red-500'>
                                    {registerGlobalError}
                                </p>
                            )}

                            <DialogFooter>
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() =>
                                        handleRegisterDialogChange(false)
                                    }
                                >
                                    Отмена
                                </Button>
                                <Button type='submit' disabled={isRegistering}>
                                    {isRegistering
                                        ? 'Регистрация...'
                                        : 'Зарегистрировать'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <>
            <LoadEffect
                data={users ? rows : null}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <div className='space-y-4'>
                    <DataTableToolbar
                        state={tableState}
                        queryLabels={USER_TABLE_QUERY_LABELS}
                        searchPlaceholder='Поиск по пользователям'
                        actions={
                            <ToolbarActionButton
                                type='button'
                                variant='default'
                                icon={<Plus />}
                                label='Добавить'
                                aria-label='Добавить пользователя'
                                onClick={() => setShowAddForm(true)}
                            />
                        }
                    />
                    <DataTableFilters state={tableState} columns={columns} />

                    <DataTable
                        state={tableState}
                        columns={columns}
                        rows={rows}
                        processingMode='manual'
                        getRowId={row => row.user.id}
                        emptyMessage='Пользователей пока нет'
                        tableClassName='table-fixed'
                        onRowClick={row => setViewTarget(row.user)}
                        onRowContextMenu={(event, row) =>
                            handleContextMenu(event, row.user)
                        }
                    />
                </div>
            </LoadEffect>

            {viewTarget && (
                <ViewEntityModal
                    uiSchema={adminUserUiSchema}
                    context={{}}
                    source={viewTarget}
                    title={`Пользователь #${viewTarget.id}`}
                    onClose={() => setViewTarget(null)}
                >
                    <div className='mt-4 space-y-3'>
                        <div className='flex items-center justify-between'>
                            <h4 className='text-sm font-medium'>Роли</h4>
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                    setViewTarget(null)
                                    setAssignRoleTarget(viewTarget)
                                }}
                            >
                                <UserPlus className='mr-1 size-4' />
                                Назначить роль
                            </Button>
                        </div>
                        <div className='space-y-2'>
                            {(userRolesMap.get(viewTarget.id) ?? []).map(
                                role => (
                                    <div
                                        key={role.id}
                                        className='flex items-center justify-between rounded border px-3 py-2'
                                    >
                                        <span className='text-sm'>
                                            {role.name}
                                        </span>
                                        <Button
                                            size='icon'
                                            variant='ghost'
                                            className='size-7'
                                            onClick={() =>
                                                handleRemoveRole(
                                                    viewTarget.id,
                                                    role.id,
                                                )
                                            }
                                        >
                                            <Trash2 className='size-4 text-red-500' />
                                        </Button>
                                    </div>
                                ),
                            )}
                            {(userRolesMap.get(viewTarget.id) ?? []).length ===
                                0 && (
                                <p className='text-muted-foreground text-sm'>
                                    Нет назначенных ролей
                                </p>
                            )}
                        </div>
                    </div>
                </ViewEntityModal>
            )}

            {showAddForm && (
                <AddEntityForm
                    schema={adminUserSchema}
                    uiSchema={adminUserUiSchema}
                    context={{}}
                    title='Добавление пользователя'
                    submitCallback={handleCreate}
                />
            )}

            {editTarget && (
                <EditEntityForm
                    schema={adminUserSchema}
                    uiSchema={adminUserUiSchema}
                    context={{}}
                    source={editTarget}
                    title={`Редактирование пользователя #${editTarget.id}`}
                    submitCallback={handleUpdate}
                />
            )}

            <AssignDialog
                open={assignRoleTarget !== null}
                onOpenChange={open => {
                    if (!open) setAssignRoleTarget(null)
                }}
                title={`Назначить роль — ${assignRoleTarget?.email ?? ''}`}
                options={allRoles.map(r => ({ id: r.id, label: r.name }))}
                excludeIds={(
                    userRolesMap.get(assignRoleTarget?.id ?? -1) ?? []
                ).map(r => r.id)}
                onAssign={handleAssignRole}
            />
        </>
    )
}

export default UsersSection

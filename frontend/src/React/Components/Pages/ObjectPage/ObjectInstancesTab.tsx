import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react'

import { useNavigate } from 'react-router-dom'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import { useDataTableState } from '@/lib/useDataTableState.ts'
import CompactDataTableToolbar from '@Components/Common/CompactDataTableToolbar.tsx'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import DataTable from '@Components/Common/DataTable.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import TruncatedText from '@Components/Common/TruncatedText.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import { objectInstanceUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    objectInstanceSchema,
    type Object,
    type ObjectInstance,
    type ObjectInstanceUpdate,
} from '@Schemas'
import {
    useContextMenuStore,
    useServicesStore,
    useToastStore,
} from '@StorageImpl'

interface Props {
    object: Object
}

type ObjectInstancesColumnId = 'name' | 'id' | 'parentId' | 'isActive'

function ObjectInstancesTab({ object }: Props): ReactNode {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()
    const addToast = useToastStore(state => state.addToast)

    const [objectInstances, setObjectInstances] = useState<
        ObjectInstance[] | null
    >(null)
    const [editTargetInstance, setEditTargetInstance] =
        useState<ObjectInstance | null>(null)
    const [viewTargetInstance, setViewTargetInstance] =
        useState<ObjectInstance | null>(null)

    const columns = useMemo(
        (): readonly DataTableColumnSchema<
            ObjectInstance,
            typeof objectInstanceSchema,
            ObjectInstancesColumnId
        >[] => [
            {
                id: 'name',
                label: 'Название',
                queryField: 'name',
                renderCell: instance => (
                    <TruncatedText text={instance.name} maxLength={56} />
                ),
                getValue: instance => instance.name,
                getSortValue: instance => instance.name,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-[40%]',
                cellClassName: 'overflow-hidden',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like', 'in'],
                    placeholder: 'Название экземпляра',
                },
            },
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: instance => `#${instance.id}`,
                getValue: instance => instance.id,
                getSortValue: instance => instance.id,
                visibleByDefault: true,
                headerClassName: 'w-[15%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in', 'gte', 'lte'],
                    placeholder: 'Например: 15 или 1,2,3',
                },
            },
            {
                id: 'parentId',
                label: 'Родитель',
                queryField: 'parent_id',
                renderCell: instance =>
                    instance.parent_id === null
                        ? '—'
                        : `#${instance.parent_id}`,
                getValue: instance => instance.parent_id,
                visibleByDefault: true,
                headerClassName: 'w-[20%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID родителя',
                },
            },
            {
                id: 'isActive',
                label: 'Активен',
                queryField: 'is_active',
                renderCell: instance => (instance.is_active ? 'Да' : 'Нет'),
                getValue: instance => instance.is_active,
                visibleByDefault: true,
                headerClassName: 'w-[25%]',
                filter: {
                    variant: 'boolean',
                    operators: ['exact'],
                    trueLabel: 'Да',
                    falseLabel: 'Нет',
                },
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: objectInstanceSchema,
        columns,
        defaultPageSize: 10,
        pageSizeOptions: [10, 20, 50, 'all'],
        defaultSorting: {
            field: 'name',
            direction: 'asc',
        },
    })

    const instancesQuery = useMemo(
        () => ({
            ...tableState.query,
            object_id: object.id,
        }),
        [object.id, tableState.query],
    )

    const loadInstances = useCallback(async () => {
        setObjectInstances(null)

        try {
            setObjectInstances(
                await services.objectsInstancesService.list(instancesQuery),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [instancesQuery, navigate, services.objectsInstancesService])

    useEffect(() => {
        void loadInstances()
    }, [loadInstances])

    async function handleUpdateInstance(
        data: ObjectInstanceUpdate | null,
    ): Promise<void> {
        if (!editTargetInstance || !data) {
            setEditTargetInstance(null)
            return
        }

        try {
            await services.objectsInstancesService.update(
                editTargetInstance.id,
                data,
            )
            setEditTargetInstance(null)
            await loadInstances()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleCreateInstance(): Promise<void> {
        try {
            const instance = await services.objectService.createInstance(
                object.id,
            )
            addToast('Экземпляр добавлен', `id ${instance.id}`)
            await loadInstances()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }

    async function handleDeleteInstance(target: ObjectInstance): Promise<void> {
        try {
            await services.objectsInstancesService.delete(target.id)
            await loadInstances()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }

    const getContextMenuOptions = useCallback(
        (target: ObjectInstance) =>
            buildContextMenuOptions<ObjectInstance>({
                onViewRequest: instance => setViewTargetInstance(instance),
                onAddRequest:
                    target.parent_id === null
                        ? () => void handleCreateInstance()
                        : undefined,
                onChangeRequest: instance => setEditTargetInstance(instance),
                onDeleteRequest:
                    target.parent_id === null
                        ? instance => void handleDeleteInstance(instance)
                        : undefined,
            }),
        [],
    )

    function handleContextMenu(
        event: MouseEvent<HTMLElement>,
        instance: ObjectInstance,
    ): void {
        const contextMenuOptions = getContextMenuOptions(instance)

        if (!hasContextMenuActions(contextMenuOptions)) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            instance,
            contextMenuOptions,
        )
    }

    return (
        <div className='space-y-4'>
            <CompactDataTableToolbar state={tableState} columns={columns} />

            <LoadEffect
                data={objectInstances}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DataTable
                    state={tableState}
                    columns={columns}
                    rows={objectInstances ?? []}
                    processingMode='manual'
                    getRowId={instance => instance.id}
                    emptyMessage='У этого объекта пока нет экземпляров'
                    tableClassName='table-fixed'
                    onRowClick={instance =>
                        navigate(`/instances/${instance.id}`)
                    }
                    onRowContextMenu={(event, instance) =>
                        handleContextMenu(event, instance)
                    }
                />
            </LoadEffect>

            {editTargetInstance && (
                <EditEntityForm
                    schema={objectInstanceSchema}
                    uiSchema={objectInstanceUiSchema}
                    context={{
                        objectId: editTargetInstance.object_id,
                        parentId: editTargetInstance.parent_id,
                        defaultIsActive: editTargetInstance.is_active,
                    }}
                    source={editTargetInstance}
                    title={`Изменение экземпляра "${editTargetInstance.name}"`}
                    submitCallback={handleUpdateInstance}
                />
            )}

            {viewTargetInstance && (
                <ViewEntityModal
                    uiSchema={objectInstanceUiSchema}
                    context={{
                        objectId: viewTargetInstance.object_id,
                        parentId: viewTargetInstance.parent_id,
                        defaultIsActive: viewTargetInstance.is_active,
                    }}
                    source={viewTargetInstance}
                    title={`Просмотр экземпляра "${viewTargetInstance.name}"`}
                    onClose={() => setViewTargetInstance(null)}
                />
            )}
        </div>
    )
}

export default ObjectInstancesTab

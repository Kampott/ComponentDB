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
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import { objectUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    objectSchema,
    type Object,
    type ObjectAdd,
    type ObjectType,
    type ObjectUpdate,
} from '@Schemas'
import { useContextMenuStore, useServicesStore } from '@StorageImpl'

interface Props {
    objectType: ObjectType
}

type TypeObjectsColumnId = 'name' | 'id' | 'parentId'

function TypeObjectsTab({ objectType }: Props): ReactNode {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()

    const [objects, setObjects] = useState<Object[] | null>(null)
    const [addParentObject, setAddParentObject] = useState<Object | null>(null)
    const [editTargetObject, setEditTargetObject] = useState<Object | null>(
        null,
    )
    const [viewTargetObject, setViewTargetObject] = useState<Object | null>(
        null,
    )

    const columns = useMemo(
        (): readonly DataTableColumnSchema<
            Object,
            typeof objectSchema,
            TypeObjectsColumnId
        >[] => [
            {
                id: 'name',
                label: 'Название',
                queryField: 'name',
                renderCell: object => (
                    <TruncatedText text={object.name} maxLength={56} />
                ),
                getValue: object => object.name,
                getSortValue: object => object.name,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-[50%]',
                cellClassName: 'overflow-hidden',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like', 'in'],
                    placeholder: 'Название объекта',
                },
            },
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: object => `#${object.id}`,
                getValue: object => object.id,
                getSortValue: object => object.id,
                visibleByDefault: true,
                headerClassName: 'w-[20%]',
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
                renderCell: object =>
                    object.parent_id === null ? '—' : `#${object.parent_id}`,
                getValue: object => object.parent_id,
                visibleByDefault: true,
                headerClassName: 'w-[30%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID родителя',
                },
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: objectSchema,
        columns,
        defaultPageSize: 10,
        pageSizeOptions: [10, 20, 50, 'all'],
        defaultSorting: {
            field: 'name',
            direction: 'asc',
        },
    })

    const objectsQuery = useMemo(
        () => ({
            ...tableState.query,
            type_id: objectType.id,
        }),
        [objectType.id, tableState.query],
    )

    const loadObjects = useCallback(async () => {
        setObjects(null)

        try {
            setObjects(await services.objectService.list(objectsQuery))
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, objectsQuery, services.objectService])

    useEffect(() => {
        void loadObjects()
    }, [loadObjects])

    async function handleUpdateObject(
        data: ObjectUpdate | null,
    ): Promise<void> {
        if (!editTargetObject || !data) {
            setEditTargetObject(null)
            return
        }

        try {
            await services.objectService.update(editTargetObject.id, data)
            setEditTargetObject(null)
            await loadObjects()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleCreateObject(data: ObjectAdd | null): Promise<void> {
        if (!data) {
            setAddParentObject(null)
            return
        }

        try {
            await services.objectService.create(data)
            setAddParentObject(null)
            await loadObjects()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleDeleteObject(target: Object): Promise<void> {
        try {
            await services.objectService.delete(target.id)
            await loadObjects()
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }

    const getContextMenuOptions = useCallback(
        (_target: Object) =>
            buildContextMenuOptions<Object>({
                onViewRequest: object => setViewTargetObject(object),
                onAddRequest: object => setAddParentObject(object),
                onChangeRequest: object => setEditTargetObject(object),
                onDeleteRequest: object => void handleDeleteObject(object),
            }),
        [],
    )

    function handleContextMenu(
        event: MouseEvent<HTMLElement>,
        object: Object,
    ): void {
        const contextMenuOptions = getContextMenuOptions(object)

        if (!hasContextMenuActions(contextMenuOptions)) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            object,
            contextMenuOptions,
        )
    }

    return (
        <div className='space-y-4'>
            <CompactDataTableToolbar state={tableState} columns={columns} />

            <LoadEffect
                data={objects}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DataTable
                    state={tableState}
                    columns={columns}
                    rows={objects ?? []}
                    processingMode='manual'
                    getRowId={object => object.id}
                    emptyMessage='У этого типа пока нет объектов'
                    tableClassName='table-fixed'
                    onRowClick={object => navigate(`/objects/${object.id}`)}
                    onRowContextMenu={(event, object) =>
                        handleContextMenu(event, object)
                    }
                />
            </LoadEffect>

            {addParentObject && (
                <AddEntityForm
                    schema={objectSchema}
                    uiSchema={objectUiSchema}
                    context={{
                        parentTypeId: addParentObject.type_id,
                        parentObjectId: addParentObject.id,
                    }}
                    defaults={{ name: '' }}
                    title='Добавление нового объекта'
                    submitCallback={handleCreateObject}
                />
            )}

            {editTargetObject && (
                <EditEntityForm
                    schema={objectSchema}
                    uiSchema={objectUiSchema}
                    context={{
                        parentTypeId: editTargetObject.type_id,
                        parentObjectId: editTargetObject.parent_id,
                    }}
                    source={editTargetObject}
                    title={`Изменение объекта "${editTargetObject.name}"`}
                    submitCallback={handleUpdateObject}
                />
            )}

            {viewTargetObject && (
                <ViewEntityModal
                    uiSchema={objectUiSchema}
                    context={{
                        parentTypeId: viewTargetObject.type_id,
                        parentObjectId: viewTargetObject.parent_id,
                    }}
                    source={viewTargetObject}
                    title={`Просмотр объекта "${viewTargetObject.name}"`}
                    onClose={() => setViewTargetObject(null)}
                />
            )}
        </div>
    )
}

export default TypeObjectsTab

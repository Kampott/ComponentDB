import { useEffect, useState } from 'react'

import DefaultPopupForm from '@/Components/Common/Form/DefaultPopupForm.tsx'
import type { FormField } from '@/Components/Common/Form/FormTypes.ts'
import LoadEffect from '@/Components/Common/LoadEffect.tsx'
import type { Object, ObjectAdd } from '@/Schemas/Object.ts'
import { useServicesStore } from '@/Storages/Zustand/ServicesStore.ts'
import { ObjectValidator } from '@/Validators/Validators'

interface Props {
    parentObject: Object | null
    submitCallback: (data: ObjectAdd | null) => void
}

function AddObjectForm({ parentObject, submitCallback }: Props) {
    const services = useServicesStore(state => state.services)

    const [defaultData, setDefaultData] = useState<ObjectAdd>({} as ObjectAdd)

    const [formFields, setFormFields] = useState<
        FormField<ObjectAdd, keyof ObjectAdd>[] | null
    >(null)

    async function loadAvailableTypes() {
        if (parentObject == null) {
            return
        }

        const types = await services.objectsTypesService.getTypesByParentId(
            parentObject.type_id,
        )

        setDefaultData({
            name: '',
            parent_id: parentObject.id,
            type_id: types.length > 0 ? types[0].id : -1,
        })

        setFormFields([
            {
                bindData: 'name',
                label: 'Название объекта',
                type: 'text',
                placeholder: 'Введите название',
                validator: ObjectValidator.name,
            },
            {
                bindData: 'type_id',
                label: 'Тип объекта',
                type: 'select',
                options: types.map(el => {
                    return { label: el.name, value: el.id }
                }),
            },
        ])
    }

    useEffect(() => {
        loadAvailableTypes()
    }, [parentObject])

    return (
        <LoadEffect
            data={formFields}
            contentSize={{ width: '100%', height: '1rem' }}
        >
            <DefaultPopupForm
                defaultData={defaultData}
                title='Добавление нового объекта'
                fields={formFields ? formFields : []}
                onSubmit={submitCallback}
            />
        </LoadEffect>
    )
}

export default AddObjectForm

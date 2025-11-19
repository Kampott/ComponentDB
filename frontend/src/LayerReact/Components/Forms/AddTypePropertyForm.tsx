import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import type { ObjectType, PropertyTypeAdd } from '@RestSchemas'
import { PropertyTypeValidator } from '@RestSchemas'

interface Props {
    objectType: ObjectType
    submitCallback: (data: PropertyTypeAdd | null) => void
}

function AddTypePropertyForm({ objectType, submitCallback }: Props) {
    const formFields: FormField<PropertyTypeAdd, keyof PropertyTypeAdd>[] = [
        {
            bindData: 'name',
            label: 'Название свойства',
            type: 'text',
            placeholder: 'Введите название',
            validator: PropertyTypeValidator.name,
        },
        {
            bindData: 'is_static',
            label: 'Привязано к',
            type: 'select',
            options: [
                { label: 'объекту', value: 'true' },
                { label: 'экземпляру', value: 'false' },
            ],
        },
    ]

    const defaultData = {
        type_id: objectType.id,
        is_static: true,
    } as PropertyTypeAdd

    return (
        <DefaultPopupForm
            defaultData={defaultData}
            title='Добавление нового свойства'
            fields={formFields}
            onSubmit={submitCallback}
        />
    )
}

export default AddTypePropertyForm

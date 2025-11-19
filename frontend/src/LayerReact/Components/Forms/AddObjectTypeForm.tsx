import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import type { ObjectType, ObjectTypeAdd } from '@RestSchemas'
import { ObjectTypeValidator } from '@RestSchemas'

interface Props {
    parentObjectType: ObjectType | null
    submitCallback: (data: ObjectTypeAdd | null) => void
}

function AddObjectTypeForm({ parentObjectType, submitCallback }: Props) {
    const formFields: FormField<ObjectTypeAdd, keyof ObjectTypeAdd>[] = [
        {
            bindData: 'name',
            label: 'Название типа',
            type: 'text',
            placeholder: 'Введите название',
            validator: ObjectTypeValidator.name,
        },
    ]

    const defaultData = {
        parent_id: parentObjectType?.id,
    } as ObjectTypeAdd

    return (
        <DefaultPopupForm
            defaultData={defaultData}
            title='Добавление нового типа'
            fields={formFields}
            onSubmit={submitCallback}
        />
    )
}

export default AddObjectTypeForm

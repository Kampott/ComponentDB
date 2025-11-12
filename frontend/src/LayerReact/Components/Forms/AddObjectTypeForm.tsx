import type { ObjectType, ObjectTypeAdd } from '@RestSchemas'
import { ObjectTypeValidator } from '@RestSchemas'
import DefaultPopupForm from '../Common/Form/DefaultPopupForm.tsx'
import type { FormField } from '../Common/Form/FormTypes.ts'

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

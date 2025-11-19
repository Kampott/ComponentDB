import AddForm from '@Components/Forms/AddForm.tsx'
import { type Object, objectMeta, type SchemaAdd } from '@RestSchemas'

interface Props {
    parentObject: Object | null
    submitCallback: (data: SchemaAdd<Object> | null) => void
}

function AddObjectForm({ parentObject, submitCallback }: Props) {
    if (parentObject == null) {
        return <></>
    }

    return (
        <AddForm
            schemaMeta={objectMeta}
            optionsArgs={{
                type_id: parentObject && parentObject.type_id,
            }}
            defaultValuesArgs={{
                name: '',
                parent_id: parentObject.id,
                type_id: parentObject.id,
            }}
            submitCallback={submitCallback}
        />
    )
}

export default AddObjectForm

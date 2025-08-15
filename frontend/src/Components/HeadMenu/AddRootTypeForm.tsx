import type {ObjectTypeAdd} from "../../schemas/ObjectType.ts";
import DefaultForm, {type FormField} from "../Common/DefaultForm.tsx";


interface Props {
    submitCallback: (data: ObjectTypeAdd | null) => void;
}

function AddRootTypeForm({submitCallback}: Props) {
    function nameValidator(value: string | number | null): string | null {
        if (value == null || typeof value == "number") {
            return "Неверный формат ввода"
        }
        if (value == "") {
            return "Не может быть пустым"
        }
        return null;
    }

    const formFields: FormField<ObjectTypeAdd, keyof ObjectTypeAdd>[] = [
        {
            bindData: "name",
            label: "Название типа",
            type: "string",
            placeholder: "Введите название",
            validator: nameValidator
        }
    ]

    const defaultData = {
        parent_id: null
    } as ObjectTypeAdd;

    return (
        <DefaultForm defaultData={defaultData} title="Добавление нового типа" fields={formFields} onSubmit={submitCallback}/>
    );
}

export default AddRootTypeForm;
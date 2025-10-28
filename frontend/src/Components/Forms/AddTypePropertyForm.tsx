import DefaultForm from "../Common/Form/DefaultForm.tsx";
import type {FormField} from "../Common/Form/FormTypes.ts";
import type {PropertyTypeAdd} from "../../schemas/PropertyType.ts";
import type {ObjectType} from "../../schemas/ObjectType.ts";


interface Props {
    objectType: ObjectType;
    submitCallback: (data: PropertyTypeAdd | null) => void;
}

function AddTypePropertyForm({objectType, submitCallback}: Props) {
    function nameValidator(value: string | number | boolean): string | null {
        if (value == null || typeof value == "number") {
            return "Неверный формат ввода"
        }
        if (value == "") {
            return "Не может быть пустым"
        }
        return null;
    }

    const formFields: FormField<PropertyTypeAdd, keyof PropertyTypeAdd>[] = [
        {
            bindData: "name",
            label: "Название свойства",
            type: "text",
            placeholder: "Введите название",
            validator: nameValidator
        },
        {
            bindData: "is_static",
            label: "Привязано к",
            type: "select",
            options: [{ label: "объекту", value: "true" }, { label: "экземпляру", value: "false" }],
        }
    ]

    const defaultData = {
        type_id: objectType.id,
        is_static: true,
    } as PropertyTypeAdd;

    return (
        <DefaultForm defaultData={defaultData} title="Добавление нового свойства" fields={formFields} onSubmit={submitCallback}/>
    );
}

export default AddTypePropertyForm;
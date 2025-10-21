import type {Object, ObjectAdd} from "../../schemas/Object.ts";
import DefaultForm, {type FormField} from "../Common/DefaultForm.tsx";
import {useEffect, useState} from "react";
import type {ObjectType} from "../../schemas/ObjectType.ts";
import {useServicesStore} from "../../stores/Zustand.ts";
import LoadEffect from "../Common/LoadEffect.tsx";


interface Props {
    parentObject: Object | null;
    submitCallback: (data: ObjectAdd | null) => void;
}

function AddObjectTypeForm({parentObject, submitCallback}: Props) {
    const services = useServicesStore((state) => state.services);

    const [defaultData, setDefaultData] = useState<ObjectAdd>({} as ObjectAdd);

    const [formFields, setFormFields] = useState<FormField<ObjectAdd, keyof ObjectAdd>[] | null>(null);

    async function loadAvailableTypes() {
        if (parentObject == null) {
            return;
        }

        const types = await services.objectsTypesService.getTypesByParentId(parentObject.type_id)

        setDefaultData({
            name: "",
            parent_id: parentObject.id,
            type_id: types.length > 0 ? types[0].id : -1,
        });

        setFormFields([
            {
                bindData: "name",
                label: "Название объекта",
                type: "string",
                placeholder: "Введите название",
                validator: nameValidator
            },
            {
                bindData: "type_id",
                label: "Тип объекта",
                type: "select",
                options: types.map(el => {
                    return {label: el.name, value: el.id}
                }),
                validator: createTypeIdValidator(types),
            }
        ]);
    }

    useEffect(() => {
        loadAvailableTypes();
    }, [parentObject]);

    function nameValidator(value: string | number | null): string | null {
        if (value == null || typeof value == "number") {
            return "Неверный формат ввода";
        }
        if (value == "") {
            return "Не может быть пустым";
        }
        return null;
    }

    function createTypeIdValidator(availableTypes: ObjectType[] | null) {
        return function typeIdValidator(value: string | number | null): string | null {
            if (value == null || typeof value == "string") {
                return "Неверный формат ввода";
            }
            if (!availableTypes || availableTypes.findIndex((el) => el.id == value) == -1) {
                console.log(availableTypes)
                return "Неверный выбор";
            }
            return null;
        };
    }

    return (
        <LoadEffect data={formFields} contentSize={{width: "100%", height: "1rem"}}>
            <DefaultForm defaultData={defaultData} title="Добавление нового объекта" fields={formFields ? formFields : []}
                         onSubmit={submitCallback}/>
        </LoadEffect>
    );
}

export default AddObjectTypeForm;
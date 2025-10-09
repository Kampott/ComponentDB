import type {Dispatch, SetStateAction} from "react";

import Form from "react-bootstrap/Form";

import type {FieldType, FormField} from "./FormTypes.ts";


interface Props<T> {
    data: T;
    setData: Dispatch<SetStateAction<T>>;
    errors: Partial<Record<keyof T, string | null>>;
    setErrors: Dispatch<SetStateAction<Partial<Record<keyof T, string | null>>>>;
    fields: FormField<T, keyof T>[]
}

function DefaultFormRender<T>({data, setData, errors, setErrors, fields}: Props<T>) {
    function updateField<K extends keyof T>(field: K, value: T[K]) {
        setData((prev: T) => ({...prev, [field]: value}));
    }

    function getField<K extends keyof T>(field: K): T[K] {
        return data[field];
    }

    function handleChange<K extends keyof T>(field: FormField<T, K>, rawValue: any) {
        const value = parseValue<T, K>(rawValue, field.type);
        updateField(field.bindData, value);

        if (field.validator) {
            const validationResult = field.validator(value);
            setErrors(prev => ({...prev, [field.bindData]: validationResult}));
        } else {
            setErrors(prev => ({...prev, [field.bindData]: null}));
        }
    }

    function parseValue<T, K extends keyof T>(value: any, type: FieldType): T[K] {
        switch (type) {
            case "number":
                return Number(value) as T[K];
            case "boolean":
                return Boolean(value) as T[K];
            default:
                return value as T[K];
        }
    }

    return (
        <>
            {fields.map((field: FormField<T, keyof T>) => (
                <Form.Group key={String(field.bindData)} className="mb-3">
                    <Form.Label>{field.label}</Form.Label>

                    {field.type === "select" && field.options ? (
                        <Form.Select
                            value={getField(field.bindData) as any}
                            onChange={(e) => handleChange(field, e.target.value)}
                            isInvalid={!!errors[field.bindData]}
                        >
                            {field.options.map(opt => (
                                <option key={String(opt.value)} value={String(opt.value)}>
                                    {opt.label}
                                </option>
                            ))}
                        </Form.Select>
                    ) : field.type === "boolean" ? (
                        <Form.Check
                            type="checkbox"
                            checked={getField(field.bindData) as unknown as boolean}
                            onChange={(e) => handleChange(field, e.target.checked)}
                            isInvalid={!!errors[field.bindData]}
                        />
                    ) : (
                        <>
                            <Form.Control
                                type={field.type === "number" ? "number" : "text"}
                                placeholder={field.placeholder}
                                value={getField(field.bindData) as any}
                                onChange={(e) => handleChange(field, e.target.value)}
                                isInvalid={!!errors[field.bindData]}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors[field.bindData]}
                            </Form.Control.Feedback>
                        </>
                    )}
                </Form.Group>
            ))}
        </>
    );
}

export default DefaultFormRender;
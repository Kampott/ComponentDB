import {useState} from 'react';

import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

type FieldType = "string" | "number" | "boolean" | "select";

interface FormFieldOption<T> {
    label: string;
    value: T;
}

export interface FormField<T, K extends keyof T> {
    bindData: K;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: FormFieldOption<T[K]>[];
    validator?: (value: T[K]) => string | null;
}

interface Props<T> {
    defaultData: T;
    title: string;
    fields: FormField<T, keyof T>[];
    onSubmit: (data: T | null) => void;
}

function DefaultForm<T>({defaultData, title, fields, onSubmit}: Props<T>) {
    const [data, setData] = useState<T>(defaultData);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string | null>>>({});

    function updateField<K extends keyof T>(field: K, value: T[K]) {
        setData(prev => ({...prev, [field]: value}));
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

    function handleSubmit() {
        let hasError = false;
        const newErrors: Partial<Record<keyof T, string | null>> = {};

        fields.forEach(f => {
            if (f.validator) {
                const err = f.validator(data[f.bindData]);
                newErrors[f.bindData] = err;
                if (err) hasError = true;
            }
        });
        setErrors(newErrors);

        if (!hasError) {
            onSubmit(data);
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
        <Modal show={true}>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {fields.map((field) => (
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
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => onSubmit(null)}>
                    Отмена
                </Button>
                <Button variant="primary" onClick={handleSubmit}>
                    Сохранить
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default DefaultForm;

import {useState} from 'react';

import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import DefaultFormRender from "./DefaultFormRender.tsx";
import type {FormField} from "./FormTypes.ts";


interface Props<T> {
    defaultData: T;
    title: string;
    fields: FormField<T, keyof T>[];
    onSubmit: (data: T | null) => void;
}

function DefaultForm<T>({defaultData, title, fields, onSubmit}: Props<T>) {
    const [data, setData] = useState<T>(defaultData);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string | null>>>({});

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

    return (
        <Modal show={true}>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <DefaultFormRender
                        fields={fields}
                        data={data}
                        setData={setData}
                        errors={errors}
                        setErrors={setErrors}
                    />
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

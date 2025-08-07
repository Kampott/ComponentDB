import {useState} from 'react';
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import type {ObjectTypeAdd} from "../../schemas/ObjectType.ts";


interface Props {
    confirmAddCallback: CallableFunction
}

function AddRootObjectForm({confirmAddCallback}: Props) {
    const [formData, setFormData] = useState<ObjectTypeAdd>({name: "", parent_id: null})
    return (
        <Modal show={true}>
            <Modal.Header closeButton>
                <Modal.Title>Добавление нового типа</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Название типа</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Введите название"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({...formData, name: e.target.value})
                            }}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => confirmAddCallback(null)}>
                    Отмена
                </Button>
                <Button variant="primary" onClick={() => confirmAddCallback(formData)}>
                    Сохранить
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AddRootObjectForm;
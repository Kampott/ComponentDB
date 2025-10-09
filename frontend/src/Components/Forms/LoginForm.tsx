import type {FormField} from "../Common/Form/FormTypes.ts";
import DefaultInlineForm from "../Common/Form/DefaultInlineForm.tsx";
import type {LoginRequest} from "../../schemas/Auth.ts";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Card from "react-bootstrap/Card";

interface Props {
    submitCallback: (data: LoginRequest | null) => void;
}

function LoginForm({submitCallback}: Props) {
    function usernameValidator(value: string | number | null): string | null {
        if (value == null || typeof value == "number") {
            return "Неверный формат ввода"
        }
        if (value == "") {
            return "Не может быть пустым"
        }
        if (value.length < 4) {
            return "Не может быть короче 4х символов"
        }
        return null;
    }
    function passwordValidator(value: string | number | null): string | null {
        if (value == null || typeof value == "number") {
            return "Неверный формат ввода"
        }
        if (value == "") {
            return "Не может быть пустым"
        }
        if (value.length < 4) {
            return "Не может быть короче 4х символов"
        }
        return null;
    }

    const formFields: FormField<LoginRequest, keyof LoginRequest>[] = [
        {
            bindData: "email",
            label: "",
            type: "string",
            placeholder: "Имя пользователя",
            validator: usernameValidator
        },
        {
            bindData: "password",
            label: "",
            type: "string",
            placeholder: "Пароль",
            validator: passwordValidator
        }
    ]

    const defaultData = {
    } as LoginRequest;


    return (
        <Container
            fluid
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: "100vh" }}
        >
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={8} md={6} lg={4}>
                    <Card className="shadow-sm p-4">
                        <Card.Body className="d-flex flex-column align-items-center">
                            <h4 className="mb-4 fw-normal text-center">Вход в систему</h4>
                            <DefaultInlineForm
                                defaultData={defaultData}
                                submitButtonText="Войти"
                                fields={formFields}
                                onSubmit={submitCallback}
                            />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default LoginForm;
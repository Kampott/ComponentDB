import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultInlineForm from '@Components/Common/Forms/DefaultInlineForm.tsx'
import type { LoginRequest } from '@RestSchemas'
import { LoginRequestValidator } from '@RestSchemas'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'

interface Props {
    submitCallback: (data: LoginRequest | null) => void
}

function LoginForm({ submitCallback }: Props) {
    const formFields: FormField<LoginRequest, keyof LoginRequest>[] = [
        {
            bindData: 'username',
            label: '',
            type: 'text',
            placeholder: 'Имя пользователя',
            validator: LoginRequestValidator.email,
        },
        {
            bindData: 'password',
            label: '',
            type: 'password',
            placeholder: 'Пароль',
            validator: LoginRequestValidator.password,
        },
    ]

    const defaultData = {} as LoginRequest

    return (
        <Container
            fluid
            className='d-flex align-items-center justify-content-center'
            style={{ minHeight: '100vh' }}
        >
            <Row className='w-100 justify-content-center'>
                <Col xs={12} sm={8} md={6} lg={4}>
                    <Card className='shadow-sm p-4'>
                        <Card.Body className='d-flex flex-column align-items-center'>
                            <h4 className='mb-4 fw-normal text-center'>
                                Вход в систему
                            </h4>
                            <DefaultInlineForm
                                defaultData={defaultData}
                                submitButtonText='Войти'
                                fields={formFields}
                                onSubmit={submitCallback}
                            />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

export default LoginForm

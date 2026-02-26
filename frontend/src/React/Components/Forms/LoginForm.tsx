import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DefaultInlineForm from '@Components/Common/Forms/DefaultInlineForm.tsx'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'
import type { LoginRequest } from '@Schemas'
import { LoginRequestValidator } from '@Schemas'

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
        <div className='flex min-h-screen items-center justify-center px-4'>
            <Card className='w-full max-w-md'>
                <CardHeader>
                    <CardTitle className='text-center text-xl font-medium'>
                        Вход в систему
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DefaultInlineForm
                        defaultData={defaultData}
                        submitButtonText='Войти'
                        fields={formFields}
                        onSubmit={submitCallback}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

export default LoginForm

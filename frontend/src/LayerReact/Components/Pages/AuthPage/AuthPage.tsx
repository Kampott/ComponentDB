import { type ReactElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from 'react-bootstrap/Button'

import LoginForm from '@Components/Forms/LoginForm.tsx'
import RegisterForm from '@Components/Forms/RegisterForm.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { LoginRequest } from '@RestSchemas'
import { useUserStore } from '@StorageImpl'

function AuthPage() {
    const navigate = useNavigate()

    const login = useUserStore(state => state.login)

    const [isRegister, setIsRegister] = useState(false)

    async function confirmLogin(data: LoginRequest | null) {
        if (!data) {
            return
        }
        try {
            await login(data)
            navigate('/')
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate: navigate,
                showToast: m => alert(m),
            })
            return
        }
    }

    let content: ReactElement
    if (isRegister) {
        content = (
            <>
                <RegisterForm />
                <Button onClick={() => setIsRegister(false)}>
                    Есть аккаунт?
                </Button>
            </>
        )
    } else {
        content = (
            <>
                <LoginForm submitCallback={confirmLogin} />;
                <Button onClick={() => setIsRegister(true)}>
                    Зарегистрироваться
                </Button>
            </>
        )
    }

    return content
}

export default AuthPage

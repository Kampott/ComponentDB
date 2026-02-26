import { type ReactElement, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import LoginForm from '@Components/Forms/LoginForm.tsx'
import RegisterForm from '@Components/Forms/RegisterForm.tsx'
import { Button } from '@Components/ui/button'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { LoginRequest } from '@Schemas'
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
            <div className='space-y-4'>
                <RegisterForm />
                <div className='flex justify-center'>
                    <Button
                        variant='outline'
                        onClick={() => setIsRegister(false)}
                    >
                        Есть аккаунт?
                    </Button>
                </div>
            </div>
        )
    } else {
        content = (
            <div className='space-y-4'>
                <LoginForm submitCallback={confirmLogin} />
                <div className='fixed bottom-4 left-1/2 -translate-x-1/2'>
                    <Button
                        variant='outline'
                        onClick={() => setIsRegister(true)}
                    >
                        Зарегистрироваться
                    </Button>
                </div>
            </div>
        )
    }

    return content
}

export default AuthPage

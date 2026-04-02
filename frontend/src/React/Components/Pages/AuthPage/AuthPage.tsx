import type { ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'

import LoginForm from '@Components/Forms/LoginForm.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { LoginRequest } from '@Schemas'
import { useUserStore } from '@StorageImpl'

function AuthPage() {
    const navigate = useNavigate()

    const login = useUserStore(state => state.login)

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

    const content: ReactElement = <LoginForm submitCallback={confirmLogin} />

    return content
}

export default AuthPage

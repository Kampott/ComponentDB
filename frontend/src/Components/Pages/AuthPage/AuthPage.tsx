import {type ReactElement, useState} from "react";
import {useNavigate} from "react-router-dom";

import RegisterForm from "../../Forms/RegisterForm.tsx";
import LoginForm from "../../Forms/LoginForm.tsx";
import type {LoginRequest} from "../../../schemas/Auth.ts";
import {useUserStore} from "../../../stores/Zustand.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";


function AuthPage() {
    const navigate = useNavigate();

    const login = useUserStore((state) => state.login)

    const [isRegister, setIsRegister] = useState(false);

    async function confirmLogin(data: LoginRequest | null) {
        if (!data) {
            return
        }
        try {
            await login(data);
            navigate("/");
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate: navigate,
                showToast: (m) => alert(m)
            });
            return;
        }
    }

    let content: ReactElement;
    if (isRegister) {
        content = <RegisterForm/>;
    } else {
        content = <LoginForm submitCallback={confirmLogin}/>;
    }
    return (
        content
    );
}

export default AuthPage;
import { useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import DefaultLayout from '@Components/DefaultLayout/DefaultLayout.tsx'
import AccountPage from '@Components/Pages/AccountPage/AccountPage.tsx'
import AdminPage from '@Components/Pages/AdminPage/AdminPage.tsx'
import AuthPage from '@Components/Pages/AuthPage/AuthPage.tsx'
import EventsPage from '@Components/Pages/EventsPage/EventsPage.tsx'
import HomePage from '@Components/Pages/HomePage/HomePage.tsx'
import InstancePage from '@Components/Pages/InstancePage/InstancePage.tsx'
import NoPage from '@Components/Pages/NoPage/NoPage.tsx'
import ObjectPage from '@Components/Pages/ObjectPage/ObjectPage.tsx'
import TypePage from '@Components/Pages/TypePage/TypePage.tsx'
import { useUserStore } from '@StorageImpl'

import './index.css'

function App() {
    const authResolved = useUserStore(state => state.authResolved)
    const checkAuth = useUserStore(state => state.checkAuth)
    const themeMode = useUserStore(state => state.themeMode)
    const authInitStartedRef = useRef(false)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark')
    }, [themeMode])

    useEffect(() => {
        if (authInitStartedRef.current) {
            return
        }

        authInitStartedRef.current = true
        void checkAuth()
    }, [checkAuth])

    if (!authResolved) {
        return (
            <div className='flex min-h-screen items-center justify-center px-4'>
                <p className='text-muted-foreground text-sm'>
                    Проверка авторизации...
                </p>
            </div>
        )
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<DefaultLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path='types/:typeId' element={<TypePage />} />
                    <Route path='objects/:objectId' element={<ObjectPage />} />
                    <Route
                        path='instances/:instanceId'
                        element={<InstancePage />}
                    />
                    <Route path='events' element={<EventsPage />} />
                    <Route path='account' element={<AccountPage />} />
                    <Route path='admin' element={<AdminPage />} />
                    <Route path='login' element={<AuthPage />} />
                </Route>
                <Route path='/404' element={<NoPage />} />
                <Route path='*' element={<Navigate to='/404' />} />
            </Routes>
        </BrowserRouter>
        // <div className="App">
        //         <InstancePage/>
        //     </div>
    )
}

export default App

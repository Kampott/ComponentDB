import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import DefaultLayout from '@Components/DefaultLayout/DefaultLayout.tsx'
import AuthPage from '@Components/Pages/AuthPage/AuthPage.tsx'
import EventsPage from '@Components/Pages/EventsPage/EventsPage.tsx'
import HomePage from '@Components/Pages/HomePage/HomePage.tsx'
import InstancePage from '@Components/Pages/InstancePage/InstancePage.tsx'
import NoPage from '@Components/Pages/NoPage/NoPage.tsx'
import ObjectPage from '@Components/Pages/ObjectPage/ObjectPage.tsx'
import TypePage from '@Components/Pages/TypePage/TypePage.tsx'

import './index.css'

function App() {
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

import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";

import ObjectPage from "./Components/Pages/ObjectPage/ObjectPage.tsx";
import HomePage from "./Components/Pages/HomePage/HomePage.tsx";
import NoPage from "./Components/Pages/NoPage/NoPage.tsx";
import TypePage from "./Components/Pages/TypePage/TypePage.tsx";
import DefaultLayout from "./Components/DefaultLayout/DefaultLayout.tsx";
import AuthPage from "./Components/Pages/AuthPage/AuthPage.tsx";
import InstancePage from "./Components/Pages/InstancePage/InstancePage.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<DefaultLayout/>}>
                    <Route index element={<HomePage/>}/>
                    <Route path="types/:typeId" element={<TypePage/>}/>
                    <Route path="objects/:objectId" element={<ObjectPage/>}/>
                    <Route path="instances/:instanceId" element={<InstancePage/>}/>
                    <Route path="login" element={<AuthPage/>}/>
                </Route>
                <Route path="/404" element={<NoPage/>}/>
                <Route path="*" element={<Navigate to="/404"/>}/>
            </Routes>
        </BrowserRouter>
        // <div className="App">
        //         <InstancePage/>
        //     </div>
    )
}

export default App

import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";

import ObjectPage from "./Components/Pages/ObjectPage/ObjectPage.tsx";
import HomePage from "./Components/Pages/HomePage/HomePage.tsx";
import NoPage from "./Components/Pages/NoPage/NoPage.tsx";
import TypePage from "./Components/Pages/TypePage/TypePage.tsx";
import DefaultLayout from "./Components/DefaultLayout/DefaultLayout.tsx";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<DefaultLayout/>}>
                    <Route index element={<HomePage/>}/>
                    <Route path="types/:typeId" element={<TypePage/>}/>
                    <Route path="objects/:objectId" element={<ObjectPage/>}/>
                </Route>
                <Route path="/404" element={<NoPage/>}/>
                <Route path="*" element={<Navigate to="/404"/>}/>
            </Routes>
        </BrowserRouter>
        // <div className="App">
        //         <ObjectPage/>
        //     </div>
    )
}

export default App

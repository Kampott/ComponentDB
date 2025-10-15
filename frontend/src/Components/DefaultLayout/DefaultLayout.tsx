import {Outlet} from "react-router-dom";

import HeadMenu from "../HeadMenu/HeadMenu.tsx";

function DefaultLayout() {
    return (
        <>
            <HeadMenu />
            <Outlet />
        </>
    );
}

export default DefaultLayout;
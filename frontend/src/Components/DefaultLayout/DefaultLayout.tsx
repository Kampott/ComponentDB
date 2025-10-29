import { Outlet } from 'react-router-dom'

import HeadMenu from '../HeadMenu/HeadMenu.tsx'
import GlobalToaster from './GlobalToaster.tsx'

function DefaultLayout() {
    return (
        <>
            <HeadMenu />
            <Outlet />
            <GlobalToaster />
        </>
    )
}

export default DefaultLayout

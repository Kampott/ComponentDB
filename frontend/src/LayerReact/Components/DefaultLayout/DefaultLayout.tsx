import { Outlet } from 'react-router-dom'

import HeadMenu from '@Components/HeadMenu/HeadMenu.tsx'
import ContextMenu from './ContextMenu.tsx'
import GlobalToaster from './GlobalToaster.tsx'

function DefaultLayout() {
    return (
        <>
            <HeadMenu />
            <Outlet />
            <GlobalToaster />
            <ContextMenu />
        </>
    )
}

export default DefaultLayout

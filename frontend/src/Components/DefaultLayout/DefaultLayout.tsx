import { Outlet } from 'react-router-dom'

import ContextMenu from '@/Components/DefaultLayout/ContextMenu.tsx'
import HeadMenu from '../HeadMenu/HeadMenu.tsx'
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

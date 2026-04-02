import { type ReactElement, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@Components/ui/tabs'
import {
    userCanManageUsers,
    userCanReadPermissions,
    userCanReadRoles,
} from '@Schemas'
import { useUserStore } from '@StorageImpl'
import PermissionsSection from './PermissionsSection.tsx'
import RolesSection from './RolesSection.tsx'
import UsersSection from './UsersSection.tsx'

interface AdminTab {
    value: string
    label: string
    content: ReactElement
}

function AdminPage() {
    const navigate = useNavigate()
    const user = useUserStore(state => state.user)
    const isAuthenticated = useUserStore(state => state.isAuthenticated)
    const authResolved = useUserStore(state => state.authResolved)

    const canShowUsersSection = userCanManageUsers(user)
    const canShowRolesSection = userCanReadRoles(user)
    const canShowPermissionsSection = userCanReadPermissions(user)
    const visibleTabs = [
        canShowUsersSection && {
            value: 'users',
            label: 'Пользователи',
            content: <UsersSection />,
        },
        canShowRolesSection && {
            value: 'roles',
            label: 'Роли',
            content: <RolesSection />,
        },
        canShowPermissionsSection && {
            value: 'permissions',
            label: 'Права доступа',
            content: <PermissionsSection />,
        },
    ].filter((tab): tab is AdminTab => Boolean(tab))

    useEffect(() => {
        if (!authResolved) {
            return
        }

        if (!isAuthenticated || visibleTabs.length === 0) {
            navigate('/account')
        }
    }, [authResolved, isAuthenticated, navigate, visibleTabs.length])

    if (!authResolved) {
        return null
    }

    if (!isAuthenticated || visibleTabs.length === 0) {
        return null
    }

    return (
        <div className='mx-auto mt-4 w-full max-w-[92rem] px-4'>
            <h1 className='mb-6 text-center text-3xl font-semibold'>
                Админ-панель
            </h1>
            <Tabs
                defaultValue={visibleTabs[0]?.value}
                className='mb-4 space-y-4'
            >
                <TabsList
                    className='grid h-auto w-full'
                    style={{
                        gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))`,
                    }}
                >
                    {visibleTabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {visibleTabs.map(tab => (
                    <TabsContent key={tab.value} value={tab.value}>
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

export default AdminPage

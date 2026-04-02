import { Shield, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@Components/ui/badge'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import { Separator } from '@Components/ui/separator'
import { userCanAccessAdmin } from '@Schemas'
import { useUserStore } from '@StorageImpl'

function AccountPage() {
    const navigate = useNavigate()
    const user = useUserStore(state => state.user)
    const isAuthenticated = useUserStore(state => state.isAuthenticated)
    const authResolved = useUserStore(state => state.authResolved)
    const logout = useUserStore(state => state.logout)

    if (!authResolved) {
        return (
            <div className='mx-auto mt-4 w-full max-w-3xl px-4'>
                <div className='flex flex-col items-center gap-4 py-12'>
                    <p className='text-muted-foreground text-lg'>
                        Проверка авторизации...
                    </p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className='mx-auto mt-4 w-full max-w-3xl px-4'>
                <div className='flex flex-col items-center gap-4 py-12'>
                    <p className='text-muted-foreground text-lg'>
                        Вы не авторизованы
                    </p>
                    <Button onClick={() => navigate('/login')}>Войти</Button>
                </div>
            </div>
        )
    }

    const canAccessAdmin = userCanAccessAdmin(user)
    const canShowRoleDetails = (user.roles?.length ?? 0) > 0

    return (
        <div className='mx-auto mt-4 w-full max-w-3xl px-4'>
            <h1 className='mb-6 text-center text-3xl font-semibold'>Аккаунт</h1>

            <div className='space-y-6'>
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <UserIcon className='size-5' />
                            Информация о пользователе
                        </CardTitle>
                        <CardDescription>
                            Основные данные вашего аккаунта
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <div className='grid grid-cols-[140px_1fr] items-center gap-2'>
                            <span className='text-muted-foreground text-sm font-medium'>
                                ID
                            </span>
                            <span className='text-sm'>{user.id}</span>
                        </div>
                        <Separator />
                        <div className='grid grid-cols-[140px_1fr] items-center gap-2'>
                            <span className='text-muted-foreground text-sm font-medium'>
                                Email
                            </span>
                            <span className='text-sm'>{user.email}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Shield className='size-5' />
                            Роли и права доступа
                        </CardTitle>
                        <CardDescription>
                            Ваши роли и связанные с ними разрешения
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {canShowRoleDetails ? (
                            <div className='space-y-4'>
                                {user.roles?.map(role => (
                                    <div key={role.id}>
                                        <div className='mb-2 flex items-center gap-2'>
                                            <Badge variant='default'>
                                                {role.name}
                                            </Badge>
                                        </div>
                                        {role.permissions.length > 0 ? (
                                            <div className='ml-4 flex flex-wrap gap-1.5'>
                                                {role.permissions.map(perm => (
                                                    <Badge
                                                        key={perm.id}
                                                        variant='outline'
                                                        className='text-xs'
                                                    >
                                                        {perm.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className='text-muted-foreground ml-4 text-sm'>
                                                Нет прав доступа
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : userCanAccessAdmin(user) ? (
                            <p className='text-muted-foreground text-sm'>
                                Бэкенд не отдает детальную раскладку ролей для
                                текущего пользователя, поэтому список прав
                                недоступен в интерфейсе.
                            </p>
                        ) : (
                            <p className='text-muted-foreground text-sm'>
                                Нет назначенных ролей
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className='flex flex-wrap gap-3'>
                    {canAccessAdmin && (
                        <Button
                            variant='default'
                            onClick={() => navigate('/admin')}
                        >
                            Админ-панель
                        </Button>
                    )}
                    <Button
                        variant='destructive'
                        onClick={async () => {
                            await logout()
                            navigate('/login')
                        }}
                    >
                        Выйти
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default AccountPage

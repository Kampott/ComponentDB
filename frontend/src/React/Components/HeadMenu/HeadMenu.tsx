import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@Components/ui/button'
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
} from '@Components/ui/menubar'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@Components/ui/sheet'
import { useUserStore } from '@StorageImpl'
import RootObjectsListMenu from './RootObjectsListMenu.tsx'

function HeadMenu() {
    const navigate = useNavigate()
    const actionDisplayMode = useUserStore(state => state.actionDisplayMode)
    const toggleActionDisplayMode = useUserStore(
        state => state.toggleActionDisplayMode,
    )

    const [showRootObjectsListMenu, setShowRootObjectsListMenu] =
        useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    const handleRootObjectsListMenuClose = () =>
        setShowRootObjectsListMenu(false)
    const toggleRootObjectsListMenuShow = () =>
        setShowRootObjectsListMenu(prev => !prev)

    return (
        <>
            <header className='bg-background/95 sticky top-0 z-40 border-b backdrop-blur'>
                <div className='flex h-14 items-center justify-between px-4'>
                    <Link to='/' className='flex items-center'>
                        <img
                            src='/logo.png'
                            alt='Логотип'
                            className='h-8 w-auto max-w-[180px] object-contain'
                        />
                    </Link>

                    <div className='hidden flex-1 items-center justify-between md:flex'>
                        <div className='flex items-center'>
                            <Menubar className='ml-4 border-0 bg-transparent p-0 lg:hidden'>
                                <MenubarMenu>
                                    <MenubarTrigger>Разделы</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem
                                            onSelect={() =>
                                                toggleRootObjectsListMenuShow()
                                            }
                                        >
                                            Объекты
                                        </MenubarItem>
                                        <MenubarItem disabled>
                                            Документы
                                        </MenubarItem>
                                        <MenubarItem
                                            onSelect={() => navigate('/events')}
                                        >
                                            События
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>
                            </Menubar>

                            <nav className='ml-4 hidden items-center gap-1 lg:flex'>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() =>
                                        toggleRootObjectsListMenuShow()
                                    }
                                >
                                    Объекты
                                </Button>
                                <Button variant='ghost' size='sm' disabled>
                                    Документы
                                </Button>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => navigate('/events')}
                                >
                                    События
                                </Button>
                            </nav>
                        </div>

                        <div className='flex items-center gap-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => toggleActionDisplayMode()}
                            >
                                {actionDisplayMode === 'material'
                                    ? 'Material'
                                    : 'Text'}
                            </Button>

                            <Menubar className='border-0 bg-transparent p-0'>
                                <MenubarMenu>
                                    <MenubarTrigger>Справка</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem disabled>
                                            Скоро будет
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>

                                <MenubarMenu>
                                    <MenubarTrigger>Аккаунт</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem
                                            onSelect={() => navigate('/login')}
                                        >
                                            Профиль
                                        </MenubarItem>
                                        <MenubarSeparator />
                                        <MenubarItem disabled>
                                            Выход
                                        </MenubarItem>
                                    </MenubarContent>
                                </MenubarMenu>
                            </Menubar>
                        </div>
                    </div>

                    <Button
                        className='md:hidden'
                        size='icon'
                        variant='ghost'
                        onClick={() => setShowMobileMenu(true)}
                        aria-label='Открыть меню'
                    >
                        <Menu className='size-5' />
                    </Button>
                </div>
            </header>

            <Sheet
                open={showMobileMenu}
                onOpenChange={open => setShowMobileMenu(open)}
            >
                <SheetContent side='right' className='w-full sm:max-w-sm'>
                    <SheetHeader>
                        <SheetTitle>Меню</SheetTitle>
                    </SheetHeader>

                    <div className='mt-6 space-y-2'>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            onClick={() => {
                                setShowMobileMenu(false)
                                setShowRootObjectsListMenu(true)
                            }}
                        >
                            Объекты
                        </Button>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            disabled
                        >
                            Документы
                        </Button>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            onClick={() => {
                                setShowMobileMenu(false)
                                navigate('/events')
                            }}
                        >
                            События
                        </Button>

                        <div className='my-2 border-t' />

                        <Button
                            variant='outline'
                            className='w-full justify-start'
                            onClick={() => toggleActionDisplayMode()}
                        >
                            Режим:{' '}
                            {actionDisplayMode === 'material'
                                ? 'Material'
                                : 'Text'}
                        </Button>

                        <div className='my-2 border-t' />

                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            onClick={() => {
                                setShowMobileMenu(false)
                                navigate('/login')
                            }}
                        >
                            Профиль
                        </Button>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            disabled
                        >
                            Выход
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <RootObjectsListMenu
                showObjectsMenu={showRootObjectsListMenu}
                handleClose={handleRootObjectsListMenuClose}
            />
        </>
    )
}

export default HeadMenu

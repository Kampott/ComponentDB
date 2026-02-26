import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
} from '@/components/ui/menubar'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import RootObjectsListMenu from './RootObjectsListMenu.tsx'

function HeadMenu() {
    const navigate = useNavigate()

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
                        <Menubar className='ml-4 border-0 bg-transparent p-0'>
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
                                    <MenubarItem disabled>События</MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                        </Menubar>

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
                                    <MenubarItem disabled>Выход</MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                        </Menubar>
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
                            disabled
                        >
                            События
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

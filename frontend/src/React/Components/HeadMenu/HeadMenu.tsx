import { Menu, Moon, Sun } from 'lucide-react'
import { type MouseEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import ModeAwareIconLabel from '@Components/Common/ModeAwareIconLabel.tsx'
import PublicIcon from '@Components/Common/PublicIcon.tsx'
import { Button } from '@Components/ui/button'
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from '@Components/ui/menubar'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@Components/ui/sheet'
import { userCanAccessAdmin } from '@Schemas'
import { useContextMenuStore, useUserStore } from '@StorageImpl'
import RootObjectsListMenu from './RootObjectsListMenu.tsx'

function HeadMenu() {
    const navigate = useNavigate()
    const user = useUserStore(state => state.user)
    const isAuthenticated = useUserStore(state => state.isAuthenticated)
    const authResolved = useUserStore(state => state.authResolved)
    const logout = useUserStore(state => state.logout)
    const actionDisplayMode = useUserStore(state => state.actionDisplayMode)
    const toggleActionDisplayMode = useUserStore(
        state => state.toggleActionDisplayMode,
    )
    const themeMode = useUserStore(state => state.themeMode)
    const toggleThemeMode = useUserStore(state => state.toggleThemeMode)
    const { onContextMenuCall } = useContextMenuStore()

    const showAdminLink =
        authResolved && isAuthenticated && userCanAccessAdmin(user)

    const [showRootObjectsListMenu, setShowRootObjectsListMenu] =
        useState(false)
    const [showMobileMenu, setShowMobileMenu] = useState(false)

    const handleRootObjectsListMenuClose = () =>
        setShowRootObjectsListMenu(false)
    const toggleRootObjectsListMenuShow = () =>
        setShowRootObjectsListMenu(prev => !prev)

    async function handleAuthNavigation() {
        if (isAuthenticated) {
            await logout()
        }
        navigate('/login')
    }

    function handleAccountNavigation() {
        navigate(isAuthenticated ? '/account' : '/login')
    }

    const accountContextMenuOptions = useMemo(
        () =>
            buildContextMenuOptions<{ kind: 'account' }>({
                extraOptions: {
                    Перейти: () => handleAccountNavigation(),
                    Панель: showAdminLink
                        ? () => navigate('/admin')
                        : undefined,
                    Выйти: isAuthenticated
                        ? () => {
                              void handleAuthNavigation()
                          }
                        : undefined,
                },
            }),
        [isAuthenticated, navigate, showAdminLink],
    )
    const isAccountContextMenuEnabled = hasContextMenuActions(
        accountContextMenuOptions,
    )

    function handleAccountContextMenu(event: MouseEvent<HTMLElement>) {
        if (!isAccountContextMenuEnabled) {
            return
        }

        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            { kind: 'account' },
            accountContextMenuOptions,
        )
    }

    const themeToggleLabel =
        themeMode === 'dark' ? 'Светлая тема' : 'Темная тема'
    const themeToggleIcon =
        themeMode === 'dark' ? (
            <Sun className='size-[1.05rem]' />
        ) : (
            <Moon className='size-[1.05rem]' />
        )

    return (
        <>
            <header className='bg-background/95 sticky top-0 z-40 border-b backdrop-blur'>
                <div className='flex h-12 items-center justify-between px-4'>
                    <Link to='/' className='flex items-center'>
                        <PublicIcon
                            src='/logo.svg'
                            alt='Логотип'
                            className='size-5'
                        />
                    </Link>

                    <div className='hidden flex-1 items-center justify-between md:flex'>
                        <div className='flex items-center'>
                            <Menubar className='ml-3 h-8 items-center self-center border-0 bg-transparent p-0 lg:hidden'>
                                <MenubarMenu>
                                    <MenubarTrigger>Разделы</MenubarTrigger>
                                    <MenubarContent>
                                        <MenubarItem
                                            onSelect={() =>
                                                toggleRootObjectsListMenuShow()
                                            }
                                        >
                                            Типы
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

                            <nav className='ml-3 hidden items-center self-center gap-1 lg:flex'>
                                <Button
                                    variant='ghost'
                                    size={
                                        actionDisplayMode === 'material'
                                            ? 'icon-sm'
                                            : 'sm'
                                    }
                                    className={
                                        actionDisplayMode === 'material'
                                            ? 'h-8 px-0'
                                            : 'h-8'
                                    }
                                    onClick={() =>
                                        toggleRootObjectsListMenuShow()
                                    }
                                >
                                    <ModeAwareIconLabel
                                        icon={
                                            <PublicIcon
                                                src='/types.svg'
                                                className='size-[1.05rem]'
                                            />
                                        }
                                        label='Типы'
                                    />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size={
                                        actionDisplayMode === 'material'
                                            ? 'icon-sm'
                                            : 'sm'
                                    }
                                    className={
                                        actionDisplayMode === 'material'
                                            ? 'h-8 px-0'
                                            : 'h-8'
                                    }
                                    disabled
                                >
                                    <ModeAwareIconLabel
                                        icon={
                                            <PublicIcon
                                                src='/documents.svg'
                                                className='size-[1.05rem]'
                                            />
                                        }
                                        label='Документы'
                                    />
                                </Button>
                                <Button
                                    variant='ghost'
                                    size={
                                        actionDisplayMode === 'material'
                                            ? 'icon-sm'
                                            : 'sm'
                                    }
                                    className={
                                        actionDisplayMode === 'material'
                                            ? 'h-8 px-0'
                                            : 'h-8'
                                    }
                                    onClick={() => navigate('/events')}
                                >
                                    <ModeAwareIconLabel
                                        icon={
                                            <PublicIcon
                                                src='/events.svg'
                                                className='size-[1.05rem]'
                                            />
                                        }
                                        label='События'
                                    />
                                </Button>
                            </nav>
                        </div>

                        <div className='flex items-center self-center gap-2'>
                            <Button
                                variant='outline'
                                size={
                                    actionDisplayMode === 'material'
                                        ? 'icon-sm'
                                        : 'sm'
                                }
                                className={
                                    actionDisplayMode === 'material'
                                        ? 'h-8 px-0'
                                        : 'h-8'
                                }
                                onClick={() => toggleThemeMode()}
                                aria-label={themeToggleLabel}
                                title={themeToggleLabel}
                            >
                                <ModeAwareIconLabel
                                    icon={themeToggleIcon}
                                    label={themeToggleLabel}
                                />
                            </Button>

                            <Button
                                variant='outline'
                                size='sm'
                                className='h-8'
                                onClick={() => toggleActionDisplayMode()}
                            >
                                {actionDisplayMode === 'material'
                                    ? 'Material'
                                    : 'Text'}
                            </Button>

                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='ghost'
                                    size={
                                        actionDisplayMode === 'material'
                                            ? 'icon-sm'
                                            : 'sm'
                                    }
                                    className={
                                        actionDisplayMode === 'material'
                                            ? 'min-w-0 h-8 px-0'
                                            : 'min-w-0 h-8'
                                    }
                                    aria-label='Аккаунт'
                                    title='Аккаунт'
                                    onClick={handleAccountNavigation}
                                    onContextMenu={handleAccountContextMenu}
                                >
                                    <ModeAwareIconLabel
                                        icon={
                                            <PublicIcon
                                                src='/user_profile.svg'
                                                className='size-[1.1rem]'
                                            />
                                        }
                                        label='Аккаунт'
                                    />
                                </Button>

                                <Menubar className='h-8 items-center self-center border-0 bg-transparent p-0'>
                                    <MenubarMenu>
                                        <MenubarTrigger
                                            className={
                                                actionDisplayMode === 'material'
                                                    ? 'h-8 px-2 py-1'
                                                    : 'h-8'
                                            }
                                        >
                                            <ModeAwareIconLabel
                                                icon={
                                                    <PublicIcon
                                                        src='/info.svg'
                                                        className='size-[1.05rem]'
                                                    />
                                                }
                                                label='Справка'
                                            />
                                        </MenubarTrigger>
                                        <MenubarContent>
                                            <MenubarItem disabled>
                                                Скоро будет
                                            </MenubarItem>
                                        </MenubarContent>
                                    </MenubarMenu>
                                </Menubar>
                            </div>
                        </div>
                    </div>

                    <Button
                        className='md:hidden'
                        size='icon-sm'
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
                            <ModeAwareIconLabel
                                icon={
                                    <PublicIcon
                                        src='/types.svg'
                                        className='size-4'
                                    />
                                }
                                label='Типы'
                            />
                        </Button>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            disabled
                        >
                            <ModeAwareIconLabel
                                icon={
                                    <PublicIcon
                                        src='/documents.svg'
                                        className='size-4'
                                    />
                                }
                                label='Документы'
                            />
                        </Button>
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            onClick={() => {
                                setShowMobileMenu(false)
                                navigate('/events')
                            }}
                        >
                            <ModeAwareIconLabel
                                icon={
                                    <PublicIcon
                                        src='/events.svg'
                                        className='size-4'
                                    />
                                }
                                label='События'
                            />
                        </Button>

                        <div className='my-2 border-t' />

                        <Button
                            variant='outline'
                            className='w-full justify-start'
                            onClick={() => toggleThemeMode()}
                        >
                            {themeMode === 'dark'
                                ? 'Тема: Темная'
                                : 'Тема: Светлая'}
                        </Button>

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
                                handleAccountNavigation()
                            }}
                            onContextMenu={handleAccountContextMenu}
                        >
                            <ModeAwareIconLabel
                                icon={
                                    <PublicIcon
                                        src='/user_profile.svg'
                                        className='size-5'
                                    />
                                }
                                label='Аккаунт'
                            />
                        </Button>
                        {showAdminLink && (
                            <Button
                                variant='ghost'
                                className='w-full justify-start'
                                onClick={() => {
                                    setShowMobileMenu(false)
                                    navigate('/admin')
                                }}
                            >
                                Админ-панель
                            </Button>
                        )}
                        <Button
                            variant='ghost'
                            className='w-full justify-start'
                            onClick={() => {
                                setShowMobileMenu(false)
                                void handleAuthNavigation()
                            }}
                        >
                            {isAuthenticated ? 'Сменить аккаунт' : 'Войти'}
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

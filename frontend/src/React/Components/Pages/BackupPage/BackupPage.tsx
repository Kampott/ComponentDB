import { ArrowLeft, RefreshCw, Square, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import ViewEntityInfo from '@Components/Forms/ViewEntityInfo.tsx'
import BackupVerificationPanel from '@Components/Pages/AdminPage/BackupsSection/BackupVerificationPanel.tsx'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import { backupUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import { userCanAccessAdmin, type Backup } from '@Schemas'
import { useServicesStore, useToastStore, useUserStore } from '@StorageImpl'

function BackupPage() {
    const navigate = useNavigate()
    const { backupId } = useParams<{ backupId: string }>()
    const services = useServicesStore(state => state.services)
    const addToast = useToastStore(state => state.addToast)
    const user = useUserStore(state => state.user)
    const isAuthenticated = useUserStore(state => state.isAuthenticated)
    const authResolved = useUserStore(state => state.authResolved)

    const [backup, setBackup] = useState<Backup | null>(null)
    const [verifyHash, setVerifyHash] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)

    const canAccessPage = userCanAccessAdmin(user)

    const showError = useCallback(
        (message: string) => {
            addToast('Ошибка', message)
        },
        [addToast],
    )

    const handleError = useCallback(
        (error: unknown) => {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: showError,
            })
        },
        [navigate, showError],
    )

    const loadBackup = useCallback(async () => {
        if (!backupId) {
            navigate('/404')
            return
        }

        setBackup(null)

        try {
            setBackup(await services.backupService.readBackup(Number(backupId)))
        } catch (error) {
            handleError(error)
        }
    }, [backupId, handleError, navigate, services.backupService])

    useEffect(() => {
        if (!authResolved) {
            return
        }

        if (!isAuthenticated || !canAccessPage) {
            navigate('/account')
            return
        }

        void loadBackup()
    }, [authResolved, canAccessPage, isAuthenticated, loadBackup, navigate])

    async function handleRefresh() {
        setIsRefreshing(true)

        try {
            await loadBackup()
        } finally {
            setIsRefreshing(false)
        }
    }

    async function handleVerifyBackup() {
        if (!backup) {
            return
        }

        setIsVerifying(true)

        try {
            await services.backupService.verifyBackup(backup.backup_id, {
                verify_hash: verifyHash,
            })
            await loadBackup()
            addToast(
                'Проверка завершена',
                `Бэкап #${backup.backup_id} успешно проверен`,
            )
        } catch (error) {
            handleError(error)
        } finally {
            setIsVerifying(false)
        }
    }

    async function handleDeleteBackup() {
        if (!backup) {
            return
        }

        setIsDeleting(true)

        try {
            await services.backupService.deleteBackup(backup.backup_id)
            addToast(
                'Бэкап удалён',
                `Бэкап #${backup.backup_id} удалён из списка`,
            )
            navigate('/admin?tab=backups')
        } catch (error) {
            handleError(error)
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleCancelBackup() {
        if (!backup) {
            return
        }

        setIsCancelling(true)

        try {
            const response = await services.backupService.cancelBackup(
                backup.backup_id,
            )
            addToast(
                'Операция завершена',
                response.message ??
                    `Запрос на остановку бэкапа #${backup.backup_id} отправлен`,
            )
            await loadBackup()
        } catch (error) {
            handleError(error)
        } finally {
            setIsCancelling(false)
        }
    }

    if (!authResolved) {
        return null
    }

    if (!isAuthenticated || !canAccessPage) {
        return null
    }

    return (
        <div className='mx-auto mt-4 w-full max-w-5xl px-4'>
            <LoadEffect
                data={backup}
                contentSize={{ width: '100%', height: '32px' }}
            >
                <div className='space-y-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                        <div>
                            <h1 className='text-3xl font-semibold'>
                                {backup
                                    ? `Бэкап #${backup.backup_id}`
                                    : 'Бэкап'}
                            </h1>
                            <p className='text-muted-foreground text-sm'>
                                Подробная информация о резервной копии.
                            </p>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => navigate('/admin?tab=backups')}
                            >
                                <ArrowLeft />К списку
                            </Button>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                            >
                                <RefreshCw
                                    className={
                                        isRefreshing
                                            ? 'animate-spin'
                                            : undefined
                                    }
                                />
                                Обновить
                            </Button>
                            {backup &&
                                (backup.status === 'queued' ||
                                    backup.status === 'running') && (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={handleCancelBackup}
                                        disabled={isCancelling}
                                    >
                                        <Square />
                                        Остановить
                                    </Button>
                                )}
                            {backup && (
                                <Button
                                    type='button'
                                    variant='destructive'
                                    onClick={handleDeleteBackup}
                                    disabled={isDeleting}
                                >
                                    <Trash2 />
                                    Удалить
                                </Button>
                            )}
                        </div>
                    </div>

                    {backup && (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Детали бэкапа</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ViewEntityInfo
                                        uiSchema={backupUiSchema}
                                        context={{}}
                                        source={backup}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Операции</CardTitle>
                                    <CardDescription>
                                        Дополнительные действия для сохранённого
                                        бэкапа.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <BackupVerificationPanel
                                        backup={backup}
                                        verifyHash={verifyHash}
                                        isVerifying={isVerifying}
                                        onVerifyHashChange={setVerifyHash}
                                        onVerify={handleVerifyBackup}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </LoadEffect>
        </div>
    )
}

export default BackupPage

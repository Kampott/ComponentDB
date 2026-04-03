import { ShieldCheck } from 'lucide-react'

import { Button } from '@Components/ui/button'
import { Checkbox } from '@Components/ui/checkbox'
import { Label } from '@Components/ui/label'
import type { Backup } from '@Schemas'

interface Props {
    backup: Backup
    verifyHash: boolean
    isVerifying: boolean
    onVerifyHashChange: (value: boolean) => void
    onVerify: () => void
}

function BackupVerificationPanel({
    backup,
    verifyHash,
    isVerifying,
    onVerifyHashChange,
    onVerify,
}: Props) {
    if (!(backup.info?.kind === 'store' && backup.info.store_info)) {
        return null
    }

    return (
        <div className='space-y-3 rounded-lg border p-4'>
            <p className='text-sm font-medium'>Проверка сохранённого бэкапа</p>
            <div className='flex items-center gap-2'>
                <Checkbox
                    id='verify-backup-hash'
                    checked={verifyHash}
                    onCheckedChange={checked =>
                        onVerifyHashChange(Boolean(checked))
                    }
                    disabled={isVerifying}
                />
                <Label htmlFor='verify-backup-hash'>Проверить хэш</Label>
            </div>
            <Button
                type='button'
                variant='outline'
                onClick={onVerify}
                disabled={isVerifying}
            >
                <ShieldCheck />
                Проверить бэкап
            </Button>
        </div>
    )
}

export default BackupVerificationPanel

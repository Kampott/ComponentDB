import { Plus } from 'lucide-react'
import { type ReactNode } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import PublicIcon from '@Components/Common/PublicIcon.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import { Button } from '@Components/ui/button'
import type { ObjectInstance } from '@Schemas'

interface Props {
    instance: ObjectInstance
}

function InstanceDocumentsTab({ instance }: Props): ReactNode {
    const documents = [
        `Документ${instance.id}.pdf`,
        'Отчет_апрель.docx',
        'Спецификация.xlsx',
    ]

    function renderDocument(doc: string): ReactNode {
        return (
            <div className='flex w-full items-center justify-between gap-2'>
                <Button
                    variant='link'
                    className='h-auto p-0 text-left'
                    onClick={() => console.log(`Открыть ${doc}`)}
                    aria-label={`Перейти к ${doc}`}
                >
                    {doc}
                </Button>
                <button
                    type='button'
                    className='text-muted-foreground hover:text-foreground transition-colors'
                    onClick={() => console.log(`Скачать ${doc}`)}
                    aria-label={`Скачать ${doc}`}
                >
                    <PublicIcon
                        src='/download_icon.svg'
                        alt=''
                        className='size-5'
                    />
                </button>
            </div>
        )
    }

    return (
        <>
            <ToolbarActionButton
                type='button'
                className='mt-4'
                variant='default'
                icon={<Plus />}
                label='Добавить документ'
                aria-label='Добавить документ'
            />
            <LoadEffect
                data={documents}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={documents ? documents : []}
                    renderItem={renderDocument}
                />
            </LoadEffect>
        </>
    )
}

export default InstanceDocumentsTab

import { type ReactNode } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { Button } from '@Components/ui/button'
import type { Object } from '@Schemas'

interface Props {
    object: Object
}

function ObjectDocumentsTab({ object }: Props): ReactNode {
    const documents = [
        `Документ${object.id}.pdf`,
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
                    <img
                        src='/download_icon.svg'
                        alt='Скачать'
                        width={20}
                        height={20}
                    />
                </button>
            </div>
        )
    }

    return (
        <>
            <Button className='mt-4'>Добавить документ</Button>
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

export default ObjectDocumentsTab

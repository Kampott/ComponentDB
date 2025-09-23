import {type ReactNode} from "react";

import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

import DefaultList from "../../Common/DefaultList.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {Object} from "../../../schemas/Object.ts";

interface Props {
    object: Object;
}

function ObjectDocumentsTab({object}: Props): ReactNode {
    const documents = [
        `Документ${object.id}.pdf`,
        'Отчет_апрель.docx',
        'Спецификация.xlsx'
    ];

    function renderDocument(doc: string): ReactNode {
        return (
            <>
                <Button
                    variant="link"
                    className="p-0"
                    onClick={() => console.log(`Скачать ${doc}`)}
                    aria-label={`Перейти к ${doc}`}
                >{doc}</Button>
                <Button
                    variant="link"
                    className="p-0"
                    onClick={() => console.log(`Скачать ${doc}`)}
                    aria-label={`Скачать ${doc}`}
                >
                    <Image
                        src="/download_icon.svg"
                        alt="Скачать"
                        width={24}
                        height={24}
                        style={{cursor: 'pointer'}}
                        className="opacity-75"
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
                    />
                </Button>
            </>
        )
    }

    return (
        <>
            <Button variant="primary" className="mt-4">Добавить документ</Button>
            <LoadEffect data={documents} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={documents ? documents : []}
                             onClick={null}
                             renderItem={renderDocument}
                />
            </LoadEffect>
        </>
    );
}

export default ObjectDocumentsTab;
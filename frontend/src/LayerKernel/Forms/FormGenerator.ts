import type { FieldType, FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import {
    filterSchemaMetaForAdd,
    type SchemaAdd,
    type SchemaMeta,
} from '@RestSchemas'

export async function generateAddFormFromMeta<Schema>(
    schemaMeta: SchemaMeta<Schema>,
    optionsArgs: Partial<Record<keyof SchemaAdd<Schema>, number>>,
    defaultValuesArgs: Partial<
        Record<
            keyof SchemaAdd<Schema>,
            SchemaAdd<Schema>[keyof SchemaAdd<Schema>]
        >
    >,
) {
    type Field = keyof SchemaAdd<Schema>

    const schemaAddMeta = filterSchemaMetaForAdd(schemaMeta)
    const formFields: FormField<SchemaAdd<Schema>, Field>[] = []
    const defaultData: SchemaAdd<Schema> = {} as SchemaAdd<Schema>

    for (const field of Object.keys(schemaAddMeta) as Field[]) {
        const fieldMeta = schemaAddMeta[field]

        // При наличии default - задаём его таковым
        let defaultValue: SchemaAdd<Schema>[typeof field] | undefined
        if (defaultValuesArgs[field] && fieldMeta.defaultValue) {
            defaultValue = (await fieldMeta.defaultValue(
                defaultValuesArgs[field] as SchemaAdd<Schema>[Field],
            )) as SchemaAdd<Schema>[typeof field]
            defaultData[field] = defaultValue
        }

        // Если параметр нельзя задавать явно - значит, он часть "метаданных" формы и не отображается - скип
        if (!fieldMeta.canBeSetExplicitly) {
            continue
        }

        // Иначе параметр можно отобразить и можно проверять наличие options
        let options:
            | { label: string; value: SchemaAdd<Schema>[typeof field] }[]
            | undefined = undefined

        // Если у поля есть способ задать options и они параметр к ним задан в optionsArgs - загружаем их
        if (fieldMeta.options && field in optionsArgs) {
            options = (await fieldMeta.options(optionsArgs[field]!)).map(o => ({
                label: o.label,
                value: o.value as SchemaAdd<Schema>[typeof field], // каст безопасен
            }))
        }

        // Выбираем тип input
        const type: FormField<Schema, Field>['type'] = options
            ? 'select'
            : (typeof defaultValue as FieldType)

        formFields.push({
            bindData: field as keyof SchemaAdd<Schema>,
            label: fieldMeta.displayName,
            type,
            placeholder: fieldMeta.description,
            validator: fieldMeta.validators?.[0],
            options: options,
        })
    }

    return { formFields, defaultData }
}

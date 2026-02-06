import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import {
    getCreateFieldKeys,
    getUpdateFieldKeys,
    type CreateFieldKeys,
    type EntityFields,
    type EntityInputType,
    type EntitySchema,
    type InferCreate,
    type InferUpdate,
    type UpdateFieldKeys,
} from '@RestSchemas'

/**
 * Базовый fallback-парсер для полей, которые не являются "select"
 * Для select значение определяется сравнением с загруженными опциями,
 * потому что браузер всегда возвращает строку из <select>
 */
function createPrimitiveParser<Value>(
    input: EntityInputType,
): ((rawValue: unknown) => Value) | undefined {
    switch (input) {
        case 'number':
            return (rawValue: unknown) => Number(rawValue) as Value
        case 'boolean':
            return (rawValue: unknown) => {
                if (typeof rawValue === 'string') {
                    return (rawValue === 'true') as Value
                }
                return Boolean(rawValue) as Value
            }
        default:
            return undefined
    }
}

async function resolveFormFields<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
    Model extends object,
    Field extends keyof Fields & keyof Model,
>(
    schema: EntitySchema<Schema, Context, Fields>,
    context: Context,
    fieldKeys: Field[],
    defaultData: Partial<Record<PropertyKey, unknown>>,
    mode: 'create' | 'update',
) {
    const formFields: FormField<Model, Field>[] = []

    for (const field of fieldKeys) {
        const fieldMeta = schema.fields[field as keyof Fields]
        let options:
            | {
                  label: string
                  value: Model[Field]
              }[]
            | undefined

        if (fieldMeta.options) {
            const loadedOptions = (await fieldMeta.options(
                context,
            )) as unknown as {
                label: string
                value: Model[Field]
            }[]
            options = loadedOptions.map(option => ({
                label: option.label,
                value: option.value,
            }))
        }

        if (!Object.prototype.hasOwnProperty.call(defaultData, field)) {
            if (fieldMeta.defaultValue) {
                defaultData[field as PropertyKey] =
                    (await fieldMeta.defaultValue(context)) as unknown
            } else if (options && options.length > 0) {
                defaultData[field as PropertyKey] = options[0].value as unknown
            }
        }

        const isVisible =
            mode === 'create'
                ? fieldMeta.createVisible !== false
                : fieldMeta.updateVisible !== false
        if (!isVisible) {
            continue
        }

        let parser: FormField<Model, Field>['parser']
        if (options && options.length > 0) {
            parser = (rawValue: unknown) => {
                const selected = options.find(
                    option => String(option.value) === String(rawValue),
                )
                return (selected ? selected.value : rawValue) as Model[Field]
            }
        } else {
            parser = createPrimitiveParser<Model[Field]>(fieldMeta.input)
        }

        formFields.push({
            bindData: field,
            label: fieldMeta.label,
            type: options ? 'select' : fieldMeta.input,
            placeholder: fieldMeta.description,
            options: options,
            validator: fieldMeta.validator as FormField<
                Model,
                Field
            >['validator'],
            parser: parser,
        })
    }

    return formFields
}

export async function generateCreateFormFromSchema<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>(
    schema: EntitySchema<Schema, Context, Fields>,
    context: Context,
    defaults: Partial<InferCreate<EntitySchema<Schema, Context, Fields>>> = {},
) {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>
    type CreateModel = InferCreate<SchemaDefinition>
    type Field = CreateFieldKeys<SchemaDefinition>

    const defaultData: Partial<Record<PropertyKey, unknown>> = {
        ...defaults,
    }
    const createFields = getCreateFieldKeys(schema) as Field[]

    const formFields = await resolveFormFields<
        Schema,
        Context,
        Fields,
        CreateModel,
        Field
    >(schema, context, createFields, defaultData, 'create')

    return {
        formFields,
        defaultData: defaultData as unknown as CreateModel,
    }
}

export async function generateUpdateFormFromSchema<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>(
    schema: EntitySchema<Schema, Context, Fields>,
    context: Context,
    source: Schema,
    defaults: Partial<InferUpdate<EntitySchema<Schema, Context, Fields>>> = {},
) {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>
    type UpdateModel = InferUpdate<SchemaDefinition>
    type Field = UpdateFieldKeys<SchemaDefinition>

    const updateFields = getUpdateFieldKeys(schema) as Field[]
    const defaultData: Partial<Record<PropertyKey, unknown>> = {
        ...defaults,
    }

    const sourceData = source as Record<PropertyKey, unknown>

    for (const field of updateFields) {
        if (
            !Object.prototype.hasOwnProperty.call(defaultData, field) &&
            sourceData[field as PropertyKey] !== undefined
        ) {
            defaultData[field as PropertyKey] = sourceData[field as PropertyKey]
        }
    }

    const formFields = await resolveFormFields<
        Schema,
        Context,
        Fields,
        UpdateModel,
        Field
    >(schema, context, updateFields, defaultData, 'update')

    return {
        formFields,
        defaultData: defaultData as unknown as UpdateModel,
    }
}

import type { FormField } from '@Kernel/Forms/FormTypes.ts'
import {
    getCreateFieldKeys,
    getUpdateFieldKeys,
    type CreateFieldKeys,
    type EntityFields,
    type EntityInputType,
    type EntitySchema,
    type InferCreate,
    type InferEntity,
    type InferUpdate,
    type UpdateFieldKeys,
} from '@Schemas'

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

        if (fieldMeta.form.options) {
            const loadedOptions = (await fieldMeta.form.options(
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
            if (fieldMeta.create.defaultValue) {
                defaultData[field as PropertyKey] =
                    (await fieldMeta.create.defaultValue(context)) as unknown
            } else if (options && options.length > 0) {
                defaultData[field as PropertyKey] = options[0].value as unknown
            }
        }

        const isVisible =
            mode === 'create'
                ? fieldMeta.create.visible !== false
                : fieldMeta.update.visible !== false
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
            parser = fieldMeta.form.parser
                ? (rawValue: unknown) =>
                      fieldMeta.form.parser!(
                          rawValue,
                          context,
                      ) as unknown as Model[Field]
                : createPrimitiveParser<Model[Field]>(fieldMeta.form.input)
        }

        formFields.push({
            bindData: field,
            label: fieldMeta.common.label,
            type: options ? 'select' : fieldMeta.form.input,
            placeholder: fieldMeta.common.description,
            options: options,
            validator: fieldMeta.form.validator as FormField<
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

export type ReadViewField = {
    key: string
    label: string
    value: string
}

function printPrimitiveValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '—'
    }
    if (typeof value === 'boolean') {
        return value ? 'Да' : 'Нет'
    }
    return String(value)
}

export async function generateReadViewFromSchema<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>(
    schema: EntitySchema<Schema, Context, Fields>,
    context: Context,
    source: InferEntity<EntitySchema<Schema, Context, Fields>>,
) {
    const sourceData = source as Record<PropertyKey, unknown>
    const result: ReadViewField[] = []

    for (const key of Object.keys(schema.fields) as (keyof Fields)[]) {
        const fieldMeta = schema.fields[key]
        if (fieldMeta.read?.visible === false) {
            continue
        }

        const rawValue = sourceData[key as PropertyKey]
        const printedValue = fieldMeta.read?.printValue
            ? await (
                  fieldMeta.read.printValue as (
                      value: unknown,
                      context: Context,
                  ) => string | Promise<string>
              )(rawValue, context)
            : printPrimitiveValue(rawValue)

        result.push({
            key: String(key),
            label: fieldMeta.common.label,
            value: printedValue,
        })
    }

    return result
}

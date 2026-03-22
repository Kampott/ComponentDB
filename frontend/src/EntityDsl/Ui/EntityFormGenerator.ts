import type { ReactNode } from 'react'

import {
    getCreateFieldKeys,
    getUpdateFieldKeys,
    type CreateFieldKeys,
    type EntityCoreSchema,
    type InferCreate,
    type InferEntity,
    type InferUpdate,
    type UpdateFieldKeys,
} from '@EntityDsl/Core'
import type {
    EntityInputType,
    EntityUiFields,
    EntityUiSchema,
} from '@EntityDsl/Ui'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'

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
    S extends EntityCoreSchema<any, any, any>,
    Model extends object,
    Field extends keyof EntityUiFields<S> & keyof Model,
>(
    uiSchema: EntityUiSchema<S>,
    context: import('@EntityDsl/Core').EntityContext<S>,
    fieldKeys: Field[],
    defaultData: Partial<Record<PropertyKey, unknown>>,
    mode: 'create' | 'update',
) {
    const formFields: FormField<Model, Field>[] = []

    for (const field of fieldKeys) {
        const fieldMeta = uiSchema.fields[field]
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
            const defaultValueResolver =
                mode === 'create'
                    ? fieldMeta.create?.defaultValue
                    : fieldMeta.update?.defaultValue

            if (defaultValueResolver) {
                defaultData[field as PropertyKey] = (await defaultValueResolver(
                    context,
                )) as unknown
            } else if (options && options.length > 0) {
                defaultData[field as PropertyKey] = options[0].value as unknown
            }
        }

        const isVisible =
            mode === 'create'
                ? fieldMeta.create?.visible !== false
                : fieldMeta.update?.visible !== false
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
    S extends EntityCoreSchema<any, any, any>,
>(
    schema: S,
    uiSchema: EntityUiSchema<S>,
    context: import('@EntityDsl/Core').EntityContext<S>,
    defaults: Partial<InferCreate<S>> = {},
) {
    type CreateModel = InferCreate<S>
    type Field = CreateFieldKeys<S>

    const defaultData: Partial<Record<PropertyKey, unknown>> = {
        ...defaults,
    }
    const createFields = getCreateFieldKeys(schema) as Field[]

    const formFields = await resolveFormFields<S, CreateModel, Field>(
        uiSchema,
        context,
        createFields,
        defaultData,
        'create',
    )

    return {
        formFields,
        defaultData: defaultData as CreateModel,
    }
}

export async function generateUpdateFormFromSchema<
    S extends EntityCoreSchema<any, any, any>,
>(
    schema: S,
    uiSchema: EntityUiSchema<S>,
    context: import('@EntityDsl/Core').EntityContext<S>,
    source: InferEntity<S>,
    defaults: Partial<InferUpdate<S>> = {},
) {
    type UpdateModel = InferUpdate<S>
    type Field = UpdateFieldKeys<S>

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

    const formFields = await resolveFormFields<S, UpdateModel, Field>(
        uiSchema,
        context,
        updateFields,
        defaultData,
        'update',
    )

    return {
        formFields,
        defaultData: defaultData as UpdateModel,
    }
}

export type ReadViewField = {
    key: string
    label: string
    value: ReactNode
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
    S extends EntityCoreSchema<any, any, any>,
>(
    uiSchema: EntityUiSchema<S>,
    context: import('@EntityDsl/Core').EntityContext<S>,
    source: InferEntity<S>,
) {
    const sourceData = source as Record<PropertyKey, unknown>
    const result: ReadViewField[] = []

    for (const key of Object.keys(
        uiSchema.fields,
    ) as (keyof EntityUiFields<S>)[]) {
        const fieldMeta = uiSchema.fields[key]
        if (fieldMeta.read?.visible === false) {
            continue
        }

        const rawValue = sourceData[key as PropertyKey]
        const printedValue = fieldMeta.read?.printValue
            ? await (
                  fieldMeta.read.printValue as (
                      value: unknown,
                      context: import('@EntityDsl/Core').EntityContext<S>,
                  ) => ReactNode | Promise<ReactNode>
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

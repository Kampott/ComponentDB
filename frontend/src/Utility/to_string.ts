import type { Object, ObjectInstance } from '@Schemas'

export function toString(obj: Object | ObjectInstance | null): string {
    return obj?.name ? obj.name : `ID${obj?.id}`
}

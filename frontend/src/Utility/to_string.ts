import type { Object, ObjectInstance } from '@RestSchemas'

export function toString(obj: Object | ObjectInstance | null): string {
    return obj?.name ? obj.name : `ID${obj?.id}`
}

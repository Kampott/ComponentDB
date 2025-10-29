import type { Object } from '@/Schemas/Object.ts'
import type { ObjectInstance } from '@/Schemas/ObjectInstance.ts'

export function toString(obj: Object | ObjectInstance | null): string {
    return obj?.name ? obj.name : `ID${obj?.id}`
}

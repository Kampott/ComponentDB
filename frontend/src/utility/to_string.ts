import type {Object} from "../schemas/Object.ts";
import type {ObjectInstance} from "../schemas/ObjectInstance.ts";

export function toString(obj: Object | ObjectInstance | null): string {
    return obj?.name ? obj.name : `ID${obj?.id}`;
}

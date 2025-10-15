import type {Object} from "../schemas/Object.ts";

function objectToString(object: Object | null): string {
    return object?.name ? object.name : `ID${object?.id}`;
}

export default objectToString;

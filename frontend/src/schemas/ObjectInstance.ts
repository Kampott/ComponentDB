export interface ObjectInstanceAdd {
    object_id: number
    is_active: boolean
}

export interface ObjectInstance extends ObjectInstanceAdd {
    id: number
    type_id: number
}

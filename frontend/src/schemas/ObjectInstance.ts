export interface ObjectInstanceAdd {
    name: string
    object_id: number
    parent_id: number | null
    is_active: boolean
}

export interface ObjectInstance extends ObjectInstanceAdd {
    id: number
    root_id: number
}

export interface ObjectInstanceUpdate {
    name: string
    is_active: boolean
}

export interface ObjectTypeAdd {
    name: string
    parent_id: number | null
}

export interface ObjectType extends ObjectTypeAdd {
    id: number
    index_of_layer: number
    root_id: number
}

export interface ObjectTypeUpdate {
    name?: string
}

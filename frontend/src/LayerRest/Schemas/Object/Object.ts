export interface ObjectAdd {
    name: string
    type_id: number
    parent_id: number | null
}

export interface Object extends ObjectAdd {
    id: number
    index_of_layer: number
    root_id: number
}

export interface ObjectUpdate {
    name?: string
    type_id?: number
}

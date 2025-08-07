
export interface ObjectAdd {
    type_id: number
    parent_id: number
}

export interface Object extends ObjectAdd {
    id: number
    index_of_layer: number
    root_id: number
}

export interface ObjectWithChildren {
    id: number
    type_id: number
    type_name: string
    children: ObjectWithChildren[];
}


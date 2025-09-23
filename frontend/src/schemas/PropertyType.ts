export interface PropertyTypeAdd {
    type_id: number
    is_static: boolean
    name: string
}

export interface PropertyType extends PropertyTypeAdd {
    id: number
}

export interface PropertyAdd {
    property_id: number
    value: string
    object_id: number
}

export interface Property extends PropertyAdd {
    id: number
}
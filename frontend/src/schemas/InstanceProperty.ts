export interface InstancePropertyAdd {
    value: string
    instance_id: number
}

export interface InstanceProperty extends InstancePropertyAdd {
    id: number
}

export interface InstancePropertyUpdate {
    value: string
}

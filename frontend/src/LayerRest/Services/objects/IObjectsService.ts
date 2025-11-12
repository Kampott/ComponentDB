import type {
    Object,
    ObjectAdd,
    ObjectInstance,
    ObjectUpdate,
} from '@RestSchemas'

export default interface IObjectsService {
    getObjects(): Promise<Object[]>

    getObjectById(id: number): Promise<Object>

    addObject(object: ObjectAdd): Promise<ObjectAdd>

    updateObject(id: number, data: ObjectUpdate): Promise<Object>

    deleteObject(id: number): Promise<null>

    getObjectsByParentId(parentId: number): Promise<Object[]>

    getObjectsByTypeId(typeId: number): Promise<Object[]>

    createInstance(rootObjectId: number): Promise<ObjectInstance>
}

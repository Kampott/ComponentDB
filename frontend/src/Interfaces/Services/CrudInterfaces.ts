import type { EntityQueryParams } from '@EntityDsl/Core'

export type CrudQuery = EntityQueryParams

export interface IListService<Entity, Query extends CrudQuery = CrudQuery> {
    list(query?: Query): Promise<Entity[]>
}

export interface IReadService<Entity> {
    read(id: number): Promise<Entity>
}

export interface ICreateService<Entity, CreateData> {
    create(data: CreateData): Promise<Entity>
}

export interface IUpdateService<Entity, UpdateData> {
    update(id: number, data: UpdateData): Promise<Entity>
}

export interface IDeleteService {
    delete(id: number): Promise<null>
}

export interface ICrudService<
    Entity,
    CreateData,
    UpdateData,
    Query extends CrudQuery = CrudQuery,
>
    extends
        IListService<Entity, Query>,
        IReadService<Entity>,
        ICreateService<Entity, CreateData>,
        IUpdateService<Entity, UpdateData>,
        IDeleteService {}

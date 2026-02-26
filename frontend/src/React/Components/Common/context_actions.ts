import type { ContextMenuOptions, OnObjectActionFunc } from '@Storage'

export interface ContextActionSet<T> {
    onViewRequest?: OnObjectActionFunc<T>
    onAddRequest?: OnObjectActionFunc<T>
    onChangeRequest?: OnObjectActionFunc<T>
    onDeleteRequest?: OnObjectActionFunc<T>
    extraOptions?: ContextMenuOptions<T>
}

export function buildContextMenuOptions<T>({
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
    extraOptions,
}: ContextActionSet<T>): ContextMenuOptions<T> {
    return {
        Посмотреть: onViewRequest,
        Добавить: onAddRequest,
        Изменить: onChangeRequest,
        Удалить: onDeleteRequest,
        ...(extraOptions ?? {}),
    }
}

export function hasContextMenuActions<T>(
    options: ContextMenuOptions<T>,
): boolean {
    return Object.values(options).some(Boolean)
}

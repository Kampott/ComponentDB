import { useEffect, useMemo, useState } from 'react'

export function usePagination<T>(items: T[], pageSize: number) {
    const [page, setPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages)
        }
    }, [page, totalPages])

    useEffect(() => {
        setPage(1)
    }, [items.length, pageSize])

    const visibleItems = useMemo(() => {
        const from = (page - 1) * pageSize
        return items.slice(from, from + pageSize)
    }, [items, page, pageSize])

    return {
        page,
        setPage,
        totalPages,
        visibleItems,
    }
}

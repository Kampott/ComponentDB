import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@Components/ui/pagination'
import type { ReactNode } from 'react'

interface Props {
    page: number
    totalPages: number
    onPageChange: (page: number) => void
}

function PaginationControls({
    page,
    totalPages,
    onPageChange,
}: Props): ReactNode {
    return (
        <Pagination className='mt-4'>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href='#'
                        aria-disabled={page <= 1}
                        className={
                            page <= 1
                                ? 'pointer-events-none opacity-50'
                                : undefined
                        }
                        onClick={event => {
                            event.preventDefault()
                            if (page <= 1) {
                                return
                            }
                            onPageChange(Math.max(1, page - 1))
                        }}
                    />
                </PaginationItem>
                <PaginationItem>
                    <PaginationLink size='default' isActive>
                        {page} / {totalPages}
                    </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                    <PaginationNext
                        href='#'
                        aria-disabled={page >= totalPages}
                        className={
                            page >= totalPages
                                ? 'pointer-events-none opacity-50'
                                : undefined
                        }
                        onClick={event => {
                            event.preventDefault()
                            if (page >= totalPages) {
                                return
                            }
                            onPageChange(Math.min(totalPages, page + 1))
                        }}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}

export default PaginationControls

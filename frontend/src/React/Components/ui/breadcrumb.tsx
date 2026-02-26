import { ChevronRight } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils.ts'

function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
    return (
        <nav
            aria-label='breadcrumb'
            data-slot='breadcrumb'
            className={cn('', className)}
            {...props}
        />
    )
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
    return (
        <ol
            data-slot='breadcrumb-list'
            className={cn(
                'text-muted-foreground flex items-center gap-1.5 text-sm',
                className,
            )}
            {...props}
        />
    )
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
    return (
        <li
            data-slot='breadcrumb-item'
            className={cn('inline-flex items-center gap-1.5', className)}
            {...props}
        />
    )
}

function BreadcrumbLink({
    className,
    to,
    ...props
}: React.ComponentProps<'a'> & { to: string }) {
    return (
        <Link
            data-slot='breadcrumb-link'
            to={to}
            className={cn('hover:text-foreground transition-colors', className)}
            {...props}
        />
    )
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            role='link'
            aria-disabled='true'
            aria-current='page'
            data-slot='breadcrumb-page'
            className={cn('text-foreground font-normal', className)}
            {...props}
        />
    )
}

function BreadcrumbSeparator({
    className,
    children,
    ...props
}: React.ComponentProps<'li'>) {
    return (
        <li
            role='presentation'
            aria-hidden='true'
            data-slot='breadcrumb-separator'
            className={cn('[&>svg]:size-3.5', className)}
            {...props}
        >
            {children ?? <ChevronRight />}
        </li>
    )
}

export {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
}

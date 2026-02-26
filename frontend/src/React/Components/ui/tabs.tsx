import { Tabs as TabsPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils.ts'

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot='tabs'
            className={cn('flex flex-col gap-2', className)}
            {...props}
        />
    )
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot='tabs-list'
            className={cn(
                'bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-start rounded-lg p-1',
                className,
            )}
            {...props}
        />
    )
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot='tabs-trigger'
            className={cn(
                'data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[calc(100%-2px)] flex-1 items-center justify-center rounded-md border border-transparent px-3 py-1 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    )
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot='tabs-content'
            className={cn('outline-none', className)}
            {...props}
        />
    )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }

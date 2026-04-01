import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@Components/ui/tooltip'

interface Props {
    text: string
    maxLength: number
    className?: string
}

function TruncatedText({ text, maxLength, className }: Props): ReactNode {
    const textRef = useRef<HTMLSpanElement | null>(null)
    const [isOverflowing, setIsOverflowing] = useState(false)
    const normalizedText = text.trim()
    const shouldTruncate = normalizedText.length > maxLength
    const displayText = shouldTruncate
        ? `${normalizedText.slice(0, maxLength).trimEnd()}...`
        : normalizedText

    useEffect(() => {
        const element = textRef.current
        if (!element) {
            return
        }

        function updateOverflowState() {
            const currentElement = textRef.current
            if (!currentElement) {
                return
            }

            setIsOverflowing(
                currentElement.scrollWidth > currentElement.clientWidth,
            )
        }

        updateOverflowState()

        const resizeObserver = new ResizeObserver(() => {
            updateOverflowState()
        })
        resizeObserver.observe(element)

        return () => {
            resizeObserver.disconnect()
        }
    }, [displayText])

    const content = (
        <span
            ref={textRef}
            className={cn(
                'block max-w-full overflow-hidden text-ellipsis whitespace-nowrap',
                className,
            )}
        >
            {displayText}
        </span>
    )

    if (!shouldTruncate && !isOverflowing) {
        return content
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent className='max-w-sm break-words whitespace-normal'>
                {normalizedText}
            </TooltipContent>
        </Tooltip>
    )
}

export default TruncatedText

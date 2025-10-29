import { useEffect, useRef } from 'react'

import { Dropdown } from 'react-bootstrap'

import { useContextMenuStore } from '@/Storages/Zustand.ts'

function ContextMenu() {
    const { visible, position, elementData, contextMenuOptions, hideMenu } =
        useContextMenuStore()

    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                hideMenu()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () =>
            document.removeEventListener('mousedown', handleClickOutside)
    }, [hideMenu])

    console.log('hii')

    function handleOptionClick(option: string) {
        const action = contextMenuOptions![option]
        if (action) {
            action(elementData)
        }
        hideMenu()
    }

    return (
        <Dropdown.Menu
            show={visible}
            ref={menuRef}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                zIndex: 9999,
            }}
        >
            {contextMenuOptions &&
                Object.keys(contextMenuOptions).map((option, idx) => (
                    <Dropdown.Item
                        key={idx}
                        onClick={() => handleOptionClick(option)}
                    >
                        {option}
                    </Dropdown.Item>
                ))}
            <Dropdown.Divider />
            <Dropdown.Item onClick={() => hideMenu()}>Закрыть</Dropdown.Item>
        </Dropdown.Menu>
    )
}

export default ContextMenu

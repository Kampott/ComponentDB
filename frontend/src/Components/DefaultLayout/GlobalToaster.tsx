import { Toast, ToastContainer } from 'react-bootstrap'

import { useToastStore } from '@/Storages/Zustand/ToastsStore.ts'

function GlobalToaster() {
    const { toasts, removeToast } = useToastStore()

    return (
        <ToastContainer position='top-end' className='p-3'>
            {toasts.map(({ id, header, message }) => (
                <Toast
                    key={id}
                    onClose={() => removeToast(id)}
                    show={true}
                    delay={3000}
                    autohide
                >
                    <Toast.Header>
                        <strong className='me-auto'>{header}</strong>
                    </Toast.Header>
                    <Toast.Body>{message}</Toast.Body>
                </Toast>
            ))}
        </ToastContainer>
    )
}

export default GlobalToaster

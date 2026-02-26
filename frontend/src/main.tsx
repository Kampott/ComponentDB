import 'normalize.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@React/App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

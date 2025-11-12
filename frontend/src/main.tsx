import 'bootstrap/dist/css/bootstrap.min.css'
import 'normalize.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './LayerReact/App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)

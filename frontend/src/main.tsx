import 'normalize.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { TooltipProvider } from '@Components/ui/tooltip'
import App from '@React/App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <TooltipProvider>
            <App />
        </TooltipProvider>
    </StrictMode>,
)

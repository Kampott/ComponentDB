import { create } from 'zustand/react'

import type { IServicesStore } from '@/LayerKernel/Storage/Interfaces'
import Services from '@Rest/Services/Services.ts'

export const useServicesStore = create<IServicesStore>(() => ({
    services: new Services(),
}))

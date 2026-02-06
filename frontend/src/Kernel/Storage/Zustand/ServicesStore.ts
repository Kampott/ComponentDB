import { create } from 'zustand/react'

import Services from '@Rest/Services/Services.ts'
import type { IServicesStore } from '@Storage'

export const useServicesStore = create<IServicesStore>(() => ({
    services: new Services(),
}))

import { create } from 'zustand/react'

import Services from '@/Services/Services.ts'
import type IServicesStore from '@/Storages/Interfaces/ServicesStore.ts'

export const useServicesStore = create<IServicesStore>(() => ({
    services: new Services(),
}))

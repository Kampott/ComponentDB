import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
    },
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, 'src') },
            { find: '@Components', replacement: path.resolve(__dirname, 'src/LayerReact/Components') },
            { find: '@Rest', replacement: path.resolve(__dirname, 'src/LayerRest') },
            { find: '@RestSchemas', replacement: path.resolve(__dirname, 'src/LayerRest/Schemas/index.ts') },
            { find: '@Storage', replacement: path.resolve(__dirname, 'src/LayerKernel/Storage/Interfaces/index.ts') },
            { find: '@StorageImpl', replacement: path.resolve(__dirname, 'src/LayerKernel/Storage/Zustand/index.ts') },
        ],
    },
})

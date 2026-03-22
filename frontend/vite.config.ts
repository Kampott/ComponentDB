import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
    },
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, 'src') },
            {
                find: '@EntityDsl/Core',
                replacement: path.resolve(__dirname, 'src/EntityDsl/Core/index.ts'),
            },
            {
                find: '@EntityDsl/Ui',
                replacement: path.resolve(__dirname, 'src/EntityDsl/Ui/index.ts'),
            },
            { find: '@EntityDsl', replacement: path.resolve(__dirname, 'src/EntityDsl') },
            { find: '@EntityUi', replacement: path.resolve(__dirname, 'src/React/EntityUi/index.ts') },
            { find: '@Kernel', replacement: path.resolve(__dirname, 'src/Kernel') },
            { find: '@React', replacement: path.resolve(__dirname, 'src/React') },
            { find: '@Components', replacement: path.resolve(__dirname, 'src/React/Components') },
            { find: '@Rest', replacement: path.resolve(__dirname, 'src/Rest') },
            { find: '@Schemas', replacement: path.resolve(__dirname, 'src/Kernel/Schemas/index.ts') },
            { find: '@Storage', replacement: path.resolve(__dirname, 'src/Interfaces/Storage/index.ts') },
            { find: '@StorageImpl', replacement: path.resolve(__dirname, 'src/Kernel/Storage/Zustand/index.ts') },
        ],
    },
})

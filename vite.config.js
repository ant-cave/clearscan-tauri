import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Tauri 期望固定的开发端口，且不打断终端输出
export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: false,
  },
  build: {
    target: 'es2021',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})

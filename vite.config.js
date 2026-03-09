import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const BASE_PATH = '/dawbeat/'

export default defineConfig({
  base: BASE_PATH,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __BASE_PATH__: JSON.stringify(BASE_PATH)
  },
  plugins: [
    vue(),
    tailwindcss()
  ],
})

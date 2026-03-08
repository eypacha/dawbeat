import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'
import viteImagemin from 'vite-plugin-imagemin'
import { qrcode } from 'vite-plugin-qrcode';
import webfontDownload from 'vite-plugin-webfont-dl';

const BASE_PATH = '/'

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
    tailwindcss(),
    VueDevTools(),
    qrcode(),
    webfontDownload(),
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.7, 0.9], speed: 1 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ],
})

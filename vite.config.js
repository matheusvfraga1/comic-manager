import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona no GitHub Pages (/comic-manager/) e em qualquer outro host estático
export default defineConfig({
  base: './',
  plugins: [react()],
})

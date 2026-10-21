import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // O maior bloco é o arquivo de dados importados de Insights (carregado sob demanda).
  build: { chunkSizeWarningLimit: 1000 },
})

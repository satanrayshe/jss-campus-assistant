import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import Icons from 'unplugin-icons/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths so the same build works on GitHub Pages (/jss-campus-assistant/) and localhost.
  base: './',
  plugins: [react(), tailwindcss(), Icons({ compiler: 'jsx', jsx: 'react' })],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  // `npm run dev` talks to `npm run serve` for the .env-backed AI proxy.
  server: { proxy: { '/api': 'http://localhost:3000' } },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // tailwindcss(), // Wait, I am using PostCSS plugin method as per my previous steps.
  ],
  base: './',
})

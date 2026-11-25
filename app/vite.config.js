import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' lets the build run from any sub-folder (e.g. GitHub Pages)
export default defineConfig({
  base: './',
  plugins: [react()],
})

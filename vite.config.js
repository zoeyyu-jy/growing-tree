import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/growing-tree/',
  build: {
    rollupOptions: {
      external: ['@mediapipe/hands', '@mediapipe/camera_utils'],
    }
  }
})


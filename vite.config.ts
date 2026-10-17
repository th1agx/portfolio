import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // separa os motores pesados do código do site, como a Silvia faz (react / gsap / three)
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          motion: ['motion', 'gsap', 'lenis'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // La API está en LocalStack. En dev, el proxy evita CORS.
  // En producción (S3), la URL de la API se pasa como variable de entorno VITE_API_URL.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4566',
        changeOrigin: true,
      }
    }
  }
})

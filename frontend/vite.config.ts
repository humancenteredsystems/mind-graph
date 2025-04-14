import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api requests to the backend server
      '/api': {
        target: 'http://localhost:3000', // Your backend API server address
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false,      // Optional: Set to false if backend uses self-signed certs
        // Optional: rewrite path if backend expects paths without /api prefix
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

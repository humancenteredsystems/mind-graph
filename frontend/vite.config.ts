/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: { // Add Vitest configuration
    globals: true, // Use global APIs (describe, it, expect, etc.)
    environment: 'jsdom', // Simulate DOM environment for React Testing Library
    setupFiles: './src/setupTests.ts', // Path to the setup file
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/tests/e2e/**', // Exclude E2E tests from Vitest
    ],
    // Optional: include css processing if needed for component styles affecting tests
    // css: true,
  },
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

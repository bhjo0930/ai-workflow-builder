/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts', './src/test/accessibility-setup.ts'],
    css: true,
    include: ['**/*.accessibility.test.{js,ts,jsx,tsx}']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
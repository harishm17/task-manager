import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Supabase & Auth
          'supabase': ['@supabase/supabase-js'],

          // Forms & Validation
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // UI Libraries
          'ui-vendor': [
            'framer-motion',
            'sonner',
            'clsx',
            'tailwind-merge',
          ],

          // Data & Charts
          'charts': ['recharts', '@tanstack/react-query'],

          // Utilities
          'utils': ['fuse.js'],
        },
      },
    },
    // Increase chunk size warning limit for main bundle
    chunkSizeWarningLimit: 600,
    // Use esbuild for minification (faster than terser)
    minify: 'esbuild',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
  },
})

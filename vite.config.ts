import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const vendorChunks: Record<string, string[]> = {
  react: ['react', 'react-dom', 'react-router', 'scheduler'],
  query: ['@tanstack/react-query'],
  supabase: ['@supabase/supabase-js'],
  charts: ['recharts'],
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          for (const [name, packages] of Object.entries(vendorChunks)) {
            if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return name
          }
          return undefined
        },
      },
    },
  },
})

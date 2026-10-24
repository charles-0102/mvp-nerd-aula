import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { publicConfigValid } from './src/public-config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if ((env.VITE_SUPABASE_URL || env.VITE_SUPABASE_PUBLISHABLE_KEY) && !publicConfigValid(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Configure URL Supabase e chave pública publishable/anon. Chaves secretas não são permitidas no frontend.')
  }
  return {
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/node_modules/@supabase/')) return 'supabase'
    if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react'
  } } } },
  }
})

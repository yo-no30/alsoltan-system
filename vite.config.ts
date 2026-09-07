import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

function logSupabaseEnv(): void {
  const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url || !key) {
    console.warn(
      '[build] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. The deployed app will show a configuration error until both are set in Vercel and redeployed.',
    )
    return
  }

  console.info('[build] Supabase environment variables are present.')
}

export default defineConfig(({ command }) => {
  if (command === 'build') {
    logSupabaseEnv()
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})

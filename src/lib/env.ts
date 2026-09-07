const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const supabaseEnv = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
}

export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? 'لم يتم ضبط اتصال قاعدة البيانات. في Vercel افتح Settings → Environment Variables وأضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY ثم اعمل Redeploy.'
    : null

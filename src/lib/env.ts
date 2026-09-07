function sanitizeEnvValue(value: string | undefined): string {
  if (!value) {
    return ''
  }

  let next = value.trim().replace(/^\uFEFF/, '')

  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim()
  }

  const assignment = next.match(/^VITE_SUPABASE_(?:URL|ANON_KEY)\s*=\s*(.+)$/i)
  if (assignment?.[1]) {
    next = assignment[1].trim()
  }

  return next
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value)
}

const supabaseUrl = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabaseEnv = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
}

function resolveSupabaseConfigError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'لم يتم ضبط اتصال قاعدة البيانات. في Vercel افتح Settings → Environment Variables وأضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY ثم اعمل Redeploy.'
  }

  if (supabaseUrl.startsWith('sb_') || supabaseUrl.startsWith('eyJ')) {
    return 'قيمة VITE_SUPABASE_URL خاطئة: تم وضع المفتاح بدل الرابط. الصق رابط المشروع الذي يبدأ بـ https:// وينتهي بـ .supabase.co'
  }

  if (!isHttpUrl(supabaseUrl)) {
    return 'قيمة VITE_SUPABASE_URL غير صحيحة. انسخ الرابط من Supabase → Settings → API ويجب أن يكون مثل: https://xxxx.supabase.co بدون علامات اقتباس.'
  }

  return null
}

export const supabaseConfigError: string | null = resolveSupabaseConfigError()

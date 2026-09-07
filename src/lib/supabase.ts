import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export const supabaseConfigError: string | null =
  !supabaseUrl || !supabaseAnonKey
    ? 'لم يتم ضبط اتصال قاعدة البيانات. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في إعدادات Environment Variables على Vercel ثم أعد النشر.'
    : null

if (supabaseConfigError) {
  console.error('[supabase]', supabaseConfigError)
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-placeholder-key',
)

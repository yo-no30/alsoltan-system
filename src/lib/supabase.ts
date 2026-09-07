import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { supabaseConfigError, supabaseEnv } from '@/lib/env'

export { supabaseConfigError } from '@/lib/env'

function createConfiguredClient(): SupabaseClient<Database> {
  return createClient<Database>(supabaseEnv.url, supabaseEnv.anonKey)
}

function createUnconfiguredClient(): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(
        supabaseConfigError ?? 'Supabase is not configured.',
      )
    },
  })
}

export const supabase: SupabaseClient<Database> = supabaseConfigError
  ? createUnconfiguredClient()
  : createConfiguredClient()

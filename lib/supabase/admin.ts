import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const kunci = process.env.SUPABASE_SECRET_KEY
  if (!url || !kunci) {
    throw new Error('Konfigurasi admin Supabase belum lengkap.')
  }
  return createClient(url, kunci, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
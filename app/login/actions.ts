'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(
  _prev: { error: string } | undefined,
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { error: 'Email atau password salah.' }
  }

  // Pastikan akun terdaftar dan aktif. Jika tidak, sesi dibatalkan.
  const { data: profil } = await supabase
    .from('profiles')
    .select('aktif')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profil || !profil.aktif) {
    await supabase.auth.signOut()
    return { error: 'Akun ini tidak aktif atau belum terdaftar. Hubungi admin.' }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
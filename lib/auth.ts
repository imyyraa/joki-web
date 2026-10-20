import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type Peran = 'admin' | 'cs'

export async function ambilPengguna() {
  await connection()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profil } = await supabase
    .from('profiles')
    .select('nama, peran, aktif')
    .eq('id', user.id)
    .single()
  if (!profil || !profil.aktif) return null

  return { id: user.id, nama: profil.nama as string, peran: profil.peran as Peran }
}

export async function wajibPeran(izin: Peran[]) {
  const pengguna = await ambilPengguna()
  if (!pengguna) redirect('/login')
  if (!izin.includes(pengguna.peran)) redirect('/')
  return pengguna
}
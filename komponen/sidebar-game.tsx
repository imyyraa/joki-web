import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import { logout } from '@/app/login/actions'
import { hitungBelumDibaca } from '@/lib/notifikasi'
import PanelSidebar from './panel-sidebar'

export default async function SidebarGame() {
  const supabase = await createClient()
  const pengguna = await ambilPengguna()

  const { data } = await supabase
    .from('games')
    .select('kode')
    .eq('aktif', true)
    .order('kode')
  const games = ((data ?? []) as { kode: string }[]).map((g) => g.kode)
  const belum = pengguna?.peran === 'admin' ? await hitungBelumDibaca() : 0
  return (
    <PanelSidebar
      games={games}
      login={!!pengguna}
      admin={pengguna?.peran === 'admin'}
      belum={belum}
      nama={pengguna?.nama ?? null}
      peran={pengguna?.peran ?? null}
      keluar={logout}
    />
  )
}
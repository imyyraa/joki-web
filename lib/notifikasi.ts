import { createClient } from '@/lib/supabase/server'

export type Notifikasi = {
  log_id: number
  jenis: 'masuk' | 'selesai' | 'perubahan'
  order_id: number
  kode_order: string
  kode_game: string
  nama_joki: string
  oleh_nama: string
  waktu: string
  perubahan: Record<string, unknown> | null
  sudah_dibaca: boolean
}

export async function ambilNotifikasi(
  batas = 200
): Promise<{ daftar: Notifikasi[]; galat: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('daftar_notifikasi', {
    p_batas: batas,
  })
  return {
    daftar: (data ?? []) as Notifikasi[],
    galat: error ? error.message : null,
  }
}

export async function hitungBelumDibaca(): Promise<number> {
  const { daftar } = await ambilNotifikasi(200)
  return daftar.filter((n) => !n.sudah_dibaca).length
}
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export type HasilForm =
  | { error: string; nilai?: Record<string, string> }
  | undefined

export async function tambahOrder(
  _prev: HasilForm,
  formData: FormData
): Promise<HasilForm> {
  await wajibPeran(['admin', 'cs'])

  const ambil = (k: string) => String(formData.get(k) ?? '').trim()
  const nilai = {
    worker_id: ambil('worker_id'),
    nama_joki: ambil('nama_joki'),
    harga: ambil('harga'),
    tanggal: ambil('tanggal'),
    no_customer: ambil('no_customer'),
    catatan: ambil('catatan'),
    alasan: ambil('alasan'),
  }
  const kodeGame = ambil('kode_game')
  const buktiBayar = ambil('bukti_bayar')

  const workerId = Number(nilai.worker_id)
  const harga = Number(nilai.harga.replace(/\D/g, ''))

  const gagal = (error: string): HasilForm => ({ error, nilai })

  if (!workerId) return gagal('Pilih worker terlebih dahulu.')
  if (!nilai.nama_joki) return gagal('Jenis joki wajib diisi.')
  if (!harga || harga <= 0) return gagal('Harga harus lebih dari 0.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai.tanggal)) {
    return gagal('Tanggal tidak valid.')
  }
  if (!buktiBayar) {
    return gagal('Unggah bukti pembayaran terlebih dahulu.')
  }

  const supabase = await createClient()
    const { data: posisi } = await supabase
    .from('v_prioritas_game')
    .select('urutan')
    .eq('game', kodeGame)
    .eq('worker_id', workerId)
    .maybeSingle()
  const peringkat = posisi ? Number(posisi.urutan) : null
  const { error } = await supabase.rpc('tambah_order', {
    p_game_kode: kodeGame,
    p_worker_id: workerId,
    p_nama_joki: nilai.nama_joki,
    p_harga: harga,
    p_tanggal: nilai.tanggal,
    p_no_customer: nilai.no_customer,
    p_catatan: nilai.catatan,
    p_alasan: nilai.alasan,
    p_peringkat: peringkat,
    p_bukti_bayar: buktiBayar,
  })

  if (error) return gagal(`Gagal menyimpan: ${error.message}`)

  redirect(`/game/${kodeGame}`)
}
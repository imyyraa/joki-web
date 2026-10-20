'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export type HasilUbah =
  | { error: string; nilai?: Record<string, string> }
  | undefined

export async function ubahOrder(
  _prev: HasilUbah,
  formData: FormData
): Promise<HasilUbah> {
  await wajibPeran(['admin', 'cs'])

  const ambil = (k: string) => String(formData.get(k) ?? '').trim()
  const angka = (k: string) => Number(ambil(k).replace(/\D/g, '') || '0')

  const nilai = {
    worker_id: ambil('worker_id'),
    nama_joki: ambil('nama_joki'),
    harga: ambil('harga'),
    charge: ambil('charge'),
    refund: ambil('refund'),
    tanggal: ambil('tanggal'),
    progress: ambil('progress'),
    no_customer: ambil('no_customer'),
    catatan: ambil('catatan'),
    alasan: ambil('alasan'),
  }
  const kodeGame = ambil('kode_game')
  const orderId = Number(ambil('order_id'))
  const buktiBayar = ambil('bukti_bayar')
  const buktiSelesai = ambil('bukti_selesai')

  const gagal = (error: string): HasilUbah => ({ error, nilai })

  const workerId = Number(nilai.worker_id)
  const harga = angka('harga')
  const charge = angka('charge')
  const refund = angka('refund')

  if (!orderId) return gagal('Order tidak valid.')
  if (!workerId) return gagal('Pilih worker terlebih dahulu.')
  if (!nilai.nama_joki) return gagal('Jenis joki wajib diisi.')
  if (harga <= 0) return gagal('Harga harus lebih dari 0.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nilai.tanggal)) {
    return gagal('Tanggal tidak valid.')
  }
  if (nilai.progress !== 'progress' && nilai.progress !== 'selesai') {
    return gagal('Status progress tidak valid.')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('ubah_order', {
    p_order_id: orderId,
    p_worker_id: workerId,
    p_nama_joki: nilai.nama_joki,
    p_harga: harga,
    p_charge: charge,
    p_refund: refund,
    p_tanggal: nilai.tanggal,
    p_progress: nilai.progress,
    p_catatan: nilai.catatan,
    p_alasan: nilai.alasan,
    p_no_customer: nilai.no_customer,
    p_bukti_bayar: buktiBayar,
    p_bukti_selesai: buktiSelesai,
  })

  if (error) return gagal(`Gagal menyimpan: ${error.message}`)

  redirect(`/game/${kodeGame}`)
}
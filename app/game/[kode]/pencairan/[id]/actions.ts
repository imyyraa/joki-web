'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export type HasilPencairan = { error: string } | undefined

function kembali(kodeGame: string, orderId: number, galat?: string): never {
  const dasar = `/game/${kodeGame}/pencairan/${orderId}`
  redirect(galat ? `${dasar}?galat=${encodeURIComponent(galat)}` : dasar)
}

export async function catatPencairan(
  _prev: HasilPencairan,
  formData: FormData
): Promise<HasilPencairan> {
  await wajibPeran(['admin'])

  const ambil = (k: string) => String(formData.get(k) ?? '').trim()
  const kodeGame = ambil('kode_game')
  const orderId = Number(ambil('order_id'))
  const jenis = ambil('jenis')
  const jumlah = Number(ambil('jumlah').replace(/\D/g, '') || '0')
  const catatan = ambil('catatan')
  const lanjut = ambil('lanjut') === 'on'

  if (!orderId) return { error: 'Order tidak valid.' }
  if (jenis !== 'pencairan' && jenis !== 'pengembalian') {
    return { error: 'Jenis tidak valid.' }
  }
  if (jumlah <= 0) return { error: 'Jumlah harus lebih dari 0.' }

  const supabase = await createClient()

  if (jenis === 'pencairan') {
    const { data: ringkas } = await supabase
      .from('v_order_publik')
      .select('dana_di_kas')
      .eq('id', orderId)
      .maybeSingle()
    const dana = ringkas ? Number(ringkas.dana_di_kas) : 0
    if (jumlah > Math.max(dana, 0) && !lanjut) {
      return {
        error:
          'Jumlah melebihi dana di kas. Centang konfirmasi jika tetap ingin mencatat (akan menjadi kelebihan cair).',
      }
    }
  }

  const { error } = await supabase.rpc('catat_pencairan', {
    p_order_id: orderId,
    p_jenis: jenis,
    p_jumlah: jumlah,
    p_catatan: catatan,
  })
  if (error) return { error: `Gagal menyimpan: ${error.message}` }

  kembali(kodeGame, orderId)
}

export async function tandaiSatu(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const kodeGame = String(formData.get('kode_game') ?? '')
  const orderId = Number(formData.get('order_id'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('tandai_dibayarkan', {
    p_order_ids: [orderId],
  })
  kembali(kodeGame, orderId, error ? error.message : undefined)
}

export async function batalkanSatu(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const kodeGame = String(formData.get('kode_game') ?? '')
  const orderId = Number(formData.get('order_id'))

  const supabase = await createClient()
  const { error } = await supabase.rpc('batalkan_dibayarkan', {
    p_order_id: orderId,
  })
  kembali(kodeGame, orderId, error ? error.message : undefined)
}
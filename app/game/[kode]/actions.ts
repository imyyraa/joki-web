'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export async function hapusOrder(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const kodeGame = String(formData.get('kode_game') ?? '')
  const dasar = `/game/${kodeGame}`
  const ids = formData
    .getAll('order_id')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)

  if (ids.length === 0) {
    redirect(
      `${dasar}?galat=${encodeURIComponent('Centang order yang ingin dihapus terlebih dahulu.')}`
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('hapus_order', {
    p_order_ids: ids,
  })
  if (error) {
    redirect(`${dasar}?galat=${encodeURIComponent(error.message)}`)
  }

  redirect(
    `${dasar}?ok=${encodeURIComponent(`${data} order dipindahkan ke tempat sampah.`)}`
  )
}
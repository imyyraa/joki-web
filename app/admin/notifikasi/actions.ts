'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export async function bacaNotifikasi(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const logId = Number(formData.get('log_id'))
  const jenis = String(formData.get('jenis') ?? '')
  const kodeGame = String(formData.get('kode_game') ?? '')
  const kodeOrder = String(formData.get('kode_order') ?? '').replace(/^#/, '')

  if (!Number.isInteger(logId) || logId <= 0) {
    redirect('/admin/notifikasi')
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('tandai_notifikasi_dibaca', {
    p_log_id: logId,
    p_jenis: jenis,
  })
  if (error) {
    redirect(
      `/admin/notifikasi?jenis=${encodeURIComponent(jenis)}&galat=${encodeURIComponent(error.message)}`
    )
  }

  redirect(
    `/game/${encodeURIComponent(kodeGame)}?cari=${encodeURIComponent(kodeOrder)}`
  )
}
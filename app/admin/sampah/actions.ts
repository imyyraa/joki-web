'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

export async function pulihkanOrder(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const ids = formData
    .getAll('order_id')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)

  if (ids.length === 0) {
    redirect(
      `/admin/sampah?galat=${encodeURIComponent('Centang order yang ingin dipulihkan terlebih dahulu.')}`
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('pulihkan_order', {
    p_order_ids: ids,
  })
  if (error) {
    redirect(`/admin/sampah?galat=${encodeURIComponent(error.message)}`)
  }

  redirect(
    `/admin/sampah?ok=${encodeURIComponent(`${data} order dipulihkan.`)}`
  )
}
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { wajibPeran } from '@/lib/auth'

type Baris = {
  order_id: number
  tanggal: string
  bayar: string | null
  selesai: string | null
  charge: string | null
}

export async function hapusBukti(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const kembali = (pesan: string, ok = false): never =>
    redirect(`/admin/bukti?${ok ? 'ok' : 'galat'}=${encodeURIComponent(pesan)}`)

  const mode = String(formData.get('mode') ?? '')
  const bulan = String(formData.get('bulan') ?? '')
  const ids = formData
    .getAll('order_id')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('bukti_bisa_dibersihkan')
  if (error) kembali(`Gagal memuat daftar: ${error.message}`)

  // Daftar dihitung ulang di server: hanya order Selesai + Dibayarkan.
  const semua = (data ?? []) as Baris[]
  const pilihan = new Set(ids)
  const target =
    mode === 'bulan' && /^\d{4}-\d{2}$/.test(bulan)
      ? semua.filter((b) => b.tanggal.startsWith(bulan))
      : mode === 'pilih' && ids.length > 0
        ? semua.filter((b) => pilihan.has(b.order_id))
        : []

  if (target.length === 0) {
    kembali('Tidak ada bukti yang bisa dihapus untuk pilihan itu.')
  }

  const paths = target
    .flatMap((b) => [b.bayar, b.selesai, b.charge])
    .filter((p): p is string => !!p)

  // 1) Hapus file dulu. Jika gagal, tidak ada yang diubah di database.
  const admin = createAdminClient()
  for (let i = 0; i < paths.length; i += 100) {
    const { error: galatHapus } = await admin.storage
      .from('bukti')
      .remove(paths.slice(i, i + 100))
    if (galatHapus) {
      kembali(`Gagal menghapus file: ${galatHapus.message}`)
    }
  }

  // 2) Kosongkan tautan + beri penanda, lalu cocokkan jumlah barisnya.
  const { data: jumlah, error: galatTandai } = await supabase.rpc(
    'tandai_bukti_dibersihkan',
    { p_order_ids: target.map((b) => b.order_id) }
  )
  if (galatTandai) {
    kembali(
      `File sudah terhapus, tetapi penanda gagal disimpan (${galatTandai.message}). Ulangi penghapusan yang sama.`
    )
  }
  if (Number(jumlah) !== target.length) {
    kembali(
      `File sudah terhapus, tetapi hanya ${Number(jumlah)} dari ${target.length} order yang ditandai. Ulangi penghapusan yang sama.`
    )
  }

  kembali(
    `Berhasil menghapus ${paths.length} file bukti dari ${target.length} order.`,
    true
  )
}
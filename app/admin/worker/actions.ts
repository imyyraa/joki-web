'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'

const ambil = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

function ke(path: string, pesan?: { galat?: string; ok?: string }): never {
  const q = new URLSearchParams()
  if (pesan?.galat) q.set('galat', pesan.galat)
  if (pesan?.ok) q.set('ok', pesan.ok)
  const s = q.toString()
  redirect(s ? `${path}?${s}` : path)
}

function pesanGalat(error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return 'Data yang sama sudah ada (nama worker atau game yang sama).'
  }
  return error.message
}

function ambilPersen(f: FormData): number {
  const nilai = f.get('potongan_persen')
  if (nilai === null) return NaN
  const mentah = String(nilai).trim().replace(',', '.')
  return mentah === '' ? NaN : Number(mentah)
}

export async function tambahWorker(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const nama = ambil(formData, 'nama')
  const persen = ambilPersen(formData)
  if (!nama) ke('/admin/worker/baru', { galat: 'Nama worker wajib diisi.' })
  if (!Number.isFinite(persen) || persen < 0 || persen > 100) {
    ke('/admin/worker/baru', { galat: 'Potongan harus berupa angka 0 sampai 100.' })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workers')
    .insert({
      nama,
      rekening: ambil(formData, 'rekening') || null,
      catatan: ambil(formData, 'catatan') || null,
      potongan_persen: persen,
    })
    .select('id')
    .single()

  if (error || !data) {
    ke('/admin/worker/baru', {
      galat: error ? pesanGalat(error) : 'Gagal menyimpan.',
    })
  }

  ke(`/admin/worker/${data.id}`, {
    ok: 'Worker dibuat. Sekarang tambahkan game yang dipegang.',
  })
}

export async function ubahWorker(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  if (!id) ke('/admin/worker', { galat: 'Worker tidak valid.' })

  const halaman = `/admin/worker/${id}`
  const nama = ambil(formData, 'nama')
  const persen = ambilPersen(formData)
  if (!nama) ke(halaman, { galat: 'Nama worker wajib diisi.' })
  if (!Number.isFinite(persen) || persen < 0 || persen > 100) {
    ke(halaman, { galat: 'Potongan harus berupa angka 0 sampai 100.' })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('workers')
    .update({
      nama,
      rekening: ambil(formData, 'rekening') || null,
      catatan: ambil(formData, 'catatan') || null,
      potongan_persen: persen,
    })
    .eq('id', id)

  if (error) ke(halaman, { galat: pesanGalat(error) })
  ke(halaman, { ok: 'Data worker tersimpan. Potongan baru berlaku untuk order berikutnya.' })
}
export async function setAktif(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  const aktif = ambil(formData, 'aktif') === 'true'
  if (!id) ke('/admin/worker', { galat: 'Worker tidak valid.' })

  const supabase = await createClient()
  const { error } = await supabase.from('workers').update({ aktif }).eq('id', id)

  const halaman = `/admin/worker/${id}`
  if (error) ke(halaman, { galat: pesanGalat(error) })
  ke(halaman, { ok: aktif ? 'Worker diaktifkan.' : 'Worker dinonaktifkan.' })
}

export async function tambahGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const workerId = Number(ambil(formData, 'worker_id'))
  const gameId = Number(ambil(formData, 'game_id'))
  const status = ambil(formData, 'status')
  const halaman = `/admin/worker/${workerId}`

  if (!workerId) ke('/admin/worker', { galat: 'Worker tidak valid.' })
  if (!gameId) ke(halaman, { galat: 'Pilih game terlebih dahulu.' })
  if (status !== 'normal' && status !== 'cadangan') {
    ke(halaman, { galat: 'Status tidak valid.' })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('worker_games')
    .insert({ worker_id: workerId, game_id: gameId, status })

  if (error) ke(halaman, { galat: pesanGalat(error) })
  ke(halaman, { ok: 'Game ditambahkan.' })
}

export async function ubahStatusGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  const workerId = Number(ambil(formData, 'worker_id'))
  const status = ambil(formData, 'status')
  const halaman = `/admin/worker/${workerId}`

  if (!id) ke(halaman, { galat: 'Data tidak valid.' })
  if (status !== 'normal' && status !== 'cadangan') {
    ke(halaman, { galat: 'Status tidak valid.' })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('worker_games')
    .update({ status })
    .eq('id', id)
    .is('selesai', null)

  if (error) ke(halaman, { galat: pesanGalat(error) })
  ke(halaman, { ok: 'Status diperbarui.' })
}

export async function keluarkanGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  const workerId = Number(ambil(formData, 'worker_id'))
  const halaman = `/admin/worker/${workerId}`
  if (!id) ke(halaman, { galat: 'Data tidak valid.' })

  const hariIni = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Jakarta',
  })

  const supabase = await createClient()
  const { error } = await supabase
    .from('worker_games')
    .update({ selesai: hariIni })
    .eq('id', id)
    .is('selesai', null)

  if (error) ke(halaman, { galat: pesanGalat(error) })
  ke(halaman, { ok: 'Worker dikeluarkan dari game. Riwayatnya tetap tersimpan.' })
}
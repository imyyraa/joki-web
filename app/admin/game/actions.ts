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
    return 'Kode game sudah dipakai (atau bentrok dengan awalan kode game lain).'
  }
  if (error.code === '23514') {
    return 'Format tidak sesuai: kode 2 sampai 10 karakter, hanya huruf besar dan angka.'
  }
  return error.message
}

export async function tambahGameBaru(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const kode = ambil(formData, 'kode').toUpperCase()
  const nama = ambil(formData, 'nama')

  if (!/^[A-Z0-9]{2,10}$/.test(kode)) {
    ke('/admin/game', {
      galat: 'Kode game harus 2 sampai 10 karakter, hanya huruf dan angka.',
    })
  }
  if (!nama) ke('/admin/game', { galat: 'Nama game wajib diisi.' })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('games')
    .insert({ kode, nama })
    .select('id')

  if (error) ke('/admin/game', { galat: pesanGalat(error) })
  if (!data || data.length === 0) {
    ke('/admin/game', { galat: 'Game gagal disimpan.' })
  }

  ke('/admin/game', {
    ok: `Game ${kode} ditambahkan. Kode order-nya akan berawalan #${kode}. Lanjutkan dengan menambahkan worker dan CS ke game ini.`,
  })
}

export async function ubahGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])

  const id = Number(ambil(formData, 'id'))
  const nama = ambil(formData, 'nama')

  if (!id) ke('/admin/game', { galat: 'Game tidak valid.' })
  if (!nama) ke('/admin/game', { galat: 'Nama game wajib diisi.' })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('games')
    .update({ nama })
    .eq('id', id)
    .select('id')

  if (error) ke('/admin/game', { galat: pesanGalat(error) })
  if (!data || data.length === 0) {
    ke('/admin/game', {
      galat: 'Tidak ada data yang berubah. Game tidak ditemukan.',
    })
  }

  ke('/admin/game', { ok: 'Nama game diperbarui.' })
}

export async function arsipkanGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  if (!id) ke('/admin/game', { galat: 'Game tidak valid.' })

  const supabase = await createClient()
  const { error } = await supabase.rpc('arsipkan_game', { p_game_id: id })
  if (error) ke('/admin/game', { galat: error.message })

  ke('/admin/game', {
    ok: 'Game diarsipkan. Worker dikeluarkan dari game ini (riwayat tetap) dan order lama tetap tersimpan.',
  })
}

export async function aktifkanGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  if (!id) ke('/admin/game', { galat: 'Game tidak valid.' })

  const supabase = await createClient()
  const { error } = await supabase.rpc('aktifkan_game', { p_game_id: id })
  if (error) ke('/admin/game', { galat: error.message })

  ke('/admin/game', {
    ok: 'Game diaktifkan kembali. Tambahkan lagi worker-nya lewat Kelola Worker.',
  })
}

export async function hapusGame(formData: FormData): Promise<void> {
  await wajibPeran(['admin'])
  const id = Number(ambil(formData, 'id'))
  if (!id) ke('/admin/game', { galat: 'Game tidak valid.' })

  const supabase = await createClient()
  const { error } = await supabase.rpc('hapus_game', { p_game_id: id })
  if (error) ke('/admin/game', { galat: error.message })

  ke('/admin/game', { ok: 'Game dihapus permanen.' })
}
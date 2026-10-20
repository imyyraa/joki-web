'use server'

import { redirect } from 'next/navigation'
import { wajibPeran } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

async function catatLog(
  admin: Admin,
  oleh: string,
  aksi: string,
  perubahan: Record<string, unknown>
) {
  await admin
    .from('log_pengelolaan')
    .insert({ tabel: 'akun', aksi, oleh, perubahan })
}

const ambil = (f: FormData, k: string) => String(f.get(k) ?? '').trim()

function ke(path: string, pesan?: { galat?: string; ok?: string }): never {
  const q = new URLSearchParams()
  if (pesan?.galat) q.set('galat', pesan.galat)
  if (pesan?.ok) q.set('ok', pesan.ok)
  const s = q.toString()
  redirect(s ? `${path}?${s}` : path)
}

export async function buatAkun(formData: FormData): Promise<void> {
  const pengguna = await wajibPeran(['admin'])

  const nama = ambil(formData, 'nama')
  const email = ambil(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')
  const peran = ambil(formData, 'peran')
  const balik = '/admin/akun/baru'

  if (!nama) ke(balik, { galat: 'Nama wajib diisi.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ke(balik, { galat: 'Format email tidak valid.' })
  }
  if (password.length < 8) {
    ke(balik, { galat: 'Password minimal 8 karakter.' })
  }
  if (peran !== 'cs' && peran !== 'admin') {
    ke(balik, { galat: 'Peran tidak valid.' })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  const user = data?.user
  if (error || !user) {
    ke(balik, { galat: error?.message ?? 'Gagal membuat akun.' })
  }

  const { error: errProfil } = await admin
    .from('profiles')
    .insert({ id: user.id, nama, peran })
  if (errProfil) {
    await admin.auth.admin.deleteUser(user.id)
    ke(balik, { galat: `Gagal menyimpan profil: ${errProfil.message}` })
  }

  await admin.from('log_pengelolaan').insert({
    tabel: 'akun',
    aksi: 'tambah',
    oleh: pengguna.id,
    perubahan: { user_id: user.id, nama, peran },
  })

  ke('/admin/akun', { ok: `Akun ${nama} dibuat. Sampaikan password-nya langsung ke yang bersangkutan.` })
}

export async function ubahAkun(formData: FormData): Promise<void> {
  const pengguna = await wajibPeran(['admin'])
  const id = ambil(formData, 'id')
  const nama = ambil(formData, 'nama')
  const peran = ambil(formData, 'peran')
  if (!id) ke('/admin/akun', { galat: 'Akun tidak valid.' })

  const halaman = `/admin/akun/${id}`
  if (!nama) ke(halaman, { galat: 'Nama wajib diisi.' })
  if (peran !== 'cs' && peran !== 'admin') {
    ke(halaman, { galat: 'Peran tidak valid.' })
  }
  if (id === pengguna.id && peran !== 'admin') {
    ke(halaman, { galat: 'Anda tidak bisa menurunkan peran akun sendiri.' })
  }

  const admin = createAdminClient()
    const { data: hasil, error } = await admin
    .from('profiles')
    .update({ nama, peran })
    .eq('id', id)
    .select('id')
  if (error) ke(halaman, { galat: error.message })
  if (!hasil || hasil.length === 0) {
    ke(halaman, { galat: 'Tidak ada data yang berubah. Akun tidak ditemukan.' })
  }

  await catatLog(admin, pengguna.id, 'ubah', { user_id: id, nama, peran })
  ke(halaman, { ok: 'Data akun tersimpan.' })
}

export async function aturGameCs(formData: FormData): Promise<void> {
  const pengguna = await wajibPeran(['admin'])
  const id = ambil(formData, 'id')
  if (!id) ke('/admin/akun', { galat: 'Akun tidak valid.' })
  const halaman = `/admin/akun/${id}`

  const dipilih = formData
    .getAll('game_id')
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0)

  const admin = createAdminClient()
  const { data: ada, error: errBaca } = await admin
    .from('cs_games')
    .select('game_id')
    .eq('user_id', id)
  if (errBaca) ke(halaman, { galat: errBaca.message })

  const lama = ((ada ?? []) as { game_id: number }[]).map((r) => r.game_id)
  const tambah = dipilih.filter((g) => !lama.includes(g))
  const hapus = lama.filter((g) => !dipilih.includes(g))

  if (hapus.length > 0) {
    const { error } = await admin
      .from('cs_games')
      .delete()
      .eq('user_id', id)
      .in('game_id', hapus)
    if (error) ke(halaman, { galat: error.message })
  }
    if (tambah.length > 0) {
    const { data: masuk, error } = await admin
      .from('cs_games')
      .insert(tambah.map((g) => ({ user_id: id, game_id: g })))
      .select('game_id')
    if (error) ke(halaman, { galat: error.message })
    if (!masuk || masuk.length !== tambah.length) {
      ke(halaman, { galat: 'Sebagian game gagal disimpan.' })
    }
  }

  await catatLog(admin, pengguna.id, 'atur_game', {
    user_id: id,
    ditambah: tambah,
    dihapus: hapus,
  })
  ke(halaman, { ok: 'Game yang dipegang diperbarui.' })
}

export async function resetPassword(formData: FormData): Promise<void> {
  const pengguna = await wajibPeran(['admin'])
  const id = ambil(formData, 'id')
  const password = String(formData.get('password') ?? '')
  if (!id) ke('/admin/akun', { galat: 'Akun tidak valid.' })
  const halaman = `/admin/akun/${id}`
  if (password.length < 8) {
    ke(halaman, { galat: 'Password minimal 8 karakter.' })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) ke(halaman, { galat: error.message })

  await catatLog(admin, pengguna.id, 'reset_password', { user_id: id })
  ke(halaman, { ok: 'Password diganti. Sampaikan password baru langsung ke yang bersangkutan.' })
}

export async function setAktifAkun(formData: FormData): Promise<void> {
  const pengguna = await wajibPeran(['admin'])
  const id = ambil(formData, 'id')
  const aktif = ambil(formData, 'aktif') === 'true'
  if (!id) ke('/admin/akun', { galat: 'Akun tidak valid.' })
  const halaman = `/admin/akun/${id}`
  if (id === pengguna.id) {
    ke(halaman, { galat: 'Anda tidak bisa menonaktifkan akun sendiri.' })
  }

  const admin = createAdminClient()
    const { data: hasil, error } = await admin
    .from('profiles')
    .update({ aktif })
    .eq('id', id)
    .select('id')
  if (error) ke(halaman, { galat: error.message })
  if (!hasil || hasil.length === 0) {
    ke(halaman, { galat: 'Tidak ada data yang berubah. Akun tidak ditemukan.' })
  }

  const { error: errBan } = await admin.auth.admin.updateUserById(id, {
    ban_duration: aktif ? 'none' : '876000h',
  })

  await catatLog(admin, pengguna.id, aktif ? 'aktifkan' : 'nonaktifkan', {
    user_id: id,
  })
  if (errBan) {
    ke(halaman, {
      galat: `Profil diperbarui, tetapi penguncian login gagal: ${errBan.message}`,
    })
  }
  ke(halaman, { ok: aktif ? 'Akun diaktifkan.' : 'Akun dinonaktifkan dan tidak bisa login.' })
}
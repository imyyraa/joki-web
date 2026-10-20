import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { wajibPeran } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import NavAdmin from '@/komponen/nav-admin'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { ubahAkun, aturGameCs, resetPassword, setAktifAkun } from '../actions'

async function Isi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  const pengguna = await wajibPeran(['admin'])
  const { id } = await params
  const { galat, ok } = await searchParams

  const admin = createAdminClient()
  const { data: profil } = await admin
    .from('profiles')
    .select('id, nama, peran, aktif')
    .eq('id', id)
    .maybeSingle()
  if (!profil) notFound()

  const { data: dataUser } = await admin.auth.admin.getUserById(id)
  const email = dataUser?.user?.email ?? '-'

  const { data: dataGame } = await admin.from('games').select('id, kode').order('kode')
  const { data: dataCs } = await admin.from('cs_games').select('game_id').eq('user_id', id)

  const games = (dataGame ?? []) as { id: number; kode: string }[]
  const dipegang = new Set(((dataCs ?? []) as { game_id: number }[]).map((r) => r.game_id))
  const dirisendiri = profil.id === pengguna.id
  const kelas = 'mt-1 w-full rounded border px-3 py-2'

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          {profil.nama}
          {!profil.aktif && (
            <span className="ml-2 text-base font-normal opacity-60">(nonaktif)</span>
          )}
        </h1>
        <Link href="/admin/akun" className="text-sm underline">
          Kembali
        </Link>
      </div>

      <NavAdmin aktif="akun" />

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}

      <p className="mb-6 text-sm opacity-70">Email: {email}</p>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Data akun</h2>
        <form action={ubahAkun} className="max-w-md space-y-3">
          <input type="hidden" name="id" value={profil.id} />
          <div>
            <label htmlFor="nama" className="block text-sm font-medium">
              Nama
            </label>
            <input
              id="nama"
              name="nama"
              required
              defaultValue={profil.nama}
              className={kelas}
            />
          </div>
          <div>
            <label htmlFor="peran" className="block text-sm font-medium">
              Peran
            </label>
            {dirisendiri ? (
              <>
                <input type="hidden" name="peran" value={profil.peran} />
                <p className="mt-1 text-sm uppercase">{profil.peran}</p>
                <p className="text-xs opacity-70">
                  Peran akun sendiri tidak bisa diubah.
                </p>
              </>
            ) : (
              <select
                id="peran"
                name="peran"
                defaultValue={profil.peran}
                className={kelas}
              >
                <option value="cs">CS</option>
                <option value="admin">Admin</option>
              </select>
            )}
          </div>
          <button className="rounded bg-black px-4 py-2 text-sm text-white">
            Simpan data
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Game yang dipegang</h2>
        {profil.peran === 'admin' ? (
          <p className="text-sm opacity-70">
            Admin otomatis dapat mengelola semua game.
          </p>
        ) : (
          <form action={aturGameCs} className="max-w-md space-y-3">
            <input type="hidden" name="id" value={profil.id} />
            <div className="flex flex-wrap gap-3">
              {games.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="game_id"
                    value={g.id}
                    defaultChecked={dipegang.has(g.id)}
                  />
                  {g.kode}
                </label>
              ))}
            </div>
            <button className="rounded bg-black px-4 py-2 text-sm text-white">
              Simpan game
            </button>
          </form>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Reset password</h2>
        <form action={resetPassword} className="flex max-w-md flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={profil.id} />
          <div className="flex-1">
            <label htmlFor="password" className="block text-sm font-medium">
              Password baru (minimal 8 karakter)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={kelas}
            />
          </div>
          <TombolKonfirmasi
            pesan="Ganti password akun ini?"
            className="rounded border px-4 py-2 text-sm"
          >
            Ganti password
          </TombolKonfirmasi>
        </form>
      </section>

      {!dirisendiri && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Status akun</h2>
          <p className="mb-2 text-sm opacity-70">
            Akun nonaktif tidak bisa login dan kehilangan semua akses, tetapi
            riwayat yang pernah dicatatnya tetap tersimpan.
          </p>
          <form action={setAktifAkun}>
            <input type="hidden" name="id" value={profil.id} />
            <input
              type="hidden"
              name="aktif"
              value={profil.aktif ? 'false' : 'true'}
            />
            <TombolKonfirmasi
              pesan={
                profil.aktif
                  ? 'Nonaktifkan akun ini?'
                  : 'Aktifkan kembali akun ini?'
              }
              className="rounded border px-4 py-2 text-sm"
            >
              {profil.aktif ? 'Nonaktifkan akun' : 'Aktifkan akun'}
            </TombolKonfirmasi>
          </form>
        </section>
      )}
    </>
  )
}

export default function HalamanKelolaAkun({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
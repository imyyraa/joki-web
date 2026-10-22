import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'

type Profil = { id: string; nama: string; peran: string; aktif: boolean }

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  await wajibPeran(['admin'])
  const { galat, ok } = await searchParams

  const admin = createAdminClient()
  const { data: dataProfil, error } = await admin
    .from('profiles')
    .select('id, nama, peran, aktif')
    .order('peran')
    .order('nama')

  const { data: dataUser } = await admin.auth.admin.listUsers({ perPage: 200 })
  const emailPer = new Map<string, string>()
  for (const u of dataUser?.users ?? []) emailPer.set(u.id, u.email ?? '-')

  const { data: dataGame } = await admin
    .from('cs_games')
    .select('user_id, games(kode)')
  const gamePer = new Map<string, string[]>()
  for (const r of (dataGame ?? []) as unknown as {
    user_id: string
    games: { kode: string }
  }[]) {
    gamePer.set(r.user_id, [...(gamePer.get(r.user_id) ?? []), r.games.kode])
  }

  const profil = (dataProfil ?? []) as Profil[]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Kelola Akun</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="akun" />

      {galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-md border border-green-600/40 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
          {ok}
        </p>
      )}

      <div className="mb-4">
        <Link
          href="/admin/akun/baru"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Tambah akun
        </Link>
      </div>

      {error ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat data: {error.message}
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            Geser tabel ke kiri-kanan untuk melihat semua kolom.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Peran</th>
                  <th className="px-3 py-2 font-medium">Game</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {profil.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b last:border-b-0 hover:bg-muted/50 ${
                      p.aktif ? '' : 'opacity-50'
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {p.nama}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {emailPer.get(p.id) ?? '-'}
                    </td>
                    <td className="px-3 py-2 uppercase">{p.peran}</td>
                    <td className="px-3 py-2">
                      {p.peran === 'admin'
                        ? 'Semua game'
                        : (gamePer.get(p.id) ?? []).join(', ') || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {p.aktif ? (
                        <span className="inline-block rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-block rounded bg-zinc-500/20 px-2 py-0.5 text-xs font-medium">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/akun/${p.id}`}
                        className="text-xs font-semibold text-primary underline"
                      >
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

export default function HalamanAkun({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
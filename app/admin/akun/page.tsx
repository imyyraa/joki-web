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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Kelola Akun</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="akun" />

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}

      <div className="mb-4">
        <Link
          href="/admin/akun/baru"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + Tambah akun
        </Link>
      </div>

      {error ? (
        <p className="text-red-600">Gagal memuat data: {error.message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Nama</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Peran</th>
                <th className="py-2 pr-3">Game</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {profil.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b ${p.aktif ? '' : 'opacity-50'}`}
                >
                  <td className="py-2 pr-3 font-medium">{p.nama}</td>
                  <td className="py-2 pr-3">{emailPer.get(p.id) ?? '-'}</td>
                  <td className="py-2 pr-3 uppercase">{p.peran}</td>
                  <td className="py-2 pr-3">
                    {p.peran === 'admin'
                      ? 'Semua game'
                      : (gamePer.get(p.id) ?? []).join(', ') || '-'}
                  </td>
                  <td className="py-2">{p.aktif ? 'Aktif' : 'Nonaktif'}</td>
                    <td className="py-2">
                    <Link
                      href={`/admin/akun/${p.id}`}
                      className="text-xs font-semibold underline"
                    >
                      Kelola
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
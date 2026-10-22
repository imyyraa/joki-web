import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'

type Worker = {
  id: number
  nama: string
  rekening: string | null
  catatan: string | null
  aktif: boolean
  potongan_persen: number
}

type Penugasan = {
  worker_id: number
  status: string
  games: { kode: string }
}

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  await wajibPeran(['admin'])
  const { galat, ok } = await searchParams
  const supabase = await createClient()

  const { data: dataWorker, error } = await supabase
    .from('workers')
    .select('id, nama, rekening, catatan, aktif, potongan_persen')
    .order('aktif', { ascending: false })
    .order('nama')

  const { data: dataTugas } = await supabase
    .from('worker_games')
    .select('worker_id, status, games(kode)')
    .is('selesai', null)

  const worker = (dataWorker ?? []) as Worker[]
  const tugas = (dataTugas ?? []) as unknown as Penugasan[]

  const gamePerWorker = new Map<number, Penugasan[]>()
  for (const t of tugas) {
    gamePerWorker.set(t.worker_id, [...(gamePerWorker.get(t.worker_id) ?? []), t])
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Kelola Worker</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>
      <NavAdmin aktif="worker" />
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
          href="/admin/worker/baru"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          + Tambah worker
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
                  <th className="px-3 py-2 font-medium">Worker</th>
                  <th className="px-3 py-2 font-medium">Game</th>
                  <th className="px-3 py-2 font-medium">Rekening</th>
                  <th className="px-3 py-2 font-medium">Potongan</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {worker.map((w) => (
                  <tr
                    key={w.id}
                    className={`border-b align-top last:border-b-0 hover:bg-muted/50 ${
                      w.aktif ? '' : 'opacity-50'
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {w.nama}
                    </td>
                    <td className="px-3 py-2">
                      {(gamePerWorker.get(w.id) ?? []).map((t) => (
                        <span
                          key={t.games.kode}
                          className="mb-1 mr-1 inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs"
                        >
                          {t.games.kode}
                          {t.status === 'cadangan' ? ' (cadangan)' : ''}
                        </span>
                      ))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {w.rekening ?? '-'}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {Number(w.potongan_persen)}%
                    </td>
                    <td className="px-3 py-2">
                      {w.aktif ? (
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
                        href={`/admin/worker/${w.id}`}
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

export default function HalamanWorker({
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
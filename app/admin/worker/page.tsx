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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Kelola Worker</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>
          <NavAdmin aktif="worker" />
      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}

      <div className="mb-4">
        <Link
          href="/admin/worker/baru"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          + Tambah worker
        </Link>
      </div>

      {error ? (
        <p className="text-red-600">Gagal memuat data: {error.message}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Worker</th>
                <th className="py-2 pr-3">Game</th>
                <th className="py-2 pr-3">Rekening</th>
                <th className="py-2 pr-3">Potongan</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {worker.map((w) => (
                <tr
                  key={w.id}
                  className={`border-b align-top ${w.aktif ? '' : 'opacity-50'}`}
                >
                  <td className="py-2 pr-3 font-medium">{w.nama}</td>
                  <td className="py-2 pr-3">
                    {(gamePerWorker.get(w.id) ?? []).map((t) => (
                      <span
                        key={t.games.kode}
                        className="mr-1 inline-block rounded border px-2 py-0.5 text-xs"
                      >
                        {t.games.kode}
                        {t.status === 'cadangan' ? ' (cadangan)' : ''}
                      </span>
                    ))}
                  </td>
                  <td className="py-2 pr-3">{w.rekening ?? '-'}</td>
                  <td className="py-2 pr-3">{Number(w.potongan_persen)}%</td>
                  <td className="py-2 pr-3">{w.aktif ? 'Aktif' : 'Nonaktif'}</td>
                  <td className="py-2">
                    <Link
                      href={`/admin/worker/${w.id}`}
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

export default function HalamanWorker({
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
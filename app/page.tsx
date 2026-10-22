import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import StatusLogin from '@/komponen/status-login'
import { rupiah } from '@/lib/format'

type BarisRekap = {
  worker_id: number
  nama: string
  total_orderan: number
  total_penghasilan: number
  total_kas_tersimpan: number
  tagihan_ke_worker: number
  game_dijoki: string | null
}

function Isian({
  label,
  penuh,
  children,
}: {
  label: string
  penuh?: boolean
  children: ReactNode
}) {
  return (
    <div className={penuh ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function Ringkas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{nilai}</p>
    </div>
  )
}

async function TabelRekap() {
  const supabase = await createClient()
  const pengguna = await ambilPengguna()

  const { data, error } = await supabase
    .from('v_rekap_worker')
    .select(
      'worker_id, nama, total_orderan, total_penghasilan, total_kas_tersimpan, tagihan_ke_worker, game_dijoki'
    )
    .order('nama')

  if (error) {
    return (
      <p className="text-red-600 dark:text-red-400">
        Gagal memuat data: {error.message}
      </p>
    )
  }

  const baris = (data ?? []) as BarisRekap[]
  if (baris.length === 0) {
    return <p>Belum ada worker.</p>
  }

  const rekening = new Map<number, string | null>()
  if (pengguna) {
    const { data: dataRek } = await supabase.from('workers').select('id, rekening')
    for (const r of (dataRek ?? []) as { id: number; rekening: string | null }[]) {
      rekening.set(r.id, r.rekening)
    }
  }

  const totalOrderan = baris.reduce((a, b) => a + b.total_orderan, 0)
  const totalPenghasilan = baris.reduce((a, b) => a + b.total_penghasilan, 0)
  const totalKas = baris.reduce((a, b) => a + b.total_kas_tersimpan, 0)
  const totalTagihan = baris.reduce((a, b) => a + b.tagihan_ke_worker, 0)

  return (
    <>
      {/* Tampilan HP: kartu ringkasan + baris accordion */}
      <div className="sm:hidden">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Ringkas label="Total orderan" nilai={String(totalOrderan)} />
          <Ringkas label="Total penghasilan" nilai={rupiah(totalPenghasilan)} />
          <Ringkas label="Kas tersimpan" nilai={rupiah(totalKas)} />
          {totalTagihan > 0 && (
            <Ringkas label="Tagihan ke worker" nilai={rupiah(totalTagihan)} />
          )}
        </div>

        <ul className="space-y-2">
          {baris.map((b) => (
            <li key={b.worker_id}>
              <details className="group rounded-xl border bg-surface open:border-primary/60">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {b.nama}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {b.game_dijoki ?? '-'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums">
                      {rupiah(b.total_penghasilan)}
                    </span>
                    {b.tagihan_ke_worker > 0 && (
                      <span className="block text-[11px] font-medium text-red-600 dark:text-red-400">
                        Ada tagihan
                      </span>
                    )}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </summary>

                <div className="border-t px-3 py-3">
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                    <Isian label="Total orderan">{b.total_orderan}</Isian>
                    <Isian label="Total penghasilan">
                      {rupiah(b.total_penghasilan)}
                    </Isian>
                    <Isian label="Kas tersimpan">
                      {rupiah(b.total_kas_tersimpan)}
                    </Isian>
                    {b.tagihan_ke_worker > 0 && (
                      <Isian label="Tagihan ke worker">
                        <span className="text-red-600 dark:text-red-400">
                          {rupiah(b.tagihan_ke_worker)}
                        </span>
                      </Isian>
                    )}
                    {pengguna && (
                      <Isian label="Rekening" penuh>
                        {rekening.get(b.worker_id) ?? '-'}
                      </Isian>
                    )}
                  </dl>
                  <Link
                    href={`/worker/${b.worker_id}`}
                    className="mt-4 flex items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Lihat order
                  </Link>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>

      {/* Tampilan layar lebar: tabel */}
      <div className="hidden overflow-x-auto rounded-md border sm:block">
        <table className="w-full min-w-160 border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Worker</th>
              <th className="px-3 py-2 font-medium">Game</th>
              <th className="px-3 py-2 text-right font-medium">Total orderan</th>
              <th className="px-3 py-2 text-right font-medium">
                Total penghasilan
              </th>
              <th className="px-3 py-2 text-right font-medium">Kas tersimpan</th>
              {totalTagihan > 0 && (
                <th className="px-3 py-2 text-right font-medium">
                  Tagihan ke worker
                </th>
              )}
              {pengguna && <th className="px-3 py-2 font-medium">Rekening</th>}
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr
                key={b.worker_id}
                className="border-b align-top hover:bg-muted/50"
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium">
                  <Link
                    href={`/worker/${b.worker_id}`}
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    {b.nama}
                  </Link>
                </td>
                <td className="px-3 py-2">{b.game_dijoki ?? '-'}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {b.total_orderan}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {rupiah(b.total_penghasilan)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {rupiah(b.total_kas_tersimpan)}
                </td>
                {totalTagihan > 0 && (
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                      b.tagihan_ke_worker > 0
                        ? 'font-semibold text-red-600 dark:text-red-400'
                        : ''
                    }`}
                  >
                    {b.tagihan_ke_worker > 0 ? rupiah(b.tagihan_ke_worker) : '-'}
                  </td>
                )}
                {pengguna && (
                  <td className="whitespace-nowrap px-3 py-2">
                    {rekening.get(b.worker_id) ?? '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Total
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{totalOrderan}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {rupiah(totalPenghasilan)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {rupiah(totalKas)}
              </td>
              {totalTagihan > 0 && (
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {rupiah(totalTagihan)}
                </td>
              )}
              {pengguna && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Suspense fallback={<div className="mb-6 hidden h-9 sm:block" />}>
        <Navigasi aktif="rekap" />
      </Suspense>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 max-sm:-mt-15">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="flex text-xl font-bold max-sm:min-h-11 max-sm:items-center max-sm:pl-12 sm:text-2xl">
            Rekap Worker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Data ini terbuka untuk semua worker dan dihitung otomatis dari
            data order. Klik nama worker untuk melihat semua ordernya.
          </p>
        </div>
        <Suspense fallback={<div className="h-5 w-24" />}>
          <StatusLogin />
        </Suspense>
      </div>

      <Suspense fallback={<p>Memuat...</p>}>
        <TabelRekap />
      </Suspense>

      <p className="mt-6 text-xs text-muted-foreground">
        Total penghasilan memakai harga penuh. Kas tersimpan adalah bagian
        worker (setelah potongan toko) yang belum dicairkan.
      </p>
    </main>
  )
}
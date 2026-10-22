import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import StatusLogin from '@/komponen/status-login'
import { rupiah, tanggalIndo } from '@/lib/format'

type Ringkas = {
  worker_id: number
  nama: string
  total_orderan: number
  total_penghasilan: number
  total_kas_tersimpan: number
  tagihan_ke_worker: number
  game_dijoki: string | null
}

type Order = {
  id: number
  game: string
  kode: string
  nama_joki: string
  harga: number
  charge: number
  refund: number
  total_harga: number
  tanggal: string
  progress: 'progress' | 'selesai'
  kas: 'disimpan' | 'dibayarkan'
  total_dicairkan: number
  dana_di_kas: number
  catatan: string | null
}

function Kartu({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold tabular-nums">{nilai}</p>
    </div>
  )
}

function Lencana({ teks, warna }: { teks: string; warna: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${warna}`}
    >
      {teks}
    </span>
  )
}

async function Isi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workerId = Number(id)
  if (!Number.isInteger(workerId) || workerId <= 0) notFound()

  const supabase = await createClient()
  const pengguna = await ambilPengguna()

  const { data: dataRingkas } = await supabase
    .from('v_rekap_worker')
    .select(
      'worker_id, nama, total_orderan, total_penghasilan, total_kas_tersimpan, tagihan_ke_worker, game_dijoki'
    )
    .eq('worker_id', workerId)
    .maybeSingle()
  if (!dataRingkas) notFound()
  const r = dataRingkas as Ringkas

  const { data: dataOrder, error } = await supabase
    .from('v_order_publik')
    .select(
      'id, game, kode, nama_joki, harga, charge, refund, total_harga, tanggal, progress, kas, total_dicairkan, dana_di_kas, catatan'
    )
    .eq('worker', r.nama)
    .order('tanggal', { ascending: false })
    .order('kode', { ascending: false })
  const orders = (dataOrder ?? []) as Order[]

  let rekening: string | null = null
  if (pengguna) {
    const { data: w } = await supabase
      .from('workers')
      .select('rekening')
      .eq('id', workerId)
      .maybeSingle()
    rekening = w?.rekening ?? null
  }

  return (
    <>
      <Navigasi aktif="" />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">{r.nama}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Game: {r.game_dijoki ?? '-'}
          </p>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kartu label="Total orderan" nilai={String(r.total_orderan)} />
        <Kartu label="Total penghasilan" nilai={rupiah(r.total_penghasilan)} />
        <Kartu label="Kas tersimpan" nilai={rupiah(r.total_kas_tersimpan)} />
        {r.tagihan_ke_worker > 0 && (
          <Kartu label="Tagihan ke worker" nilai={rupiah(r.tagihan_ke_worker)} />
        )}
        {pengguna && <Kartu label="Rekening" nilai={rekening ?? '-'} />}
      </div>

      {error ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat order: {error.message}
        </p>
      ) : orders.length === 0 ? (
        <p>Belum ada order.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            Geser tabel ke kiri-kanan untuk melihat semua kolom.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-250 border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Kode</th>
                  <th className="px-3 py-2 font-medium">Game</th>
                  <th className="px-3 py-2 font-medium">Joki</th>
                  <th className="px-3 py-2 text-right font-medium">Harga</th>
                  <th className="px-3 py-2 text-right font-medium">Charge</th>
                  <th className="px-3 py-2 text-right font-medium">Refund</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Kas</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Dana di kas
                  </th>
                  <th className="px-3 py-2 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b align-top last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2">{o.kode}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/game/${o.game}`}
                        className="text-primary underline"
                      >
                        {o.game}
                      </Link>
                    </td>
                    <td className="min-w-40 px-3 py-2">{o.nama_joki}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {rupiah(o.harga)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {o.charge ? rupiah(o.charge) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {o.refund ? rupiah(o.refund) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {rupiah(o.total_harga)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {tanggalIndo(o.tanggal)}
                    </td>
                    <td className="px-3 py-2">
                      {o.progress === 'selesai' ? (
                        <Lencana
                          teks="Selesai"
                          warna="bg-green-500/20 text-green-800 dark:text-green-300"
                        />
                      ) : (
                        <Lencana
                          teks="Progress"
                          warna="bg-yellow-500/20 text-yellow-800 dark:text-yellow-300"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {o.kas === 'dibayarkan' ? (
                        <Lencana
                          teks="Dibayarkan"
                          warna="bg-green-500/20 text-green-800 dark:text-green-300"
                        />
                      ) : (
                        <Lencana
                          teks="Disimpan"
                          warna="bg-blue-500/20 text-blue-800 dark:text-blue-300"
                        />
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                        o.dana_di_kas < 0
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : ''
                      }`}
                    >
                      {rupiah(o.dana_di_kas)}
                    </td>
                    <td className="min-w-48 px-3 py-2">{o.catatan}</td>
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
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} />
      </Suspense>
    </main>
  )
}
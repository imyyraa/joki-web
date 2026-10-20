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
    <div className="rounded border p-3">
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 font-semibold">{nilai}</p>
    </div>
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

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{r.nama}</h1>
          <p className="mt-1 text-sm opacity-70">
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
        <p className="text-red-600">Gagal memuat order: {error.message}</p>
      ) : orders.length === 0 ? (
        <p>Belum ada order.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-250 border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Kode</th>
                <th className="py-2 pr-3">Game</th>
                <th className="py-2 pr-3">Joki</th>
                <th className="py-2 pr-3 text-right">Harga</th>
                <th className="py-2 pr-3 text-right">Charge</th>
                <th className="py-2 pr-3 text-right">Refund</th>
                <th className="py-2 pr-3 text-right">Total</th>
                <th className="py-2 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Progress</th>
                <th className="py-2 pr-3">Kas</th>
                <th className="py-2 pr-3 text-right">Dana di kas</th>
                <th className="py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{o.kode}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/game/${o.game}`} className="underline">
                      {o.game}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{o.nama_joki}</td>
                  <td className="py-2 pr-3 text-right">{rupiah(o.harga)}</td>
                  <td className="py-2 pr-3 text-right">
                    {o.charge ? rupiah(o.charge) : '-'}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {o.refund ? rupiah(o.refund) : '-'}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {rupiah(o.total_harga)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {tanggalIndo(o.tanggal)}
                  </td>
                  <td className="py-2 pr-3">
                    {o.progress === 'selesai' ? 'Selesai' : 'Progress'}
                  </td>
                  <td className="py-2 pr-3">
                    {o.kas === 'dibayarkan' ? 'Dibayarkan' : 'Disimpan'}
                  </td>
                  <td
                    className={`py-2 pr-3 text-right ${
                      o.dana_di_kas < 0 ? 'font-semibold text-red-600' : ''
                    }`}
                  >
                    {rupiah(o.dana_di_kas)}
                  </td>
                  <td className="py-2">{o.catatan}</td>
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
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} />
      </Suspense>
    </main>
  )
}
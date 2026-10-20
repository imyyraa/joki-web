import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { rupiah } from '@/lib/format'
import FormPencairan from './form-pencairan'
import { tandaiSatu, batalkanSatu } from './actions'

type Ringkasan = {
  id: number
  kode: string
  worker: string
  nama_joki: string
  total_harga: number
  total_dicairkan: number
  dana_di_kas: number
  kas: 'disimpan' | 'dibayarkan'
}

type Riwayat = {
  id: number
  jenis: 'pencairan' | 'pengembalian'
  jumlah: number
  tanggal: string
  catatan: string | null
  pelunasan: boolean
}

async function Isi({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string; id: string }>
  searchParams: Promise<{ galat?: string }>
}) {
  await wajibPeran(['admin'])

  const { kode, id } = await params
  const { galat } = await searchParams
  const kodeGame = decodeURIComponent(kode).toUpperCase()
  const orderId = Number(id)
  if (!Number.isInteger(orderId) || orderId <= 0) notFound()

  const supabase = await createClient()

  const { data } = await supabase
    .from('v_order_publik')
    .select(
      'id, kode, worker, nama_joki, total_harga, total_dicairkan, dana_di_kas, kas'
    )
    .eq('id', orderId)
    .eq('game', kodeGame)
    .maybeSingle()
  if (!data) notFound()
  const o = data as Ringkasan

  const { data: dataRiwayat } = await supabase
    .from('pencairan')
    .select('id, jenis, jumlah, tanggal, catatan, pelunasan')
    .eq('order_id', orderId)
    .order('tanggal', { ascending: false })
  const riwayat = (dataRiwayat ?? []) as Riwayat[]

    const { data: dataOrder } = await supabase
    .from('orders')
    .select('worker_id')
    .eq('id', orderId)
    .maybeSingle()
  let rekening: string | null = null
  if (dataOrder) {
    const { data: dataRek } = await supabase
      .from('workers')
      .select('rekening')
      .eq('id', dataOrder.worker_id)
      .maybeSingle()
    rekening = dataRek?.rekening ?? null
  }

  const bagianWorker = o.dana_di_kas + o.total_dicairkan

  return (
    <>
      <Navigasi aktif={kodeGame} />
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Pencairan {o.kode} ({kodeGame})
        </h1>
        <Link href={`/game/${kodeGame}`} className="text-sm underline">
          Kembali
        </Link>
      </div>

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}

      <dl className="mb-6 grid max-w-md grid-cols-2 gap-y-1 text-sm">
        <dt className="opacity-70">Worker</dt>
        <dd className="font-medium">{o.worker}</dd>
        <dt className="opacity-70">Rekening tujuan</dt>
        <dd>{rekening ?? '-'}</dd>
        <dt className="opacity-70">Jenis joki</dt>
        <dd>{o.nama_joki}</dd>
        <dt className="opacity-70">Total harga</dt>
        <dd>{rupiah(o.total_harga)}</dd>
        <dt className="opacity-70">Bagian worker (setelah potongan)</dt>
        <dd>{rupiah(bagianWorker)}</dd>
        <dt className="opacity-70">Total dicairkan</dt>
        <dd>{rupiah(o.total_dicairkan)}</dd>
        <dt className="opacity-70">Dana di kas</dt>
        <dd className={o.dana_di_kas < 0 ? 'font-semibold text-red-600' : ''}>
          {rupiah(o.dana_di_kas)}
          {o.dana_di_kas < 0 && ' (kelebihan cair)'}
        </dd>
        <dt className="opacity-70">Status</dt>
        <dd className="font-medium">
          {o.kas === 'dibayarkan' ? 'Dibayarkan (terkunci untuk CS)' : 'Disimpan'}
        </dd>
      </dl>

      <div className="mb-8">
        {o.kas === 'disimpan' ? (
          <form action={tandaiSatu}>
            <input type="hidden" name="kode_game" value={kodeGame} />
            <input type="hidden" name="order_id" value={orderId} />
            <TombolKonfirmasi
              pesan="Tandai Dibayarkan? Sisa dana akan dicatat sebagai pelunasan dan order terkunci untuk CS."
              className="rounded bg-green-700 px-4 py-2 text-sm text-white"
            >
              Tandai Dibayarkan
            </TombolKonfirmasi>
          </form>
        ) : (
          <form action={batalkanSatu}>
            <input type="hidden" name="kode_game" value={kodeGame} />
            <input type="hidden" name="order_id" value={orderId} />
            <TombolKonfirmasi
              pesan="Batalkan status Dibayarkan? Pelunasan otomatis akan dihapus dan order terbuka kembali."
              className="rounded border px-4 py-2 text-sm"
            >
              Batalkan status Dibayarkan
            </TombolKonfirmasi>
          </form>
        )}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Riwayat pencairan</h2>
      {riwayat.length === 0 ? (
        <p className="mb-8 text-sm opacity-70">Belum ada pencairan.</p>
      ) : (
        <div className="mb-8 overflow-x-auto">
          <table className="w-full min-w-120 border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Waktu</th>
                <th className="py-2 pr-3">Jenis</th>
                <th className="py-2 pr-3 text-right">Jumlah</th>
                <th className="py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {new Date(r.tanggal).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 pr-3">
                    {r.pelunasan
                      ? 'Pelunasan'
                      : r.jenis === 'pencairan'
                        ? 'Pencairan awal'
                        : 'Pengembalian'}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {r.jenis === 'pengembalian' ? '-' : ''}
                    {rupiah(r.jumlah)}
                  </td>
                  <td className="py-2">{r.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 text-lg font-semibold">Catat pencairan baru</h2>
      <FormPencairan
        key={riwayat.length}
        kodeGame={kodeGame}
        orderId={orderId}
        dana={o.dana_di_kas}
      />
    </>
  )
}

export default function HalamanPencairan({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string; id: string }>
  searchParams: Promise<{ galat?: string }>
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
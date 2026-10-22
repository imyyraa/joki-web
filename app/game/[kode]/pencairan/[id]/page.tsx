import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { rupiah } from '@/lib/format'
import FormPencairan from './form-pencairan'
import { tandaiSatu, batalkanSatu, aturRefund } from './actions'

type Ringkasan = {
  id: number
  kode: string
  worker: string
  nama_joki: string
  total_harga: number
  total_dicairkan: number
  dana_di_kas: number
  refund: number
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
      'id, kode, worker, nama_joki, total_harga, total_dicairkan, dana_di_kas, kas, refund'
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          Pencairan {o.kode} ({kodeGame})
        </h1>
        <Link
          href={`/game/${kodeGame}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </div>

      {galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat}
        </p>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-muted/30 p-4 text-sm">
        <dt className="text-muted-foreground">Worker</dt>
        <dd className="font-medium">{o.worker}</dd>
        <dt className="text-muted-foreground">Rekening tujuan</dt>
        <dd className="break-words">{rekening ?? '-'}</dd>
        <dt className="text-muted-foreground">Jenis joki</dt>
        <dd>{o.nama_joki}</dd>
        <dt className="text-muted-foreground">Total harga</dt>
                <dt className="text-muted-foreground">Refund</dt>
        <dd className="tabular-nums">{o.refund ? rupiah(o.refund) : '-'}</dd>
        <dd className="tabular-nums">{rupiah(o.total_harga)}</dd>
        <dt className="text-muted-foreground">
          Bagian worker (setelah potongan)
        </dt>
        <dd className="tabular-nums">{rupiah(bagianWorker)}</dd>
        <dt className="text-muted-foreground">Total dicairkan</dt>
        <dd className="tabular-nums">{rupiah(o.total_dicairkan)}</dd>
        <dt className="text-muted-foreground">Dana di kas</dt>
        <dd
          className={`tabular-nums ${
            o.dana_di_kas < 0
              ? 'font-semibold text-red-600 dark:text-red-400'
              : ''
          }`}
        >
          {rupiah(o.dana_di_kas)}
          {o.dana_di_kas < 0 && ' (kelebihan cair)'}
        </dd>
        <dt className="text-muted-foreground">Status</dt>
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
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
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
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Batalkan status Dibayarkan
            </TombolKonfirmasi>
          </form>
        )}
      </div>
            <h2 className="mb-2 text-lg font-semibold">Refund</h2>
      <form
        action={aturRefund}
        className="mb-8 flex w-full flex-wrap items-end gap-3 rounded-md border p-4 sm:p-6"
      >
        <input type="hidden" name="kode_game" value={kodeGame} />
        <input type="hidden" name="order_id" value={orderId} />
        <div className="min-w-0 flex-1 basis-40">
          <label htmlFor="refund" className="block text-sm font-medium">
            Jumlah refund (Rp)
          </label>
          <input
            id="refund"
            name="refund"
            inputMode="numeric"
            defaultValue={String(o.refund ?? 0)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Boleh sebagian. Mengurangi pendapatan worker. Isi 0 untuk membatalkan refund.
          </p>
        </div>
        <TombolKonfirmasi
          pesan="Simpan refund untuk order ini?"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Simpan refund
        </TombolKonfirmasi>
      </form>
      <h2 className="mb-2 text-lg font-semibold">Riwayat pencairan</h2>
      {riwayat.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          Belum ada pencairan.
        </p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-md border">
          <table className="w-full min-w-120 border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Waktu</th>
                <th className="px-3 py-2 font-medium">Jenis</th>
                <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                <th className="px-3 py-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((r) => (
                <tr
                  key={r.id}
                  className="border-b last:border-b-0 hover:bg-muted/50"
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(r.tanggal).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {r.pelunasan
                      ? 'Pelunasan'
                      : r.jenis === 'pencairan'
                        ? 'Pencairan awal'
                        : 'Pengembalian'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {r.jenis === 'pengembalian' ? '-' : ''}
                    {rupiah(r.jumlah)}
                  </td>
                  <td className="px-3 py-2">{r.catatan}</td>
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
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
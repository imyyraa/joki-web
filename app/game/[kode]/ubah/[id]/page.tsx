import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import FormUbah from './form-ubah'

type BarisWorker = {
  status: string
  workers: { id: number; nama: string }
}

async function Isi({
  params,
}: {
  params: Promise<{ kode: string; id: string }>
}) {
  const pengguna = await wajibPeran(['admin', 'cs'])

  const { kode, id } = await params
  const kodeGame = decodeURIComponent(kode).toUpperCase()
  const orderId = Number(id)
  if (!Number.isInteger(orderId) || orderId <= 0) notFound()

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, kode')
    .eq('kode', kodeGame)
    .maybeSingle()
  if (!game) notFound()

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, kode, worker_id, nama_joki, harga, charge, refund, tanggal, progress, kas, catatan, alasan_memilih'
    )
    .eq('id', orderId)
    .eq('game_id', game.id)
    .maybeSingle()
  if (!order) notFound()

  const { data: privat } = await supabase
    .from('order_privat')
    .select('no_customer, bukti_bayar, bukti_selesai')
    .eq('order_id', orderId)
    .maybeSingle()

  const terkunci = order.kas === 'dibayarkan' && pengguna.peran !== 'admin'

  const { data: dataWorker } = await supabase
    .from('worker_games')
    .select('status, workers!inner(id, nama, aktif)')
    .eq('game_id', game.id)
    .is('selesai', null)
    .eq('workers.aktif', true)

  const worker = ((dataWorker ?? []) as unknown as BarisWorker[])
    .map((b) => ({ id: b.workers.id, nama: b.workers.nama, status: b.status }))
    .sort((a, b) =>
      a.status === b.status
        ? a.nama.localeCompare(b.nama)
        : a.status === 'normal'
          ? -1
          : 1
    )

  if (!worker.some((w) => w.id === order.worker_id)) {
    const { data: lama } = await supabase
      .from('workers')
      .select('id, nama')
      .eq('id', order.worker_id)
      .maybeSingle()
    if (lama) worker.push({ id: lama.id, nama: lama.nama, status: 'lama' })
  }

  return (
    <>
      <Navigasi aktif={kodeGame} />
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Ubah order {order.kode} ({kodeGame})
        </h1>
        <Link href={`/game/${kodeGame}`} className="text-sm underline">
          Kembali
        </Link>
      </div>

      {terkunci ? (
        <p className="max-w-xl rounded border p-4 text-sm">
          Order ini sudah berstatus <strong>Dibayarkan</strong> sehingga
          terkunci. Hanya admin yang dapat mengubahnya.
        </p>
      ) : (
        <FormUbah
          kodeGame={kodeGame}
          orderId={orderId}
          kodeOrder={order.kode}
          kas={order.kas}
          worker={worker}
          buktiBayar={privat?.bukti_bayar ?? null}
          buktiSelesai={privat?.bukti_selesai ?? null}
          awal={{
            worker_id: String(order.worker_id),
            nama_joki: order.nama_joki,
            harga: String(order.harga),
            charge: String(order.charge),
            refund: String(order.refund),
            tanggal: order.tanggal,
            progress: order.progress,
            no_customer: privat?.no_customer ?? '',
            catatan: order.catatan ?? '',
            alasan: order.alasan_memilih ?? '',
          }}
        />
      )}
    </>
  )
}

export default function HalamanUbah({
  params,
}: {
  params: Promise<{ kode: string; id: string }>
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} />
      </Suspense>
    </main>
  )
}
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import FormOrder from './form-order'

type BarisPrioritas = {
  worker_id: number
  nama: string
  status: string
  urutan: number
  total_penghasilan: number
}

async function Isi({ params }: { params: Promise<{ kode: string }> }) {
  await wajibPeran(['admin', 'cs'])

  const { kode } = await params
  const kodeGame = decodeURIComponent(kode).toUpperCase()
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, kode, aktif')
    .eq('kode', kodeGame)
    .maybeSingle()
  if (!game) notFound()
  if (!game.aktif) notFound()

  const { data } = await supabase
    .from('v_prioritas_game')
    .select('worker_id, nama, status, urutan, total_penghasilan')
    .eq('game', kodeGame)
    .order('urutan')

  const worker = ((data ?? []) as BarisPrioritas[]).map((b) => ({
    id: b.worker_id,
    nama: b.nama,
    status: b.status,
    urutan: b.urutan,
    total: b.total_penghasilan,
  }))

  const hariIni = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Jakarta',
  })

  return (
    <>
      <Navigasi aktif={kodeGame} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          Tambah order {kodeGame}
        </h1>
        <Link
          href={`/game/${kodeGame}`}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </div>
      <FormOrder kodeGame={kodeGame} worker={worker} hariIni={hariIni} />
    </>
  )
}

export default function HalamanTambah({
  params,
}: {
  params: Promise<{ kode: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} />
      </Suspense>
    </main>
  )
}
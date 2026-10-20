import { Suspense } from 'react'
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
    return <p className="text-red-600">Gagal memuat data: {error.message}</p>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-160 border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">Worker</th>
            <th className="py-2 pr-4">Game</th>
            <th className="py-2 pr-4 text-right">Total orderan</th>
            <th className="py-2 pr-4 text-right">Total penghasilan</th>
            <th className="py-2 pr-4 text-right">Kas tersimpan</th>
            {totalTagihan > 0 && (
              <th className="py-2 pr-4 text-right">Tagihan ke worker</th>
            )}
            {pengguna && <th className="py-2">Rekening</th>}
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr key={b.worker_id} className="border-b align-top">
              <td className="py-2 pr-4 font-medium">
                <Link href={`/worker/${b.worker_id}`} className="underline">
                  {b.nama}
                </Link>
              </td>
              <td className="py-2 pr-4">{b.game_dijoki ?? '-'}</td>
              <td className="py-2 pr-4 text-right">{b.total_orderan}</td>
              <td className="py-2 pr-4 text-right">
                {rupiah(b.total_penghasilan)}
              </td>
              <td className="py-2 pr-4 text-right">
                {rupiah(b.total_kas_tersimpan)}
              </td>
              {totalTagihan > 0 && (
                <td
                  className={`py-2 pr-4 text-right ${
                    b.tagihan_ke_worker > 0 ? 'font-semibold text-red-600' : ''
                  }`}
                >
                  {b.tagihan_ke_worker > 0 ? rupiah(b.tagihan_ke_worker) : '-'}
                </td>
              )}
              {pengguna && (
                <td className="py-2">{rekening.get(b.worker_id) ?? '-'}</td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="py-2 pr-4" colSpan={2}>
              Total
            </td>
            <td className="py-2 pr-4 text-right">{totalOrderan}</td>
            <td className="py-2 pr-4 text-right">{rupiah(totalPenghasilan)}</td>
            <td className="py-2 pr-4 text-right">{rupiah(totalKas)}</td>
            {totalTagihan > 0 && (
              <td className="py-2 pr-4 text-right">{rupiah(totalTagihan)}</td>
            )}
            {pengguna && <td></td>}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <Suspense fallback={<div className="mb-6 h-9" />}>
        <Navigasi aktif="rekap" />
      </Suspense>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Rekap Worker</h1>
          <p className="mt-1 text-sm opacity-70">
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

      <p className="mt-6 text-xs opacity-70">
        Total penghasilan memakai harga penuh. Kas tersimpan adalah bagian
        worker (setelah potongan toko) yang belum dicairkan.
      </p>
    </main>
  )
}
import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { rupiah } from '@/lib/format'
import { pulihkanOrder } from './actions'

type Baris = {
  id: number
  kode: string
  nama_joki: string
  harga: number
  charge: number
  refund: number
  dihapus_pada: string
  games: { kode: string }
  workers: { nama: string }
}

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  await wajibPeran(['admin'])
  const { galat, ok } = await searchParams

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .select(
      'id, kode, nama_joki, harga, charge, refund, dihapus_pada, games(kode), workers(nama)'
    )
    .not('dihapus_pada', 'is', null)
    .order('dihapus_pada', { ascending: false })

  const baris = (data ?? []) as unknown as Baris[]

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Tempat sampah order</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="sampah" />

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}

      {error ? (
        <p className="text-red-600">Gagal memuat data: {error.message}</p>
      ) : baris.length === 0 ? (
        <p className="text-sm opacity-70">Tempat sampah kosong.</p>
      ) : (
        <form action={pulihkanOrder}>
          <div className="mb-2">
            <TombolKonfirmasi
              pesan="Pulihkan order yang dicentang?"
              className="rounded bg-black px-3 py-1.5 text-sm text-white"
            >
              Pulihkan yang dicentang
            </TombolKonfirmasi>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">Kode</th>
                  <th className="py-2 pr-3">Game</th>
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Joki</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2">Dihapus</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 pr-3">
                      <input type="checkbox" name="order_id" value={b.id} />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{b.kode}</td>
                    <td className="py-2 pr-3">{b.games.kode}</td>
                    <td className="py-2 pr-3">{b.workers.nama}</td>
                    <td className="py-2 pr-3">{b.nama_joki}</td>
                    <td className="py-2 pr-3 text-right">
                      {rupiah(b.harga + b.charge - b.refund)}
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {new Date(b.dihapus_pada).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </>
  )
}

export default function HalamanSampah({
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
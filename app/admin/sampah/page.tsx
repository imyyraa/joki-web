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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">
            Tempat sampah order
          </h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="sampah" />

      {galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-md border border-green-600/40 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
          {ok}
        </p>
      )}

      {error ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat data: {error.message}
        </p>
      ) : baris.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tempat sampah kosong.</p>
      ) : (
        <form action={pulihkanOrder}>
          <div className="mb-2">
            <TombolKonfirmasi
              pesan="Pulihkan order yang dicentang?"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Pulihkan yang dicentang
            </TombolKonfirmasi>
          </div>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            Geser tabel ke kiri-kanan untuk melihat semua kolom.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 font-medium">Kode</th>
                  <th className="px-3 py-2 font-medium">Game</th>
                  <th className="px-3 py-2 font-medium">Worker</th>
                  <th className="px-3 py-2 font-medium">Joki</th>
                  <th className="px-3 py-2 text-right font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Dihapus</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        name="order_id"
                        value={b.id}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{b.kode}</td>
                    <td className="px-3 py-2">{b.games.kode}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {b.workers.nama}
                    </td>
                    <td className="min-w-40 px-3 py-2">{b.nama_joki}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {rupiah(b.harga + b.charge - b.refund)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
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
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
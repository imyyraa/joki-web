import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { tanggalIndo } from '@/lib/format'

type Hasil = {
  order_id: number
  game: string
  kode: string
  nama_joki: string
  worker: string
  tanggal: string
  progress: 'progress' | 'selesai'
  kas: 'disimpan' | 'dibayarkan'
  no_customer: string | null
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

export default async function HasilCari({ kata }: { kata: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cari_order', { p_kata: kata })

  if (error) {
    return (
      <p className="mb-6 text-sm text-red-600 dark:text-red-400">
        {error.message}
      </p>
    )
  }

  const hasil = (data ?? []) as Hasil[]

  return (
    <section className="mb-8 min-w-0 rounded-md border bg-muted/30 p-4">
      <h2 className="mb-2 break-all text-lg font-semibold">
        {`Hasil pencarian “${kata}” (semua game)`}
      </h2>

      {hasil.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada order yang cocok.
        </p>
      ) : (
        <>
          {hasil.length === 50 && (
            <p className="mb-2 text-xs text-muted-foreground">
              Menampilkan 50 hasil terbaru. Perjelas kata pencarian untuk
              mempersempit.
            </p>
          )}
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            Geser tabel ke kiri-kanan untuk melihat semua kolom.
          </p>
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Game</th>
                  <th className="px-3 py-2 font-medium">Kode</th>
                  <th className="px-3 py-2 font-medium">Joki</th>
                  <th className="px-3 py-2 font-medium">Worker</th>
                  <th className="px-3 py-2 font-medium">Nomor customer</th>
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Kas</th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((h) => (
                  <tr
                    key={h.order_id}
                    className="border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/game/${h.game}`}
                        className="font-semibold text-primary underline"
                      >
                        {h.game}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{h.kode}</td>
                    <td className="min-w-40 px-3 py-2">{h.nama_joki}</td>
                    <td className="whitespace-nowrap px-3 py-2">{h.worker}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {h.no_customer ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {tanggalIndo(h.tanggal)}
                    </td>
                    <td className="px-3 py-2">
                      {h.progress === 'selesai' ? (
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
                      {h.kas === 'dibayarkan' ? (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
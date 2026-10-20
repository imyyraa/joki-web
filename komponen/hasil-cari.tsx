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

export default async function HasilCari({ kata }: { kata: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cari_order', { p_kata: kata })

  if (error) {
    return <p className="mb-6 text-sm text-red-600">{error.message}</p>
  }

  const hasil = (data ?? []) as Hasil[]

  return (
    <section className="mb-8 rounded border p-4">
      <h2 className="mb-2 text-lg font-semibold">
        {`Hasil pencarian “${kata}” (semua game)`}
      </h2>

      {hasil.length === 0 ? (
        <p className="text-sm opacity-70">Tidak ada order yang cocok.</p>
      ) : (
        <>
          {hasil.length === 50 && (
            <p className="mb-2 text-xs opacity-70">
              Menampilkan 50 hasil terbaru. Perjelas kata pencarian untuk
              mempersempit.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Game</th>
                  <th className="py-2 pr-3">Kode</th>
                  <th className="py-2 pr-3">Joki</th>
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3">Nomor customer</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Progress</th>
                  <th className="py-2">Kas</th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((h) => (
                  <tr key={h.order_id} className="border-b">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/game/${h.game}`}
                        className="font-semibold underline"
                      >
                        {h.game}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{h.kode}</td>
                    <td className="py-2 pr-3">{h.nama_joki}</td>
                    <td className="py-2 pr-3">{h.worker}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {h.no_customer ?? '-'}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {tanggalIndo(h.tanggal)}
                    </td>
                    <td className="py-2 pr-3">
                      {h.progress === 'selesai' ? 'Selesai' : 'Progress'}
                    </td>
                    <td className="py-2">
                      {h.kas === 'dibayarkan' ? 'Dibayarkan' : 'Disimpan'}
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
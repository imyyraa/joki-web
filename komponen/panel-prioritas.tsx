import { createClient } from '@/lib/supabase/server'
import { rupiah } from '@/lib/format'

type Baris = {
  worker_id: number
  nama: string
  status: string
  total_orderan: number
  total_penghasilan: number
  total_kas_tersimpan: number
  urutan: number
}

function warnaHeat(nilai: number, min: number, maks: number) {
  const t = maks === min ? 0 : (nilai - min) / (maks - min)
  const hue = Math.round(120 * (1 - t))
  return `hsl(${hue} 70% 50% / 0.35)`
}

export default async function PanelPrioritas({
  kodeGame,
}: {
  kodeGame: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_prioritas_game')
    .select(
      'worker_id, nama, status, total_orderan, total_penghasilan, total_kas_tersimpan, urutan'
    )
    .eq('game', kodeGame)
    .order('urutan')

  if (error) {
    return (
      <p className="mb-6 text-sm text-red-600">
        Gagal memuat prioritas: {error.message}
      </p>
    )
  }

  const baris = (data ?? []) as Baris[]
  if (baris.length === 0) {
    return (
      <p className="mb-6 text-sm opacity-70">Belum ada worker di game ini.</p>
    )
  }

  const nilaiNormal = baris
    .filter((b) => b.status === 'normal')
    .map((b) => b.total_penghasilan)
  const min = nilaiNormal.length ? Math.min(...nilaiNormal) : 0
  const maks = nilaiNormal.length ? Math.max(...nilaiNormal) : 0

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold">Prioritas worker {kodeGame}</h2>
      <p className="mb-2 text-xs opacity-70">
        Urutan 1 adalah yang diprioritaskan mengambil joki berikutnya: total
        penghasilan (semua game) paling sedikit, jika sama dilihat jumlah order
        paling sedikit. Worker cadangan ada di bawah.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-120 border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3">No</th>
              <th className="py-2 pr-3">Worker</th>
              <th className="py-2 pr-3 text-right">Total orderan</th>
              <th className="py-2 pr-3 text-right">Total penghasilan</th>
              <th className="py-2 text-right">Kas tersimpan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const cadangan = b.status === 'cadangan'
              return (
                <tr
                  key={b.worker_id}
                  className={`border-b ${cadangan ? 'opacity-60' : ''}`}
                >
                  <td className="py-2 pr-3">{b.urutan}</td>
                  <td className="py-2 pr-3 font-medium">
                    {b.nama}
                    {cadangan && (
                      <span className="ml-2 text-xs italic">(cadangan)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">{b.total_orderan}</td>
                  <td
                    className="py-2 pr-3 text-right"
                    style={
                      cadangan
                        ? undefined
                        : {
                            backgroundColor: warnaHeat(
                              b.total_penghasilan,
                              min,
                              maks
                            ),
                          }
                    }
                  >
                    {rupiah(b.total_penghasilan)}
                  </td>
                  <td className="py-2 text-right">
                    {rupiah(b.total_kas_tersimpan)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
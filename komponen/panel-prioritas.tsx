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
      <p className="mb-6 text-sm text-red-600 dark:text-red-400">
        Gagal memuat prioritas: {error.message}
      </p>
    )
  }

  const baris = (data ?? []) as Baris[]

  if (baris.length === 0) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        Belum ada worker di game ini.
      </p>
    )
  }

  const nilaiNormal = baris
    .filter((b) => b.status === 'normal')
    .map((b) => b.total_penghasilan)
  const min = nilaiNormal.length ? Math.min(...nilaiNormal) : 0
  const maks = nilaiNormal.length ? Math.max(...nilaiNormal) : 0

  return (
    <section className="mb-8 min-w-0">
      <h2 className="text-lg font-semibold">Prioritas worker {kodeGame}</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Urutan 1 adalah yang diprioritaskan mengambil joki berikutnya: total
        penghasilan (semua game) paling sedikit, jika sama dilihat jumlah order
        paling sedikit. Worker cadangan ada di bawah.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-120 border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">No</th>
              <th className="px-3 py-2 font-medium">Worker</th>
              <th className="px-3 py-2 text-right font-medium">Total orderan</th>
              <th className="px-3 py-2 text-right font-medium">
                Total penghasilan
              </th>
              <th className="px-3 py-2 text-right font-medium">Kas tersimpan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => {
              const cadangan = b.status === 'cadangan'
              return (
                <tr
                  key={b.worker_id}
                  className={`border-b last:border-b-0 ${cadangan ? 'opacity-60' : ''}`}
                >
                  <td className="px-3 py-2">{b.urutan}</td>
                  <td className="px-3 py-2 font-medium">
                    {b.nama}
                    {cadangan && (
                      <span className="ml-2 text-xs italic">(cadangan)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {b.total_orderan}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 text-right tabular-nums"
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
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
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
import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { tanggalIndo } from '@/lib/format'
import { ukuranFile, BATAS_PENYIMPANAN_BYTE } from '@/lib/ukuran'
import { hapusBukti } from './actions'

type Baris = {
  order_id: number
  kode_order: string
  kode_game: string
  nama_joki: string
  tanggal: string
  jumlah_file: number
  ukuran: number
}

type Param = {
  mode?: string
  bulan?: string
  id?: string | string[]
  ok?: string
  galat?: string
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function labelBulan(kunci: string) {
  const [tahun, bulan] = kunci.split('-')
  return `${NAMA_BULAN[Number(bulan) - 1] ?? bulan} ${tahun}`
}

function jumlahkan(baris: Baris[]) {
  return {
    order: baris.length,
    file: baris.reduce((a, b) => a + b.jumlah_file, 0),
    byte: baris.reduce((a, b) => a + Number(b.ukuran), 0),
  }
}

const kelasMerah =
  'rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'

async function Isi({ searchParams }: { searchParams: Promise<Param> }) {
  await wajibPeran(['admin'])
  const p = await searchParams
  const mode = p.mode === 'pilih' ? 'pilih' : 'bulan'

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('bukti_bisa_dibersihkan')
  const semua = (data ?? []) as Baris[]

  const { data: dataPakai } = await supabase.rpc('pemakaian_penyimpanan')
  const pakai = (
    dataPakai as { jumlah_file: number; total_byte: number }[] | null
  )?.[0]
  const terpakai = Number(pakai?.total_byte ?? 0)
  const persen = Math.min(100, (terpakai / BATAS_PENYIMPANAN_BYTE) * 100)
  const warnaBar =
    persen >= 90 ? 'bg-red-600' : persen >= 70 ? 'bg-yellow-500' : 'bg-primary'

  // Pengelompokan per bulan
  const grup = new Map<string, Baris[]>()
  for (const b of semua) {
    const kunci = b.tanggal.slice(0, 7)
    grup.set(kunci, [...(grup.get(kunci) ?? []), b])
  }
  const bulanBulan = [...grup.keys()].sort().reverse()

  // Pilihan untuk pratinjau
  const idPilihan = new Set(
    ([] as string[]).concat(p.id ?? []).map(Number).filter((n) => n > 0)
  )
  const bulanPilihan = p.bulan && grup.has(p.bulan) ? p.bulan : ''
  const terpilih =
    mode === 'bulan'
      ? bulanPilihan
        ? (grup.get(bulanPilihan) ?? [])
        : []
      : semua.filter((b) => idPilihan.has(b.order_id))
  const ringkas = jumlahkan(terpilih)

  const tab = (kunci: string, label: string) => (
    <Link
      href={`/admin/bukti?mode=${kunci}`}
      aria-current={mode === kunci ? 'page' : undefined}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
        mode === kunci
          ? 'bg-primary text-primary-foreground'
          : 'border bg-muted/40 hover:bg-muted'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Bersihkan bukti</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="bukti" />

      {p.galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {p.galat}
        </p>
      )}
      {p.ok && (
        <p className="mb-4 rounded-md border border-green-600/40 bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
          {p.ok}
        </p>
      )}

      <section className="mb-6 rounded-xl border bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Penyimpanan file</h2>
          <p className="text-sm tabular-nums">
            {ukuranFile(terpakai)} dari {ukuranFile(BATAS_PENYIMPANAN_BYTE)} (
            {persen.toFixed(1)}%)
          </p>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${warnaBar}`}
            style={{ width: `${persen}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {Number(pakai?.jumlah_file ?? 0)} file tersimpan. Batas mengikuti
          paket Supabase Anda.
        </p>
      </section>

      <p className="mb-3 text-sm text-muted-foreground">
        Hanya bukti dari order <strong>Selesai</strong> dan{' '}
        <strong>Dibayarkan</strong> yang bisa dihapus. Data order dan totalnya
        tidak berubah, tetapi file yang dihapus tidak bisa dikembalikan.
      </p>

      <div className="tanpa-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {tab('bulan', 'Per bulan')}
        {tab('pilih', 'Per centang')}
      </div>

      {error ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat data: {error.message}
        </p>
      ) : semua.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada bukti yang memenuhi syarat untuk dihapus.
        </p>
      ) : (
        <>
          {terpilih.length > 0 && (
            <section className="mb-6 rounded-xl border border-primary/60 bg-surface p-4">
              <h2 className="text-sm font-semibold">Pratinjau</h2>
              <p className="mt-1 text-sm">
                {mode === 'bulan' && bulanPilihan
                  ? `${labelBulan(bulanPilihan)}: `
                  : ''}
                <strong>{ringkas.order}</strong> order,{' '}
                <strong>{ringkas.file}</strong> file,{' '}
                <strong>{ukuranFile(ringkas.byte)}</strong>
              </p>

              {mode === 'pilih' && (
                <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {terpilih.map((b) => (
                    <li key={b.order_id}>
                      <span className="font-semibold text-foreground">
                        {b.kode_order}
                      </span>{' '}
                      {b.kode_game} · {b.nama_joki} · {b.jumlah_file} file (
                      {ukuranFile(Number(b.ukuran))})
                    </li>
                  ))}
                </ul>
              )}

              <form action={hapusBukti} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="mode" value={mode} />
                {mode === 'bulan' ? (
                  <input type="hidden" name="bulan" value={bulanPilihan} />
                ) : (
                  terpilih.map((b) => (
                    <input
                      key={b.order_id}
                      type="hidden"
                      name="order_id"
                      value={b.order_id}
                    />
                  ))
                )}
                <TombolKonfirmasi
                  pesan={`Hapus ${ringkas.file} file bukti (${ukuranFile(ringkas.byte)}) dari ${ringkas.order} order? Tindakan ini tidak bisa dibatalkan. Data order dan total tidak berubah.`}
                  className={kelasMerah}
                >
                  Hapus {ringkas.file} file ({ukuranFile(ringkas.byte)})
                </TombolKonfirmasi>
                <Link
                  href={`/admin/bukti?mode=${mode}`}
                  className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Batal
                </Link>
              </form>
            </section>
          )}

          {mode === 'bulan' ? (
            <ul className="space-y-2">
              {bulanBulan.map((kunci) => {
                const r = jumlahkan(grup.get(kunci) ?? [])
                return (
                  <li key={kunci}>
                    <Link
                      href={`/admin/bukti?mode=bulan&bulan=${kunci}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border bg-surface p-3 hover:opacity-90 ${
                        kunci === bulanPilihan ? 'border-primary/60' : ''
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {labelBulan(kunci)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {r.order} order · {r.file} file ·{' '}
                          {ukuranFile(r.byte)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-primary">
                        Pratinjau →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <form method="get" action="/admin/bukti">
              <input type="hidden" name="mode" value="pilih" />
              <ul className="mb-4 space-y-2">
                {semua.map((b) => (
                  <li key={b.order_id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-surface p-3">
                      <input
                        type="checkbox"
                        name="id"
                        value={b.order_id}
                        defaultChecked={idPilihan.has(b.order_id)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-bold text-blue-500 dark:text-blue-400">
                            {b.kode_order}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.kode_game} · {tanggalIndo(b.tanggal)}
                          </span>
                        </span>
                        <span className="block truncate text-sm">
                          {b.nama_joki}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {b.jumlah_file} file ({ukuranFile(Number(b.ukuran))})
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Pratinjau pilihan
              </button>
            </form>
          )}
        </>
      )}
    </>
  )
}

export default function HalamanBukti({
  searchParams,
}: {
  searchParams: Promise<Param>
}) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
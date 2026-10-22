import { Suspense, type ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import PanelPrioritas from '@/komponen/panel-prioritas'
import PembungkusHapus from '@/komponen/pembungkus-hapus'
import { rupiah, tanggalIndo } from '@/lib/format'
import { hapusOrder } from './actions'
import HasilCari from '@/komponen/hasil-cari'

type BarisOrder = {
  id: number
  kode: string
  nama_joki: string
  worker: string
  harga: number
  charge: number
  refund: number
  total_harga: number
  tanggal: string
  progress: 'progress' | 'selesai'
  kas: 'disimpan' | 'dibayarkan'
  total_dicairkan: number
  dana_di_kas: number
  catatan: string | null
  alasan_memilih: string | null
}

type BarisBukti = {
  order_id: number
  bukti_bayar: string | null
  bukti_selesai: string | null
}

type BarisNomor = {
  order_id: number
  no_customer: string | null
}

type BarisBuktiCharge = { order_id: number; bukti_charge: string | null }

function Lencana({ teks, warna }: { teks: string; warna: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${warna}`}
    >
      {teks}
    </span>
  )
}

function LencanaProgress({ progress }: { progress: 'progress' | 'selesai' }) {
  return progress === 'selesai' ? (
    <Lencana
      teks="Selesai"
      warna="bg-green-500/20 text-green-800 dark:text-green-300"
    />
  ) : (
    <Lencana
      teks="Progress"
      warna="bg-yellow-500/20 text-yellow-800 dark:text-yellow-300"
    />
  )
}

function LencanaKas({ kas }: { kas: 'disimpan' | 'dibayarkan' }) {
  return kas === 'dibayarkan' ? (
    <Lencana
      teks="Dibayarkan"
      warna="bg-green-500/20 text-green-800 dark:text-green-300"
    />
  ) : (
    <Lencana
      teks="Disimpan"
      warna="bg-blue-500/20 text-blue-800 dark:text-blue-300"
    />
  )
}

function LinkBukti({
  path,
  label,
  bersih,
}: {
  path?: string | null
  label: string
  bersih?: boolean
}) {
  if (!path) {
    return (
      <span className="mr-2 text-xs text-muted-foreground opacity-60">
        {label}: {bersih ? 'dihapus' : '-'}
      </span>
    )
  }
  return (
    <a
      href={`/bukti?p=${encodeURIComponent(path)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mr-2 text-xs text-primary underline"
    >
      {label}
    </a>
  )
}

function Isian({
  label,
  penuh,
  children,
}: {
  label: string
  penuh?: boolean
  children: ReactNode
}) {
  return (
    <div className={penuh ? 'col-span-2' : ''}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{children}</dd>
    </div>
  )
}

async function Isi({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>
  searchParams: Promise<{ galat?: string; ok?: string; cari?: string }>
}) {
  const { kode } = await params
  const { galat, ok, cari: kataCari } = await searchParams
  const kodeGame = decodeURIComponent(kode).toUpperCase()
  const supabase = await createClient()
  const pengguna = await ambilPengguna()

  const { data: game } = await supabase
    .from('games')
    .select('id, kode, nama, aktif')
    .eq('kode', kodeGame)
    .maybeSingle()
  if (!game) notFound()

  let bolehKelola = false
  if (pengguna) {
    const { data: izin } = await supabase.rpc('boleh_kelola_game', {
      p_game: game.id,
    })
    bolehKelola = izin === true
  }
  const adalahAdmin = pengguna?.peran === 'admin'

  const { data, error } = await supabase
    .from('v_order_publik')
    .select('*')
    .eq('game', kodeGame)
    .order('tanggal', { ascending: false })
    .order('kode', { ascending: false })

  const baris = (data ?? []) as BarisOrder[]

  const bukti = new Map<number, BarisBukti>()

  const nomor = new Map<number, string | null>()
  if (pengguna && baris.length > 0) {
    const { data: dataNomor } = await supabase.rpc('nomor_customer_order', {
      p_order_ids: baris.map((b) => b.id),
    })
    for (const r of (dataNomor ?? []) as BarisNomor[]) {
      nomor.set(r.order_id, r.no_customer)
    }
  }

  const buktiCharge = new Map<number, string | null>()
  if (pengguna && baris.length > 0) {
    const { data: dataCharge } = await supabase.rpc('bukti_charge_order', {
      p_order_ids: baris.map((b) => b.id),
    })
    for (const r of (dataCharge ?? []) as BarisBuktiCharge[]) {
      buktiCharge.set(r.order_id, r.bukti_charge)
    }
  }

  const dibersihkan = new Set<number>()
  if (pengguna && baris.length > 0) {
    const { data: dataBersih } = await supabase.rpc('bukti_dibersihkan_order', {
      p_order_ids: baris.map((b) => b.id),
    })
    for (const r of (dataBersih ?? []) as { order_id: number }[]) {
      dibersihkan.add(r.order_id)
    }
  }

  if (pengguna && baris.length > 0) {
    const { data: dataBukti } = await supabase.rpc('bukti_order', {
      p_order_ids: baris.map((b) => b.id),
    })
    for (const r of (dataBukti ?? []) as BarisBukti[]) {
      bukti.set(r.order_id, r)
    }
  }

  const bisaTambah = bolehKelola && game.aktif
  const linkTambah = (kelas: string) => (
    <Link href={`/game/${kodeGame}/tambah`} className={kelas}>
      + Tambah order
    </Link>
  )
  const kelasTambahMobile =
    'inline-block whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90'

  const punyaNama = !!game.nama && game.nama !== kodeGame

  /* Tampilan HP: baris accordion */
  const kartu = (
    <ul className="space-y-2 sm:hidden">
      {baris.map((b) => {
        const terkunci = b.kas === 'dibayarkan' && !adalahAdmin
        return (
          <li key={b.id} className="flex items-start gap-2">
            {adalahAdmin && (
              <div className="sel-hapus pt-4">
                <input
                  type="checkbox"
                  name="order_id"
                  value={b.id}
                  aria-label={`Pilih ${b.kode}`}
                  className="h-5 w-5 accent-red-600"
                />
              </div>
            )}
            <details className="group min-w-0 flex-1 rounded-xl border bg-surface open:border-primary/60">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 [&::-webkit-details-marker]:hidden">
                <span className="shrink-0 border-r pr-3 text-sm font-bold text-blue-500 dark:text-blue-400">
                  {b.kode}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium">
                    {b.nama_joki}
                  </span>
                  {pengguna && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {nomor.get(b.id) ?? '-'}
                    </span>
                  )}
                </span>
                <LencanaProgress progress={b.progress} />
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </summary>

              <div className="border-t px-3 py-3">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
                  <Isian label="Worker">{b.worker}</Isian>
                  <Isian label="Tanggal">{tanggalIndo(b.tanggal)}</Isian>
                  <Isian label="Harga">{rupiah(b.harga)}</Isian>
                  <Isian label="Total">{rupiah(b.total_harga)}</Isian>
                  <Isian label="Charge">
                    {b.charge ? rupiah(b.charge) : '-'}
                  </Isian>
                  <Isian label="Refund">
                    {b.refund ? rupiah(b.refund) : '-'}
                  </Isian>
                  <Isian label="Status kas">
                    <LencanaKas kas={b.kas} />
                  </Isian>
                  <Isian label="Dicairkan">
                    {b.total_dicairkan ? rupiah(b.total_dicairkan) : '-'}
                  </Isian>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">
                      Dana di kas
                    </dt>
                    <dd
                      className={`mt-0.5 font-medium tabular-nums ${
                        b.dana_di_kas < 0
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : ''
                      }`}
                    >
                      {rupiah(b.dana_di_kas)}
                      {b.dana_di_kas < 0 && (
                        <span className="ml-2 text-xs">kelebihan cair</span>
                      )}
                    </dd>
                  </div>
                  {(b.catatan || b.alasan_memilih) && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Catatan</dt>
                      <dd className="mt-0.5">
                        {b.catatan}
                        {b.alasan_memilih && (
                          <span className="block text-xs text-muted-foreground">
                            Alasan memilih: {b.alasan_memilih}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {pengguna && (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">Bukti</dt>
                      <dd className="mt-0.5">
                        <LinkBukti
                          path={bukti.get(b.id)?.bukti_bayar}
                          label="Bayar"
                          bersih={dibersihkan.has(b.id)}
                        />
                        <LinkBukti
                          path={bukti.get(b.id)?.bukti_selesai}
                          label="Selesai"
                          bersih={dibersihkan.has(b.id)}
                        />
                        {(b.charge > 0 || buktiCharge.get(b.id)) && (
                          <LinkBukti
                            path={buktiCharge.get(b.id)}
                            label="Charge"
                            bersih={dibersihkan.has(b.id)}
                          />
                        )}
                      </dd>
                    </div>
                  )}
                </dl>

                {bolehKelola && (
                  <div className="mt-4 flex gap-2">
                    {terkunci ? (
                      <span className="flex flex-1 items-center justify-center rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                        Terkunci
                      </span>
                    ) : (
                      <Link
                        href={`/game/${kodeGame}/ubah/${b.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm font-medium hover:opacity-80"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                        Ubah Order
                      </Link>
                    )}
                    {adalahAdmin && (
                      <Link
                        href={`/game/${kodeGame}/pencairan/${b.id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 7a2 2 0 0 1 2-2h13v4" />
                          <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3" />
                          <path d="M21 9v6h-4a3 3 0 0 1 0-6z" />
                        </svg>
                        Pencairan
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )

  /* Tampilan layar lebar: tabel */
  const tabel = (
    <div className="hidden overflow-x-auto rounded-md border sm:block">
      <table className="w-full min-w-300 border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted text-left text-muted-foreground">
            {adalahAdmin && <th className="sel-hapus px-3 py-2"></th>}
            <th className="px-3 py-2 font-medium">Kode</th>
            <th className="px-3 py-2 font-medium">Joki</th>
            {pengguna && (
              <th className="px-3 py-2 font-medium">Nomor customer</th>
            )}
            <th className="px-3 py-2 font-medium">Worker</th>
            <th className="px-3 py-2 text-right font-medium">Harga</th>
            <th className="px-3 py-2 text-right font-medium">Charge</th>
            <th className="px-3 py-2 text-right font-medium">Refund</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 font-medium">Tanggal</th>
            <th className="px-3 py-2 font-medium">Progress</th>
            <th className="px-3 py-2 font-medium">Kas</th>
            <th className="px-3 py-2 text-right font-medium">Dicairkan</th>
            <th className="px-3 py-2 text-right font-medium">Dana di kas</th>
            <th className="px-3 py-2 font-medium">Catatan</th>
            {pengguna && (
              <th className="px-3 py-2 font-medium">Bukti / aksi</th>
            )}
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr
              key={b.id}
              className="border-b align-top last:border-b-0 hover:bg-muted/50"
            >
              {adalahAdmin && (
                <td className="sel-hapus px-3 py-2">
                  <input
                    type="checkbox"
                    name="order_id"
                    value={b.id}
                    className="h-4 w-4 accent-red-600"
                  />
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-2">{b.kode}</td>
              <td className="min-w-40 px-3 py-2">{b.nama_joki}</td>
              {pengguna && (
                <td className="whitespace-nowrap px-3 py-2">
                  {nomor.get(b.id) ?? '-'}
                </td>
              )}
              <td className="whitespace-nowrap px-3 py-2 font-medium">
                {b.worker}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {rupiah(b.harga)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {b.charge ? rupiah(b.charge) : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {b.refund ? rupiah(b.refund) : '-'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {rupiah(b.total_harga)}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {tanggalIndo(b.tanggal)}
              </td>
              <td className="px-3 py-2">
                <LencanaProgress progress={b.progress} />
              </td>
              <td className="px-3 py-2">
                <LencanaKas kas={b.kas} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                {b.total_dicairkan ? rupiah(b.total_dicairkan) : '-'}
              </td>
              <td
                className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
                  b.dana_di_kas < 0
                    ? 'font-semibold text-red-600 dark:text-red-400'
                    : ''
                }`}
              >
                {rupiah(b.dana_di_kas)}
                {b.dana_di_kas < 0 && (
                  <div className="text-xs">kelebihan cair</div>
                )}
              </td>
              <td className="min-w-48 px-3 py-2">
                {b.catatan}
                {b.alasan_memilih && (
                  <div className="text-xs text-muted-foreground">
                    Alasan memilih: {b.alasan_memilih}
                  </div>
                )}
              </td>
              {pengguna && (
                <td className="whitespace-nowrap px-3 py-2">
                  <LinkBukti
                    path={bukti.get(b.id)?.bukti_bayar}
                    label="Bayar"
                    bersih={dibersihkan.has(b.id)}
                  />
                  <LinkBukti
                    path={bukti.get(b.id)?.bukti_selesai}
                    label="Selesai"
                    bersih={dibersihkan.has(b.id)}
                  />
                  {(b.charge > 0 || buktiCharge.get(b.id)) && (
                    <LinkBukti
                      path={buktiCharge.get(b.id)}
                      label="Charge"
                      bersih={dibersihkan.has(b.id)}
                    />
                  )}
                  {bolehKelola &&
                    (b.kas === 'dibayarkan' && !adalahAdmin ? (
                      <span className="text-xs text-muted-foreground">
                        Terkunci
                      </span>
                    ) : (
                      <Link
                        href={`/game/${kodeGame}/ubah/${b.id}`}
                        className="text-xs font-semibold text-primary underline"
                      >
                        Ubah
                      </Link>
                    ))}
                  {adalahAdmin && (
                    <Link
                      href={`/game/${kodeGame}/pencairan/${b.id}`}
                      className="ml-2 text-xs font-semibold text-primary underline"
                    >
                      Pencairan
                    </Link>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const daftar = (
    <>
      <h2 className="mb-2 text-sm font-semibold sm:hidden">
        Daftar Transaksi / Order{' '}
      </h2>
      {kartu}
      {tabel}
    </>
  )

  const barisTambah = bisaTambah ? (
    <div className="mb-4">{linkTambah(kelasTambahMobile)}</div>
  ) : null

  return (
    <>
      <Navigasi aktif={kodeGame} />

      <div className="mb-4 flex min-h-11 flex-wrap items-center justify-between gap-3 max-sm:-mt-15 max-sm:pl-12">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Order
          </p>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold leading-tight sm:text-2xl">
            <span>{punyaNama ? game.nama : kodeGame}</span>
            {punyaNama && (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-semibold text-primary">
                {kodeGame}
              </span>
            )}
          </h1>
        </div>
      </div>

      {galat && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{galat}</p>
      )}
      {ok && (
        <p className="mb-4 text-sm text-green-600 dark:text-green-400">{ok}</p>
      )}
      {!game.aktif && (
        <p className="mb-4 rounded-md border border-yellow-500 bg-yellow-500/10 p-3 text-sm">
          Game ini diarsipkan. Order lama tetap terbaca, tetapi tidak bisa
          menambah order baru.
        </p>
      )}
      {pengguna && (
        <div className="mb-4">
          <form method="get" className="flex items-center gap-2">
            <input
              name="cari"
              defaultValue={kataCari ?? ''}
              placeholder="Cari nomor customer, joki, dll..."
              className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2 text-sm"
            />
            <button className="shrink-0 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted">
              Cari
            </button>
          </form>
          {kataCari && (
            <Link
              href={`/game/${kodeGame}`}
              className="mt-2 inline-block text-sm text-primary underline"
            >
              Hapus pencarian
            </Link>
          )}
        </div>
      )}

      {pengguna && kataCari && (
        <Suspense fallback={<p className="mb-6 text-sm">Mencari...</p>}>
          <HasilCari kata={kataCari} />
        </Suspense>
      )}

      <Suspense fallback={<p className="mb-6 text-sm">Memuat prioritas...</p>}>
        <PanelPrioritas kodeGame={kodeGame} />
      </Suspense>

      {error ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat data: {error.message}
        </p>
      ) : baris.length === 0 ? (
        <>
          {barisTambah}
          <p>Belum ada order untuk game ini.</p>
        </>
      ) : adalahAdmin ? (
        <PembungkusHapus
          key={`${baris.length}-${ok ?? ''}`}
          aksi={hapusOrder}
          kodeGame={kodeGame}
          kiri={bisaTambah ? linkTambah(kelasTambahMobile) : null}
        >
          {daftar}
        </PembungkusHapus>
      ) : (
        <>
          {barisTambah}
          {daftar}
        </>
      )}
    </>
  )
}

export default function HalamanGame({
  params,
  searchParams,
}: {
  params: Promise<{ kode: string }>
  searchParams: Promise<{ galat?: string; ok?: string; cari?: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
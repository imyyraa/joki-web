import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import Navigasi from '@/komponen/navigasi'
import StatusLogin from '@/komponen/status-login'
import PanelPrioritas from '@/komponen/panel-prioritas'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
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
    order_id: number; 
    no_customer: string | null 
}

function Lencana({ teks, warna }: { teks: string; warna: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${warna}`}>
      {teks}
    </span>
  )
}

function LinkBukti({ path, label }: { path?: string | null; label: string }) {
  if (!path) {
    return <span className="mr-2 text-xs opacity-40">{label}: -</span>
  }
  return (
    <a
      href={`/bukti?p=${encodeURIComponent(path)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mr-2 text-xs underline"
    >
      {label}
    </a>
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

  if (pengguna && baris.length > 0) {
    const { data: dataBukti } = await supabase.rpc('bukti_order', {
      p_order_ids: baris.map((b) => b.id),
    })
    for (const r of (dataBukti ?? []) as BarisBukti[]) {
      bukti.set(r.order_id, r)
    }
  }

  return (
    <>
      <Navigasi aktif={kodeGame} />

      <div className="mb-4 flex justify-end">
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Order{' '}
          {game.nama && game.nama !== kodeGame
            ? `${game.nama} (${kodeGame})`
            : kodeGame}
        </h1>
        {bolehKelola && game.aktif && (
          <Link
            href={`/game/${kodeGame}/tambah`}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            + Tambah order
          </Link>
        )}
      </div>

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}
      {!game.aktif && (
        <p className="mb-4 rounded border border-yellow-500 p-3 text-sm">
          Game ini diarsipkan. Order lama tetap terbaca, tetapi tidak bisa
          menambah order baru.
        </p>
      )}
            {pengguna && (
        <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
          <input
            name="cari"
            defaultValue={kataCari ?? ''}
            placeholder="Cari nomor customer, kode order, joki, atau worker (semua game)"
            className="min-w-64 flex-1 rounded border px-3 py-2 text-sm"
          />
          <button className="rounded border px-4 py-2 text-sm">Cari</button>
          {kataCari && (
            <Link href={`/game/${kodeGame}`} className="text-sm underline">
              Hapus pencarian
            </Link>
          )}
        </form>
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
        <p className="text-red-600">Gagal memuat data: {error.message}</p>
      ) : baris.length === 0 ? (
        <p>Belum ada order untuk game ini.</p>
      ) : (
        <form action={hapusOrder}>
          <input type="hidden" name="kode_game" value={kodeGame} />

          {adalahAdmin && (
            <div className="mb-2">
              <TombolKonfirmasi
                pesan="Hapus order yang dicentang? Order dipindahkan ke tempat sampah dan masih bisa dipulihkan oleh admin."
                className="rounded border border-red-600 px-3 py-1.5 text-sm text-red-600"
              >
                Hapus yang dicentang
              </TombolKonfirmasi>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-300 border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  {adalahAdmin && <th className="py-2 pr-3"></th>}
                  <th className="py-2 pr-3">Kode</th>
                  <th className="py-2 pr-3">Joki</th>
                  {pengguna && <th className="py-2 pr-3">Nomor customer</th>}
                  <th className="py-2 pr-3">Worker</th>
                  <th className="py-2 pr-3 text-right">Harga</th>
                  <th className="py-2 pr-3 text-right">Charge</th>
                  <th className="py-2 pr-3 text-right">Refund</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Tanggal</th>
                  <th className="py-2 pr-3">Progress</th>
                  <th className="py-2 pr-3">Kas</th>
                  <th className="py-2 pr-3 text-right">Dicairkan</th>
                  <th className="py-2 pr-3 text-right">Dana di kas</th>
                  <th className="py-2 pr-3">Catatan</th>
                  {pengguna && <th className="py-2">Bukti / aksi</th>}
                </tr>
              </thead>
              <tbody>
                {baris.map((b) => (
                  <tr key={b.id} className="border-b align-top">
                    {adalahAdmin && (
                      <td className="py-2 pr-3">
                        <input type="checkbox" name="order_id" value={b.id} />
                      </td>
                    )}
                    <td className="py-2 pr-3 whitespace-nowrap">{b.kode}</td>
                    <td className="py-2 pr-3">{b.nama_joki}</td>
                    {pengguna && (
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {nomor.get(b.id) ?? '-'}
                      </td>
                    )}
                    <td className="py-2 pr-3 font-medium">{b.worker}</td>
                    <td className="py-2 pr-3 text-right">{rupiah(b.harga)}</td>
                    <td className="py-2 pr-3 text-right">
                      {b.charge ? rupiah(b.charge) : '-'}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {b.refund ? rupiah(b.refund) : '-'}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {rupiah(b.total_harga)}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {tanggalIndo(b.tanggal)}
                    </td>
                    <td className="py-2 pr-3">
                      {b.progress === 'selesai' ? (
                        <Lencana teks="Selesai" warna="bg-green-500/20" />
                      ) : (
                        <Lencana teks="Progress" warna="bg-yellow-500/20" />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {b.kas === 'dibayarkan' ? (
                        <Lencana teks="Dibayarkan" warna="bg-green-500/20" />
                      ) : (
                        <Lencana teks="Disimpan" warna="bg-blue-500/20" />
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {b.total_dicairkan ? rupiah(b.total_dicairkan) : '-'}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right ${
                        b.dana_di_kas < 0 ? 'font-semibold text-red-600' : ''
                      }`}
                    >
                      {rupiah(b.dana_di_kas)}
                      {b.dana_di_kas < 0 && (
                        <div className="text-xs">kelebihan cair</div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {b.catatan}
                      {b.alasan_memilih && (
                        <div className="text-xs opacity-70">
                          Alasan memilih: {b.alasan_memilih}
                        </div>
                      )}
                    </td>
                    {pengguna && (
                      <td className="py-2 whitespace-nowrap">
                        <LinkBukti
                          path={bukti.get(b.id)?.bukti_bayar}
                          label="Bayar"
                        />
                        <LinkBukti
                          path={bukti.get(b.id)?.bukti_selesai}
                          label="Selesai"
                        />
                        {bolehKelola &&
                          (b.kas === 'dibayarkan' && !adalahAdmin ? (
                            <span className="text-xs opacity-60">Terkunci</span>
                          ) : (
                            <Link
                              href={`/game/${kodeGame}/ubah/${b.id}`}
                              className="text-xs font-semibold underline"
                            >
                              Ubah
                            </Link>
                          ))}
                        {adalahAdmin && (
                          <Link
                            href={`/game/${kodeGame}/pencairan/${b.id}`}
                            className="ml-2 text-xs font-semibold underline"
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
        </form>
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
    <main className="mx-auto max-w-7xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
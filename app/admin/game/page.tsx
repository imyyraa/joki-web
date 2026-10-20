import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import {
  tambahGameBaru,
  ubahGame,
  arsipkanGame,
  aktifkanGame,
  hapusGame,
} from './actions'

type Game = {
  id: number
  kode: string
  nama: string
  awalan_kode: string
  aktif: boolean
}
type Hitung = { order: number; worker: number; cs: number }

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  await wajibPeran(['admin'])
  const { galat, ok } = await searchParams

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('games')
    .select('id, kode, nama, awalan_kode, aktif')
    .order('aktif', { ascending: false })
    .order('kode')
  const games = (data ?? []) as Game[]

  const admin = createAdminClient()
  const { data: dataUrutan } = await admin
    .from('game_urutan')
    .select('game_id, terakhir')
  const urutan = new Map<number, number>()
  for (const r of (dataUrutan ?? []) as { game_id: number; terakhir: number }[]) {
    urutan.set(r.game_id, r.terakhir)
  }

  const hitung = new Map<number, Hitung>()
  await Promise.all(
    games.map(async (g) => {
      const [o, w, c] = await Promise.all([
        admin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', g.id),
        admin
          .from('worker_games')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', g.id)
          .is('selesai', null),
        admin
          .from('cs_games')
          .select('user_id', { count: 'exact', head: true })
          .eq('game_id', g.id),
      ])
      hitung.set(g.id, {
        order: o.count ?? 0,
        worker: w.count ?? 0,
        cs: c.count ?? 0,
      })
    })
  )

  const kodeBerikut = (g: Game) =>
    `#${g.awalan_kode}${String((urutan.get(g.id) ?? 0) + 1).padStart(3, '0')}`
  const kelas = 'mt-1 w-full rounded border px-3 py-2'

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Kelola Game</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="game" />

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}
      {ok && <p className="mb-4 text-sm text-green-600">{ok}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Tambah game</h2>
        <form action={tambahGameBaru} className="grid max-w-xl gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="kode" className="block text-sm font-medium">
              Kode game
            </label>
            <input
              id="kode"
              name="kode"
              required
              placeholder="contoh: GI"
              className={kelas}
            />
          </div>
          <div>
            <label htmlFor="nama" className="block text-sm font-medium">
              Nama lengkap
            </label>
            <input
              id="nama"
              name="nama"
              required
              placeholder="contoh: Genshin Impact"
              className={kelas}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded bg-black px-4 py-2 text-sm text-white">
              Tambah game
            </button>
            <p className="mt-2 text-xs opacity-70">
              Kode game menjadi awalan kode order (contoh: GI menghasilkan
              #GI001) dan dipakai di alamat halaman. Keduanya tidak bisa diubah
              setelah dibuat.
            </p>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Daftar game</h2>
        {error ? (
          <p className="text-red-600">Gagal memuat data: {error.message}</p>
        ) : (
          <ul className="space-y-3">
            {games.map((g) => {
              const h = hitung.get(g.id) ?? { order: 0, worker: 0, cs: 0 }
              return (
                <li
                  key={g.id}
                  className={`rounded border p-3 ${g.aktif ? '' : 'opacity-60'}`}
                >
                  <form action={ubahGame} className="grid gap-3 sm:grid-cols-4">
                    <input type="hidden" name="id" value={g.id} />
                    <div>
                      <span className="block text-sm font-medium">Kode</span>
                      <p className="mt-2 font-semibold">
                        {g.kode}
                        {!g.aktif && (
                          <span className="ml-2 text-xs font-normal">
                            (diarsipkan)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <label
                        htmlFor={`nama-${g.id}`}
                        className="block text-sm font-medium"
                      >
                        Nama lengkap
                      </label>
                      <input
                        id={`nama-${g.id}`}
                        name="nama"
                        required
                        defaultValue={g.nama}
                        className={kelas}
                      />
                    </div>
                    <div className="flex flex-col justify-end gap-1">
                      <p className="text-xs opacity-70">
                        Kode order berikutnya: {kodeBerikut(g)}
                      </p>
                      <button className="rounded border px-3 py-2 text-sm">
                        Simpan
                      </button>
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
                    <span className="text-xs opacity-70">
                      {h.order} order · {h.worker} worker aktif · {h.cs} CS
                    </span>

                    {g.aktif ? (
                      <form action={arsipkanGame}>
                        <input type="hidden" name="id" value={g.id} />
                        <TombolKonfirmasi
                          pesan={`Arsipkan ${g.kode}? ${h.worker} worker aktif akan dikeluarkan dari game ini (riwayat tetap), dan game hilang dari tab serta formulir. ${h.order} order lama tetap tersimpan dan total penghasilan tidak berubah.`}
                          className="rounded border px-3 py-1.5 text-sm"
                        >
                          Arsipkan
                        </TombolKonfirmasi>
                      </form>
                    ) : (
                      <form action={aktifkanGame}>
                        <input type="hidden" name="id" value={g.id} />
                        <TombolKonfirmasi
                          pesan={`Aktifkan kembali ${g.kode}?`}
                          className="rounded border px-3 py-1.5 text-sm"
                        >
                          Aktifkan kembali
                        </TombolKonfirmasi>
                      </form>
                    )}

                    {h.order === 0 && (
                      <form action={hapusGame}>
                        <input type="hidden" name="id" value={g.id} />
                        <TombolKonfirmasi
                          pesan={`Hapus ${g.kode} secara permanen? Game ini belum punya order. Tindakan ini tidak bisa dibatalkan.`}
                          className="rounded border border-red-600 px-3 py-1.5 text-sm text-red-600"
                        >
                          Hapus permanen
                        </TombolKonfirmasi>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}

export default function HalamanGameAdmin({
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
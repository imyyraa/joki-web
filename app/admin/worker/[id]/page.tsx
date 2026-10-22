import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wajibPeran } from '@/lib/auth'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'
import { tanggalIndo } from '@/lib/format'
import {
  ubahWorker,
  setAktif,
  tambahGame,
  ubahStatusGame,
  keluarkanGame,
} from '../actions'

type Penugasan = {
  id: number
  status: string
  mulai: string
  selesai: string | null
  games: { kode: string }
}

async function Isi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  await wajibPeran(['admin'])
  const { id } = await params
  const { galat, ok } = await searchParams
  const workerId = Number(id)
  if (!Number.isInteger(workerId) || workerId <= 0) notFound()

  const supabase = await createClient()

  const { data: w } = await supabase
    .from('workers')
    .select('id, nama, rekening, catatan, aktif, potongan_persen')
    .eq('id', workerId)
    .maybeSingle()
  if (!w) notFound()

  const { data: dataTugas } = await supabase
    .from('worker_games')
    .select('id, status, mulai, selesai, games(kode)')
    .eq('worker_id', workerId)
    .order('mulai', { ascending: false })

  const { data: dataGame } = await supabase
    .from('games')
    .select('id, kode')
    .eq('aktif', true)
    .order('kode')

  const semua = (dataTugas ?? []) as unknown as Penugasan[]
  const aktif = semua.filter((t) => t.selesai === null)
  const riwayat = semua.filter((t) => t.selesai !== null)
  const kodeAktif = new Set(aktif.map((t) => t.games.kode))
  const gameTersedia = ((dataGame ?? []) as { id: number; kode: string }[]).filter(
    (g) => !kodeAktif.has(g.kode)
  )

  const kelas = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'
  const kelasPilih = 'mt-1 rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">
          {w.nama}
          {!w.aktif && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              (nonaktif)
            </span>
          )}
        </h1>
        <Link
          href="/admin/worker"
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </div>

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

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Data worker</h2>
        <form
          action={ubahWorker}
          className="w-full space-y-3 rounded-md border p-4 sm:p-6"
        >
          <input type="hidden" name="id" value={w.id} />
          <div>
            <label htmlFor="nama" className="block text-sm font-medium">
              Nama
            </label>
            <input
              id="nama"
              name="nama"
              required
              defaultValue={w.nama}
              className={kelas}
            />
          </div>
          <div>
            <label htmlFor="rekening" className="block text-sm font-medium">
              Rekening pencairan
            </label>
            <input
              id="rekening"
              name="rekening"
              defaultValue={w.rekening ?? ''}
              className={kelas}
            />
          </div>
          <div>
            <label
              htmlFor="potongan_persen"
              className="block text-sm font-medium"
            >
              Potongan toko (%)
            </label>
            <input
              id="potongan_persen"
              name="potongan_persen"
              inputMode="decimal"
              defaultValue={String(w.potongan_persen)}
              className={kelas}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Isi 0 untuk CS atau pekerja yang tidak dipotong. Berlaku untuk
              order berikutnya, order lama tidak berubah.
            </p>
          </div>
          <div>
            <label htmlFor="catatan" className="block text-sm font-medium">
              Catatan
            </label>
            <textarea
              id="catatan"
              name="catatan"
              rows={3}
              defaultValue={w.catatan ?? ''}
              className={kelas}
            />
          </div>
          <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto">
            Simpan data
          </button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Status</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Worker nonaktif hilang dari Rekap dan daftar prioritas, tetapi seluruh
          riwayat ordernya tetap tersimpan.
        </p>
        <form action={setAktif}>
          <input type="hidden" name="id" value={w.id} />
          <input type="hidden" name="aktif" value={w.aktif ? 'false' : 'true'} />
          <TombolKonfirmasi
            pesan={
              w.aktif
                ? 'Nonaktifkan worker ini?'
                : 'Aktifkan kembali worker ini?'
            }
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {w.aktif ? 'Nonaktifkan worker' : 'Aktifkan worker'}
          </TombolKonfirmasi>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Game yang dipegang</h2>
        {aktif.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum memegang game apa pun.
          </p>
        ) : (
          <ul className="space-y-2">
            {aktif.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm"
              >
                <span className="w-16 font-semibold">{t.games.kode}</span>
                <form action={ubahStatusGame} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="worker_id" value={w.id} />
                  <select
                    name="status"
                    defaultValue={t.status}
                    className="rounded-md border bg-background px-2 py-1.5"
                  >
                    <option value="normal">Normal</option>
                    <option value="cadangan">Cadangan</option>
                  </select>
                  <button className="rounded-md border px-3 py-1.5 font-medium hover:bg-muted">
                    Simpan
                  </button>
                </form>
                <form action={keluarkanGame}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="worker_id" value={w.id} />
                  <TombolKonfirmasi
                    pesan={`Keluarkan worker dari ${t.games.kode}? Riwayat tetap tersimpan.`}
                    className="text-red-600 underline dark:text-red-400"
                  >
                    Keluarkan dari game
                  </TombolKonfirmasi>
                </form>
                <span className="text-xs text-muted-foreground">
                  sejak {tanggalIndo(t.mulai)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Tambah ke game</h2>
        {gameTersedia.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sudah memegang semua game.
          </p>
        ) : (
          <form action={tambahGame} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="worker_id" value={w.id} />
            <div>
              <label htmlFor="game_id" className="block text-sm font-medium">
                Game
              </label>
              <select
                id="game_id"
                name="game_id"
                required
                defaultValue=""
                className={kelasPilih}
              >
                <option value="" disabled>
                  Pilih game
                </option>
                {gameTersedia.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.kode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="normal"
                className={kelasPilih}
              >
                <option value="normal">Normal</option>
                <option value="cadangan">Cadangan</option>
              </select>
            </div>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Tambahkan
            </button>
          </form>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Riwayat game</h2>
        {riwayat.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat pindah game.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {riwayat.map((t) => (
              <li key={t.id}>
                <strong>{t.games.kode}</strong> ({t.status}):{' '}
                {tanggalIndo(t.mulai)} sampai {tanggalIndo(t.selesai as string)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default function HalamanKelolaWorker({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ galat?: string; ok?: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
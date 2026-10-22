import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'
import { rupiah } from '@/lib/format'
import {
  ringkasDiff,
  ringkasBaru,
  waktuIndo,
  type Diff,
  type Penerjemah,
} from '@/lib/log'

const PER_HALAMAN = 30

type Param = { jenis?: string; pelaku?: string; hal?: string }

type BarisOrder = {
  id: number
  aksi: string
  oleh: string | null
  waktu: string
  perubahan: Record<string, unknown> | null
  orders: { kode: string; games: { kode: string } } | null
}

type BarisKelola = {
  id: number
  tabel: string
  baris_id: number | null
  aksi: string
  oleh: string | null
  waktu: string
  perubahan: Record<string, unknown> | null
}

const LABEL_ORDER: Record<string, string> = {
  tambah: 'Tambah order',
  ubah: 'Ubah order',
  ubah_privat: 'Ubah data pribadi',
  pencairan: 'Pencairan',
  pengembalian: 'Pengembalian',
  batal_bayar: 'Batal Dibayarkan',
}

const LABEL_KELOLA: Record<string, string> = {
  tambah: 'Tambah',
  ubah: 'Ubah',
  atur_game: 'Atur game CS',
  reset_password: 'Reset password',
  nonaktifkan: 'Nonaktifkan',
  aktifkan: 'Aktifkan',
}

async function Isi({ searchParams }: { searchParams: Promise<Param> }) {
  await wajibPeran(['admin'])
  const { jenis: j, pelaku: p, hal: h } = await searchParams

  const jenis = j === 'kelola' ? 'kelola' : 'order'
  const pelaku = p && /^[0-9a-f-]{36}$/i.test(p) ? p : ''
  const hal = Math.max(1, Number(h) || 1)
  const dari = (hal - 1) * PER_HALAMAN
  const sampai = dari + PER_HALAMAN - 1

  const admin = createAdminClient()

  const { data: dataProfil } = await admin
    .from('profiles')
    .select('id, nama')
    .order('nama')
  const profil = (dataProfil ?? []) as { id: string; nama: string }[]
  const namaPelaku = new Map(profil.map((x) => [x.id, x.nama]))

  const { data: dataWorker } = await admin.from('workers').select('id, nama')
  const { data: dataGame } = await admin.from('games').select('id, kode')
  const { data: dataWg } = await admin
    .from('worker_games')
    .select('id, worker_id, game_id')

  const namaWorker = new Map(
    ((dataWorker ?? []) as { id: number; nama: string }[]).map((x) => [x.id, x.nama])
  )
  const kodeGame = new Map(
    ((dataGame ?? []) as { id: number; kode: string }[]).map((x) => [x.id, x.kode])
  )
  const penugasan = new Map(
    ((dataWg ?? []) as { id: number; worker_id: number; game_id: number }[]).map(
      (x) => [x.id, x]
    )
  )

  const terjemah: Penerjemah = (kunci, v) => {
    if (kunci === 'worker_id' && v != null) {
      return namaWorker.get(Number(v)) ?? `#${v}`
    }
    if (kunci === 'game_id' && v != null) {
      return kodeGame.get(Number(v)) ?? `#${v}`
    }
    return undefined
  }

  const pelakuNama = (id: string | null) =>
    id ? (namaPelaku.get(id) ?? 'Akun terhapus') : 'Sistem / SQL Editor'

  let barisOrder: BarisOrder[] = []
  let barisKelola: BarisKelola[] = []
  let total = 0
  let pesanError: string | null = null

  if (jenis === 'order') {
    const dasar = admin
      .from('order_log')
      .select('id, aksi, oleh, waktu, perubahan, orders(kode, games(kode))', {
        count: 'exact',
      })
      .order('id', { ascending: false })
      .range(dari, sampai)
    const { data, error, count } = pelaku
      ? await dasar.eq('oleh', pelaku)
      : await dasar
    pesanError = error?.message ?? null
    barisOrder = (data ?? []) as unknown as BarisOrder[]
    total = count ?? 0
  } else {
    const dasar = admin
      .from('log_pengelolaan')
      .select('id, tabel, baris_id, aksi, oleh, waktu, perubahan', {
        count: 'exact',
      })
      .order('id', { ascending: false })
      .range(dari, sampai)
    const { data, error, count } = pelaku
      ? await dasar.eq('oleh', pelaku)
      : await dasar
    pesanError = error?.message ?? null
    barisKelola = (data ?? []) as unknown as BarisKelola[]
    total = count ?? 0
  }

  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN))

  const tautan = (ubah: Partial<Param>) => {
    const q = new URLSearchParams()
    const nilai = { jenis, pelaku, hal: String(hal), ...ubah }
    if (nilai.jenis && nilai.jenis !== 'order') q.set('jenis', nilai.jenis)
    if (nilai.pelaku) q.set('pelaku', nilai.pelaku)
    if (nilai.hal && nilai.hal !== '1') q.set('hal', nilai.hal)
    const s = q.toString()
    return s ? `/admin/log?${s}` : '/admin/log'
  }

  function keteranganOrder(r: BarisOrder): string[] {
    const d = r.perubahan ?? {}
    switch (r.aksi) {
      case 'tambah': {
        const baris = [
          `Order dibuat: ${String(d.nama_joki ?? '-')}, harga ${rupiah(Number(d.harga ?? 0))}`,
        ]
        if (d.peringkat_saat_dipilih != null) {
          baris.push(`Dipilih pada peringkat ${String(d.peringkat_saat_dipilih)}`)
        }
        return baris
      }
      case 'ubah':
        return ringkasDiff(d as Diff, terjemah)
      case 'ubah_privat':
        return [
          `Data pribadi diubah (kolom: ${((d.kolom as string[] | undefined) ?? []).join(', ')})`,
        ]
      case 'pencairan':
        return [
          `Pencairan ${rupiah(Number(d.jumlah ?? 0))}${d.pelunasan ? ' (pelunasan saat Dibayarkan)' : ''}`,
        ]
      case 'pengembalian':
        return [`Pengembalian dari worker ${rupiah(Number(d.jumlah ?? 0))}`]
      case 'batal_bayar':
        return ['Status Dibayarkan dibatalkan']
      default:
        return []
    }
  }

  function objekKelola(r: BarisKelola): string {
    const d = r.perubahan ?? {}
    switch (r.tabel) {
      case 'workers':
        return `Worker: ${namaWorker.get(Number(r.baris_id)) ?? `#${r.baris_id}`}`
      case 'games':
        return `Game: ${kodeGame.get(Number(r.baris_id)) ?? `#${r.baris_id}`}`
      case 'worker_games': {
        const wg = penugasan.get(Number(r.baris_id))
        const w = wg ? wg.worker_id : Number(d.worker_id)
        const g = wg ? wg.game_id : Number(d.game_id)
        return `Penugasan: ${namaWorker.get(w) ?? `#${w}`} di ${kodeGame.get(g) ?? `#${g}`}`
      }
      case 'akun': {
        const uid = String(d.user_id ?? '')
        return `Akun: ${namaPelaku.get(uid) ?? String(d.nama ?? '-')}`
      }
      default:
        return r.tabel
    }
  }

  function keteranganKelola(r: BarisKelola): string[] {
    const d = r.perubahan ?? {}
    if (r.tabel === 'akun') {
      if (r.aksi === 'tambah' || r.aksi === 'ubah') {
        return ringkasBaru(d, ['nama', 'peran'])
      }
      if (r.aksi === 'atur_game') {
        const nama = (ids: unknown) =>
          ((ids as number[] | undefined) ?? [])
            .map((i) => kodeGame.get(Number(i)) ?? `#${i}`)
            .join(', ') || '-'
        return [`Ditambah: ${nama(d.ditambah)} · Dihapus: ${nama(d.dihapus)}`]
      }
      return []
    }
    if (r.aksi === 'tambah') {
      const kunci: Record<string, string[]> = {
        workers: ['nama', 'potongan_persen'],
        games: ['kode', 'nama'],
        worker_games: ['status'],
      }
      return ringkasBaru(d, kunci[r.tabel] ?? [], terjemah)
    }
    return ringkasDiff(d as Diff, terjemah)
  }

  const kelas = 'rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Log perubahan</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="log" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href={tautan({ jenis: 'order', hal: '1' })}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            jenis === 'order'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-muted'
          }`}
        >
          Order
        </Link>
        <Link
          href={tautan({ jenis: 'kelola', hal: '1' })}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            jenis === 'kelola'
              ? 'bg-primary text-primary-foreground'
              : 'border hover:bg-muted'
          }`}
        >
          Pengelolaan
        </Link>

        <form method="get" className="flex items-center gap-2 sm:ml-auto">
          {jenis !== 'order' && <input type="hidden" name="jenis" value={jenis} />}
          <select name="pelaku" defaultValue={pelaku} className={kelas}>
            <option value="">Semua pelaku</option>
            {profil.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nama}
              </option>
            ))}
          </select>
          <button className={`${kelas} font-medium hover:bg-muted`}>
            Terapkan
          </button>
        </form>
      </div>

      {pesanError ? (
        <p className="text-red-600 dark:text-red-400">
          Gagal memuat log: {pesanError}
        </p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada catatan.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {total} catatan. Halaman {hal} dari {jumlahHalaman}.
          </p>
          <p className="mb-2 text-xs text-muted-foreground sm:hidden">
            Geser tabel ke kiri-kanan untuk melihat semua kolom.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-200 border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Waktu</th>
                  <th className="px-3 py-2 font-medium">Pelaku</th>
                  <th className="px-3 py-2 font-medium">
                    {jenis === 'order' ? 'Order' : 'Objek'}
                  </th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                  <th className="px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {jenis === 'order'
                  ? barisOrder.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b align-top last:border-b-0 hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          {waktuIndo(r.waktu)}
                        </td>
                        <td className="px-3 py-2">{pelakuNama(r.oleh)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {r.orders ? (
                            <Link
                              href={`/game/${r.orders.games.kode}`}
                              className="text-primary underline"
                            >
                              {r.orders.kode}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {LABEL_ORDER[r.aksi] ?? r.aksi}
                        </td>
                        <td className="px-3 py-2">
                          {keteranganOrder(r).map((t, i) => (
                            <div key={i}>{t}</div>
                          ))}
                        </td>
                      </tr>
                    ))
                  : barisKelola.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b align-top last:border-b-0 hover:bg-muted/50"
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          {waktuIndo(r.waktu)}
                        </td>
                        <td className="px-3 py-2">{pelakuNama(r.oleh)}</td>
                        <td className="px-3 py-2">{objekKelola(r)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {LABEL_KELOLA[r.aksi] ?? r.aksi}
                        </td>
                        <td className="px-3 py-2">
                          {keteranganKelola(r).map((t, i) => (
                            <div key={i}>{t}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            {hal > 1 && (
              <Link
                href={tautan({ hal: String(hal - 1) })}
                className="text-primary underline"
              >
                ← Lebih baru
              </Link>
            )}
            {hal < jumlahHalaman && (
              <Link
                href={tautan({ hal: String(hal + 1) })}
                className="text-primary underline"
              >
                Lebih lama →
              </Link>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default function HalamanLog({
  searchParams,
}: {
  searchParams: Promise<Param>
}) {
  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
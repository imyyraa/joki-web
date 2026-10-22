import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import StatusLogin from '@/komponen/status-login'
import NavAdmin from '@/komponen/nav-admin'
import { ambilNotifikasi, type Notifikasi } from '@/lib/notifikasi'
import { rupiah } from '@/lib/format'
import { ringkasDiff, waktuIndo, type Diff } from '@/lib/log'
import { bacaNotifikasi } from './actions'

const JENIS = [
  { kunci: 'masuk', label: 'Order masuk', judul: 'Order baru' },
  { kunci: 'selesai', label: 'Order selesai', judul: 'Order selesai' },
  { kunci: 'perubahan', label: 'Perubahan order', judul: 'Order diubah' },
] as const

const KUNCI_UBAH = ['harga', 'nama_joki', 'charge']

function rincian(n: Notifikasi): string[] {
  const d = n.perubahan ?? {}
  if (n.jenis === 'masuk') {
    return [
      `${String(d.nama_joki ?? n.nama_joki)}, harga ${rupiah(Number(d.harga ?? 0))}`,
    ]
  }
  if (n.jenis === 'perubahan') {
    const diff = d as unknown as Diff
    const sebagian: Diff = {}
    for (const k of KUNCI_UBAH) {
      if (diff[k]) sebagian[k] = diff[k]
    }
    return ringkasDiff(sebagian)
  }
  return ['Ditandai selesai']
}

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; galat?: string }>
}) {
  await wajibPeran(['admin'])
  const { jenis: j, galat } = await searchParams
  const jenis = JENIS.some((x) => x.kunci === j) ? (j as string) : 'masuk'

  const { daftar: semua, galat: galatMuat } = await ambilNotifikasi(200)
  const belum = (k: string) =>
    semua.filter((n) => n.jenis === k && !n.sudah_dibaca).length
  const daftar = semua.filter((n) => n.jenis === jenis)
  const judul = JENIS.find((x) => x.kunci === jenis)?.judul ?? ''

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-primary underline">
            ← Rekap
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Notifikasi</h1>
        </div>
        <Suspense fallback={null}>
          <StatusLogin />
        </Suspense>
      </div>

      <NavAdmin aktif="notifikasi" />

      {(galat || galatMuat) && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat ?? galatMuat}
        </p>
      )}

      <div className="tanpa-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
        {JENIS.map((x) => {
          const b = belum(x.kunci)
          return (
            <Link
              key={x.kunci}
              href={`/admin/notifikasi?jenis=${x.kunci}`}
              aria-current={jenis === x.kunci ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                jenis === x.kunci
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-muted/40 hover:bg-muted'
              }`}
            >
              {x.label}
              {b > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
                  {b}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {judul} dari CS dalam 30 hari terakhir. Tekan satu notifikasi untuk
        menandainya terbaca dan membuka ordernya.
      </p>

      {daftar.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
      ) : (
        <ul className="space-y-2">
          {daftar.map((n) => (
            <li key={`${n.log_id}-${n.jenis}`}>
              <form action={bacaNotifikasi}>
                <input type="hidden" name="log_id" value={n.log_id} />
                <input type="hidden" name="jenis" value={n.jenis} />
                <input type="hidden" name="kode_game" value={n.kode_game} />
                <input type="hidden" name="kode_order" value={n.kode_order} />
                <button
                  type="submit"
                  className={`block w-full rounded-xl border p-3 text-left transition-opacity hover:opacity-90 ${
                    n.sudah_dibaca
                      ? 'bg-surface'
                      : 'border-primary/50 bg-primary/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-500 dark:text-blue-400">
                      {n.kode_order}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {n.kode_game}
                    </span>
                    {!n.sudah_dibaca && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Baru
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm font-medium">
                    {n.nama_joki}
                  </span>
                  {rincian(n).map((t, i) => (
                    <span
                      key={i}
                      className="block text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    oleh {n.oleh_nama} · {waktuIndo(n.waktu)}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function HalamanNotifikasi({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string; galat?: string }>
}) {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
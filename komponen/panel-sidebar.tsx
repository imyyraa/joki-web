'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function PanelSidebar({
  games,
  login,
  admin,
  nama,
  peran,
  belum,
  keluar,
}: {
  games: string[]
  login: boolean
  admin: boolean
  nama: string | null
  peran: string | null
  belum: number
  keluar: (formData: FormData) => void | Promise<void>
}) {
  const [buka, setBuka] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!buka) return
    const saatTekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBuka(false)
    }
    window.addEventListener('keydown', saatTekan)
    return () => window.removeEventListener('keydown', saatTekan)
  }, [buka])

  if (pathname === '/login') return null

  const kodeAktif = pathname.startsWith('/game/')
    ? decodeURIComponent(pathname.split('/')[2] ?? '').toUpperCase()
    : ''
  const rekapAktif = pathname === '/' || pathname.startsWith('/worker/')
  const kelolaAktif = pathname.startsWith('/admin')

  const tutup = () => setBuka(false)

  const itemUtama = (aktif: boolean) =>
    `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors ${
      aktif ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
    }`

  return (
    <>
      {/* Ruang di atas halaman agar tombol menu tidak menutupi isi */}
      <div className="h-14 shrink-0" aria-hidden="true" />

      {!buka && (
        <button
          type="button"
          aria-label="Buka menu"
          aria-expanded={false}
          onClick={() => setBuka(true)}
          className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-surface shadow-md"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      {buka && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={tutup}
            aria-hidden="true"
          />
          <aside
            aria-label="Menu utama"
            className="fixed inset-y-0 left-0 z-50 flex w-24 flex-col overflow-y-auto border-r bg-surface px-2 py-3 shadow-xl"
          >
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={tutup}
              className="mx-auto mb-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-background"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <p className="mb-2 text-center text-[10px] font-semibold tracking-wider text-muted-foreground">
              UTAMA
            </p>
            <div className="mb-4 flex flex-col gap-1">
              <Link
                href="/"
                onClick={tutup}
                aria-current={rekapAktif ? 'page' : undefined}
                className={itemUtama(rekapAktif)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 20V11M12 20V4M18 20v-6" />
                </svg>
                Rekap
              </Link>
              {admin && (
                <Link
                  href="/admin/worker"
                  onClick={tutup}
                  aria-current={kelolaAktif ? 'page' : undefined}
                  className={`${itemUtama(kelolaAktif)} relative`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
                  </svg>
                  {belum > 0 && (
                    <span className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {belum}
                    </span>
                  )}
                  Kelola
                </Link>
              )}
            </div>

            <p className="mb-2 text-center text-[10px] font-semibold leading-tight tracking-wider text-muted-foreground">
              KATEGORI GAME
            </p>
            <div className="flex flex-col gap-2">
              {games.map((kode) => (
                <Link
                  key={kode}
                  href={`/game/${kode}`}
                  onClick={tutup}
                  aria-current={kodeAktif === kode ? 'page' : undefined}
                  className={`rounded-xl px-2 py-2.5 text-center text-sm font-semibold transition-colors ${
                    kodeAktif === kode
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
                      : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  {kode}
                </Link>
              ))}
            </div>

            <div className="mt-auto border-t pt-3">
              {login ? (
                <>
                  <p className="truncate text-center text-[11px] font-medium">
                    {nama}
                  </p>
                  <p className="mb-2 text-center text-[10px] uppercase text-muted-foreground">
                    {peran}
                  </p>
                  <form action={keluar}>
                    <button className="w-full rounded-xl border px-2 py-2 text-xs font-medium hover:bg-muted">
                      Keluar
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={tutup}
                  className="block rounded-xl border px-2 py-2 text-center text-xs font-medium hover:bg-muted"
                >
                  Masuk
                </Link>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
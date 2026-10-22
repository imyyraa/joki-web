import Link from 'next/link'
import { hitungBelumDibaca } from '@/lib/notifikasi'

const menu = [
  { kunci: 'worker', href: '/admin/worker', label: 'Worker' },
  { kunci: 'game', href: '/admin/game', label: 'Game' },
  { kunci: 'akun', href: '/admin/akun', label: 'Akun' },
  { kunci: 'notifikasi', href: '/admin/notifikasi', label: 'Notifikasi' },
  { kunci: 'sampah', href: '/admin/sampah', label: 'Sampah' },
  { kunci: 'bukti', href: '/admin/bukti', label: 'Bukti' },
  { kunci: 'log', href: '/admin/log', label: 'Log' },
]

export default async function NavAdmin({ aktif }: { aktif: string }) {
  const belum = await hitungBelumDibaca()

  return (
    <nav
      aria-label="Menu admin"
      className="tanpa-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
    >
      {menu.map((m) => (
        <Link
          key={m.kunci}
          href={m.href}
          aria-current={aktif === m.kunci ? 'page' : undefined}
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            aktif === m.kunci
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border bg-muted/40 hover:bg-muted'
          }`}
        >
          {m.label}
          {m.kunci === 'notifikasi' && belum > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-semibold text-white">
              {belum}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
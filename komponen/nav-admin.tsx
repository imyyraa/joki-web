import Link from 'next/link'

const menu = [
  { kunci: 'worker', href: '/admin/worker', label: 'Worker' },
  { kunci: 'game', href: '/admin/game', label: 'Game' },
  { kunci: 'akun', href: '/admin/akun', label: 'Akun' },
  { kunci: 'sampah', href: '/admin/sampah', label: 'Sampah' },
  { kunci: 'log', href: '/admin/log', label: 'Log' },
]

export default function NavAdmin({ aktif }: { aktif: string }) {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {menu.map((m) => (
        <Link
          key={m.kunci}
          href={m.href}
          className={`rounded px-3 py-1.5 text-sm ${
            aktif === m.kunci
              ? 'bg-foreground text-background'
              : 'border hover:bg-foreground/10'
          }`}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  )
}
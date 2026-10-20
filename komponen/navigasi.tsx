import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Navigasi({ aktif }: { aktif: string }) {
  const supabase = await createClient()
  const { data } = await supabase.from('games').select('kode').eq('aktif', true).order('kode')
  const daftar = (data ?? []) as { kode: string }[]

  const tab = (href: string, label: string, kunci: string) => (
    <Link
      key={kunci}
      href={href}
      className={`rounded px-3 py-1.5 text-sm ${
        aktif === kunci
          ? 'bg-foreground text-background'
          : 'border hover:bg-foreground/10'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {tab('/', 'Rekap', 'rekap')}
      {daftar.map((g) => tab(`/game/${g.kode}`, g.kode, g.kode))}
    </nav>
  )
}
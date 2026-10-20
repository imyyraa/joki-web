import Link from 'next/link'
import { ambilPengguna } from '@/lib/auth'
import { logout } from '@/app/login/actions'

export default async function StatusLogin() {
  const pengguna = await ambilPengguna()

  if (!pengguna) {
    return (
      <Link href="/login" className="shrink-0 text-sm underline">
        Masuk (admin/CS)
      </Link>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-3 text-sm">
      <span className="opacity-70">
        {pengguna.nama} ({pengguna.peran})
      </span>
      {pengguna.peran === 'admin' && (
        <Link href="/admin/worker" className="underline">
          Kelola
        </Link>
      )}
      <form action={logout}>
        <button className="underline">Keluar</button>
      </form>
    </div>
  )
}
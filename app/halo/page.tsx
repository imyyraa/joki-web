import { Suspense } from 'react'
import { ambilPengguna } from '@/lib/auth'
import { logout } from '../login/actions'

async function Isi() {
  const pengguna = await ambilPengguna()

  if (!pengguna) {
    return (
      <div className="space-y-4">
        <p>Akun ini tidak aktif atau belum terdaftar. Hubungi admin.</p>
        <form action={logout}>
          <button className="rounded bg-black px-4 py-2 text-white">Keluar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p>
        Halo, <strong>{pengguna.nama}</strong> (peran: {pengguna.peran})
      </p>
      <form action={logout}>
        <button className="rounded bg-black px-4 py-2 text-white">Keluar</button>
      </form>
    </div>
  )
}

export default function Halo() {
  return (
    <main className="p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi />
      </Suspense>
    </main>
  )
}
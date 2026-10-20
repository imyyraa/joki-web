import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import NavAdmin from '@/komponen/nav-admin'
import { buatAkun } from '../actions'

async function Isi({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>
}) {
  await wajibPeran(['admin'])
  const { galat } = await searchParams
  const kelas = 'mt-1 w-full rounded border px-3 py-2'

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tambah akun</h1>
        <Link href="/admin/akun" className="text-sm underline">
          Kembali
        </Link>
      </div>

      <NavAdmin aktif="akun" />

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}

      <form action={buatAkun} className="max-w-md space-y-4">
        <div>
          <label htmlFor="nama" className="block text-sm font-medium">
            Nama
          </label>
          <input id="nama" name="nama" required className={kelas} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            className={kelas}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password awal (minimal 8 karakter)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={kelas}
          />
        </div>
        <div>
          <label htmlFor="peran" className="block text-sm font-medium">
            Peran
          </label>
          <select id="peran" name="peran" defaultValue="cs" className={kelas}>
            <option value="cs">CS (hanya game yang dipegang)</option>
            <option value="admin">Admin (semua game dan pengelolaan)</option>
          </select>
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">
          Buat akun
        </button>
      </form>
    </>
  )
}

export default function HalamanAkunBaru({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>
}) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
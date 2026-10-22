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
  const kelas =
    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Tambah akun</h1>
        <Link
          href="/admin/akun"
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </div>

      <NavAdmin aktif="akun" />

      {galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat}
        </p>
      )}

      <form
        action={buatAkun}
        className="w-full space-y-4 rounded-md border p-4 sm:p-6"
      >
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
        <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto">
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
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
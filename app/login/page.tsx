import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'
import { logout } from './actions'
import LoginForm from './login-form'

async function Isi() {
  const pengguna = await ambilPengguna()
  if (pengguna) redirect('/')

  // Ada sesi login, tetapi akunnya nonaktif atau belum terdaftar.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="rounded-lg border p-5 sm:p-6">
      <h1 className="mb-1 text-2xl font-bold">Masuk</h1>
      {user ? (
        <div className="mt-4 space-y-4">
          <p className="rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            Akun ini tidak aktif atau belum terdaftar. Hubungi admin.
          </p>
          <form action={logout}>
            <button className="w-full rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted">
              Keluar
            </button>
          </form>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-muted-foreground">
            Khusus admin dan CS. Worker tidak perlu masuk untuk melihat data.
          </p>
          <LoginForm />
        </>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center p-4 sm:p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi />
      </Suspense>
      <Link
        href="/"
        className="mt-4 text-center text-sm text-primary underline"
      >
        ← Kembali ke Rekap
      </Link>
    </main>
  )
}
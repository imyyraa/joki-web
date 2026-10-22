import { Suspense } from 'react'
import Link from 'next/link'
import { wajibPeran } from '@/lib/auth'
import { tambahWorker } from '../actions'

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
        <h1 className="text-xl font-bold sm:text-2xl">Tambah worker</h1>
        <Link
          href="/admin/worker"
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          Kembali
        </Link>
      </div>

      {galat && (
        <p className="mb-4 rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {galat}
        </p>
      )}

      <form
        action={tambahWorker}
        className="w-full space-y-4 rounded-md border p-4 sm:p-6"
      >
        <div>
          <label htmlFor="nama" className="block text-sm font-medium">
            Nama worker
          </label>
          <input id="nama" name="nama" required className={kelas} />
        </div>
        <div>
          <label htmlFor="rekening" className="block text-sm font-medium">
            Rekening pencairan
          </label>
          <input
            id="rekening"
            name="rekening"
            placeholder="contoh: BCA 1234567890 a.n. Nama"
            className={kelas}
          />
        </div>
        <div>
          <label
            htmlFor="potongan_persen"
            className="block text-sm font-medium"
          >
            Potongan toko (%)
          </label>
          <input
            id="potongan_persen"
            name="potongan_persen"
            inputMode="decimal"
            defaultValue="10"
            className={kelas}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Isi 0 untuk CS atau pekerja yang tidak dipotong.
          </p>
        </div>
        <div>
          <label htmlFor="catatan" className="block text-sm font-medium">
            Catatan
          </label>
          <textarea id="catatan" name="catatan" rows={3} className={kelas} />
        </div>
        <button className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto">
          Simpan
        </button>
      </form>
    </>
  )
}

export default function HalamanBaru({
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
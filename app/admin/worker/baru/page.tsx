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
  const kelas = 'mt-1 w-full rounded border px-3 py-2'

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tambah worker</h1>
        <Link href="/admin/worker" className="text-sm underline">
          Kembali
        </Link>
      </div>

      {galat && <p className="mb-4 text-sm text-red-600">{galat}</p>}

      <form action={tambahWorker} className="max-w-md space-y-4">
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
          <label htmlFor="potongan_persen" className="block text-sm font-medium">
            Potongan toko (%)
          </label>
          <input
            id="potongan_persen"
            name="potongan_persen"
            inputMode="decimal"
            defaultValue="10"
            className={kelas}
          />
          <p className="mt-1 text-xs opacity-70">
            Isi 0 untuk CS atau pekerja yang tidak dipotong.
          </p>
        </div>
        <div>
          <label htmlFor="catatan" className="block text-sm font-medium">
            Catatan
          </label>
          <textarea id="catatan" name="catatan" rows={3} className={kelas} />
        </div>
        <button className="rounded bg-black px-4 py-2 text-white">Simpan</button>
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
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<p>Memuat...</p>}>
        <Isi searchParams={searchParams} />
      </Suspense>
    </main>
  )
}
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

async function DaftarGame() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('games')
    .select('kode, nama')
    .order('kode')

  if (error) {
    return <pre className="text-red-600">Gagal: {error.message}</pre>
  }

  return (
    <ul className="list-disc pl-6">
      {data.map((g) => (
        <li key={g.kode}>{g.kode}</li>
      ))}
    </ul>
  )
}

export default function TesKoneksi() {
  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-bold">Uji koneksi Supabase</h1>
      <Suspense fallback={<p>Memuat...</p>}>
        <DaftarGame />
      </Suspense>
    </main>
  )
}
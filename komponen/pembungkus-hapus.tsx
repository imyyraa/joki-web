'use client'

import { useRef, useState, type ReactNode } from 'react'
import TombolKonfirmasi from '@/komponen/tombol-konfirmasi'

const tombolMerah =
  'rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'

export default function PembungkusHapus({
  aksi,
  kodeGame,
  kiri,
  children,
}: {
  aksi: (formData: FormData) => void | Promise<void>
  kodeGame: string
  kiri?: ReactNode
  children: ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [mode, setMode] = useState(false)
  const [jumlah, setJumlah] = useState(0)

  function hitung() {
    const n =
      formRef.current?.querySelectorAll('input[name="order_id"]:checked')
        .length ?? 0
    setJumlah(n)
  }

  function batal() {
    formRef.current?.reset()
    setMode(false)
    setJumlah(0)
  }

  return (
    <form
      ref={formRef}
      action={aksi}
      data-hapus={mode ? 'true' : 'false'}
      onChange={hitung}
    >
      <input type="hidden" name="kode_game" value={kodeGame} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {!mode && kiri ? <div>{kiri}</div> : null}

        <div className="ml-auto flex items-center gap-2">
          {mode && (
            <button
              type="button"
              onClick={batal}
              className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Batal
            </button>
          )}

          {!mode ? (
            <button
              type="button"
              onClick={() => setMode(true)}
              className={tombolMerah}
            >
              Hapus order
            </button>
          ) : jumlah > 0 ? (
            <TombolKonfirmasi
              pesan="Hapus order yang dicentang? Order dipindahkan ke tempat sampah dan masih bisa dipulihkan oleh admin."
              className={tombolMerah}
            >
              Hapus yang dicentang ({jumlah})
            </TombolKonfirmasi>
          ) : (
            <button
              type="button"
              disabled
              className={`${tombolMerah} cursor-not-allowed opacity-50`}
            >
              Hapus order
            </button>
          )}
        </div>
      </div>

      {children}
    </form>
  )
}
'use client'

import { useActionState, useState } from 'react'
import { catatPencairan } from './actions'

export default function FormPencairan({
  kodeGame,
  orderId,
  dana,
}: {
  kodeGame: string
  orderId: number
  dana: number
}) {
  const [state, formAction, pending] = useActionState(catatPencairan, undefined)
  const [jenis, setJenis] = useState('pencairan')
  const [jumlah, setJumlah] = useState('')
  const kelas =
    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'

  const angka = Number(jumlah.replace(/\D/g, '') || '0')
  const melebihi = jenis === 'pencairan' && angka > Math.max(dana, 0)

  return (
    <form
      action={formAction}
      className="w-full space-y-4 rounded-md border p-4 sm:p-6"
    >
      <input type="hidden" name="kode_game" value={kodeGame} />
      <input type="hidden" name="order_id" value={orderId} />

      <div>
        <label htmlFor="jenis" className="block text-sm font-medium">
          Jenis
        </label>
        <select
          id="jenis"
          name="jenis"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className={kelas}
        >
          <option value="pencairan">Pencairan awal (uang keluar ke worker)</option>
          <option value="pengembalian">
            Pengembalian (worker mengembalikan uang)
          </option>
        </select>
      </div>

      <div>
        <label htmlFor="jumlah" className="block text-sm font-medium">
          Jumlah (Rp)
        </label>
        <input
          id="jumlah"
          name="jumlah"
          inputMode="numeric"
          required
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          className={kelas}
        />
      </div>

      <div>
        <label htmlFor="catatan" className="block text-sm font-medium">
          Catatan (opsional)
        </label>
        <input id="catatan" name="catatan" className={kelas} />
      </div>

      {melebihi && (
        <label className="flex items-start gap-2 rounded-md border border-yellow-500 bg-yellow-500/10 p-3 text-sm">
          <input
            type="checkbox"
            name="lanjut"
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            Jumlah ini melebihi dana di kas dan akan menjadi{' '}
            <strong>kelebihan cair</strong>. Centang untuk tetap mencatat.
          </span>
        </label>
      )}

      {state?.error && (
        <p className="rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? 'Menyimpan...' : 'Catat'}
      </button>
    </form>
  )
}
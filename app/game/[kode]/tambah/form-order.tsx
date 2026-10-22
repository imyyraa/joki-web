'use client'
import { rupiah } from '@/lib/format'
import { useActionState, useState } from 'react'
import UnggahBukti from '@/komponen/unggah-bukti'
import { tambahOrder } from './actions'

type PilihanWorker = {
  id: number
  nama: string
  status: string
  urutan: number
  total: number
}
export default function FormOrder({
  kodeGame,
  worker,
  hariIni,
}: {
  kodeGame: string
  worker: PilihanWorker[]
  hariIni: string
}) {
  const [state, formAction, pending] = useActionState(tambahOrder, undefined)
  const [mengunggah, setMengunggah] = useState(false)
  const kelas =
    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'
  const awal = state?.nilai

  return (
    <form
      action={formAction}
      className="w-full space-y-4 rounded-md border p-4 sm:p-6"
    >
      <input type="hidden" name="kode_game" value={kodeGame} />

      <div>
        <label htmlFor="worker_id" className="block text-sm font-medium">
          Worker
        </label>
        <select
          id="worker_id"
          name="worker_id"
          required
          defaultValue={awal?.worker_id ?? ''}
          className={kelas}
        >
          <option value="" disabled>
            Pilih worker
          </option>
          {worker.map((w) => (
            <option key={w.id} value={w.id}>
              {w.urutan}. {w.nama} · {rupiah(w.total)}
              {w.status === 'cadangan' ? ' (cadangan)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="nama_joki" className="block text-sm font-medium">
          Jenis joki
        </label>
        <input
          id="nama_joki"
          name="nama_joki"
          required
          defaultValue={awal?.nama_joki ?? ''}
          className={kelas}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="harga" className="block text-sm font-medium">
            Harga (Rp)
          </label>
          <input
            id="harga"
            name="harga"
            inputMode="numeric"
            placeholder="contoh: 240000"
            required
            defaultValue={awal?.harga ?? ''}
            className={kelas}
          />
        </div>

        <div>
          <label htmlFor="tanggal" className="block text-sm font-medium">
            Tanggal joki
          </label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            required
            defaultValue={awal?.tanggal ?? hariIni}
            className={kelas}
          />
        </div>
      </div>

      <div>
        <label htmlFor="no_customer" className="block text-sm font-medium">
          Nomor customer
        </label>
        <input
          id="no_customer"
          name="no_customer"
          defaultValue={awal?.no_customer ?? ''}
          className={kelas}
        />
      </div>

      <UnggahBukti
        nama="bukti_bayar"
        label="Bukti pembayaran customer (wajib)"
        onSibuk={setMengunggah}
      />

      <div>
        <label htmlFor="catatan" className="block text-sm font-medium">
          Catatan
        </label>
        <textarea
          id="catatan"
          name="catatan"
          rows={3}
          defaultValue={awal?.catatan ?? ''}
          className={kelas}
        />
      </div>

      <div>
        <label htmlFor="alasan" className="block text-sm font-medium">
          Alasan memilih worker (isi jika bukan urutan teratas)
        </label>
        <input
          id="alasan"
          name="alasan"
          defaultValue={awal?.alasan ?? ''}
          className={kelas}
        />
      </div>

      {state?.error && (
        <p className="rounded-md border border-red-600/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || mengunggah}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {mengunggah ? 'Mengunggah bukti...' : pending ? 'Menyimpan...' : 'Simpan order'}
      </button>
    </form>
  )
}
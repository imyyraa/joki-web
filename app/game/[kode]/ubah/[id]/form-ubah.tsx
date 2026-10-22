'use client'

import { useActionState, useState } from 'react'
import UnggahBukti from '@/komponen/unggah-bukti'
import { ubahOrder } from './actions'

type PilihanWorker = { id: number; nama: string; status: string }

type Awal = {
  worker_id: string
  nama_joki: string
  harga: string
  charge: string
  tanggal: string
  progress: string
  no_customer: string
  catatan: string
  alasan: string
}

function LihatBukti({
  path,
  label,
  bersih,
}: {
  path: string | null
  label: string
  bersih?: boolean
}) {
  if (!path) {
    return (
      <p className="mt-1 text-xs text-muted-foreground">
        {label}: {bersih ? 'bukti sudah dihapus' : 'belum ada'}
      </p>
    )
  }
  return (
    <p className="mt-1 text-xs">
      {label}:{' '}
      <a
        href={`/bukti?p=${encodeURIComponent(path)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline"
      >
        lihat bukti saat ini
      </a>
    </p>
  )
}

export default function FormUbah({
  kodeGame,
  orderId,
  kodeOrder,
  kas,
  worker,
  awal,
  buktiBayar,
  buktiSelesai,
  buktiCharge,
  dibersihkan,
}: {
  kodeGame: string
  orderId: number
  kodeOrder: string
  kas: string
  worker: PilihanWorker[]
  awal: Awal
  buktiBayar: string | null
  buktiSelesai: string | null
  buktiCharge: string | null
  dibersihkan: boolean
}) {
  const [state, formAction, pending] = useActionState(ubahOrder, undefined)
  const [mengunggah, setMengunggah] = useState(false)
  const kelas =
    'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm'
  const nilai = (state?.nilai as Awal | undefined) ?? awal

  const labelWorker = (w: PilihanWorker) =>
    w.nama +
    (w.status === 'cadangan'
      ? ' (cadangan)'
      : w.status === 'lama'
        ? ' (sudah tidak di game ini)'
        : '')

  return (
    <form
      action={formAction}
      className="w-full space-y-4 rounded-md border p-4 sm:p-6"
    >
      <input type="hidden" name="kode_game" value={kodeGame} />
      <input type="hidden" name="order_id" value={orderId} />

      <p className="text-sm">
        Status pembayaran:{' '}
        {kas === 'dibayarkan' ? (
          <span className="inline-block rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
            Dibayarkan
          </span>
        ) : (
          <span className="inline-block rounded bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
            Disimpan
          </span>
        )}{' '}
        <span className="text-xs text-muted-foreground">
          (diubah oleh admin)
        </span>
      </p>

      <div>
        <label htmlFor="worker_id" className="block text-sm font-medium">
          Worker
        </label>
        <select
          id="worker_id"
          name="worker_id"
          required
          defaultValue={nilai.worker_id}
          className={kelas}
        >
          {worker.map((w) => (
            <option key={w.id} value={w.id}>
              {labelWorker(w)}
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
          defaultValue={nilai.nama_joki}
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
            required
            defaultValue={nilai.harga}
            className={kelas}
          />
        </div>

        <div>
          <label htmlFor="charge" className="block text-sm font-medium">
            Charge (Rp)
          </label>
          <input
            id="charge"
            name="charge"
            inputMode="numeric"
            defaultValue={nilai.charge}
            className={kelas}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Biaya tambahan. Menambah pendapatan worker.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tanggal" className="block text-sm font-medium">
            Tanggal joki
          </label>
          <input
            id="tanggal"
            name="tanggal"
            type="date"
            required
            defaultValue={nilai.tanggal}
            className={kelas}
          />
        </div>

        <div>
          <label htmlFor="progress" className="block text-sm font-medium">
            Progress
          </label>
          <select
            id="progress"
            name="progress"
            defaultValue={nilai.progress}
            className={kelas}
          >
            <option value="progress">Progress</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="no_customer" className="block text-sm font-medium">
          Nomor customer
        </label>
        <input
          id="no_customer"
          name="no_customer"
          defaultValue={nilai.no_customer}
          className={kelas}
        />
      </div>

      <div>
        <UnggahBukti
          nama="bukti_bayar"
          label="Ganti bukti pembayaran (opsional)"
          onSibuk={setMengunggah}
        />
        <LihatBukti
          path={buktiBayar}
          label="Bukti pembayaran"
          bersih={dibersihkan}
        />
      </div>

      <div>
        <UnggahBukti
          nama="bukti_selesai"
          label="Bukti selesai / chat customer (wajib saat status Selesai)"
          onSibuk={setMengunggah}
        />
        <LihatBukti
          path={buktiSelesai}
          label="Bukti selesai"
          bersih={dibersihkan}
        />
      </div>

      <div>
        <UnggahBukti
          nama="bukti_charge"
          label="Bukti tambahan charge (wajib jika charge bertambah)"
          onSibuk={setMengunggah}
        />
        <LihatBukti
          path={buktiCharge}
          label="Bukti charge"
          bersih={dibersihkan}
        />
      </div>

      <div>
        <label htmlFor="catatan" className="block text-sm font-medium">
          Catatan
        </label>
        <textarea
          id="catatan"
          name="catatan"
          rows={3}
          defaultValue={nilai.catatan}
          className={kelas}
        />
      </div>

      <div>
        <label htmlFor="alasan" className="block text-sm font-medium">
          Alasan memilih worker
        </label>
        <input
          id="alasan"
          name="alasan"
          defaultValue={nilai.alasan}
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
        {mengunggah
          ? 'Mengunggah bukti...'
          : pending
            ? 'Menyimpan...'
            : `Simpan perubahan ${kodeOrder}`}
      </button>
    </form>
  )
}
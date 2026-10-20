import { rupiah } from '@/lib/format'

export type Diff = Record<string, { dari: unknown; ke: unknown }>
export type Penerjemah = (kunci: string, nilai: unknown) => string | undefined

const LABEL: Record<string, string> = {
  kode: 'Kode',
  nama: 'Nama',
  nama_joki: 'Jenis joki',
  harga: 'Harga',
  charge: 'Charge',
  refund: 'Refund',
  tanggal: 'Tanggal',
  progress: 'Progress',
  kas: 'Status pembayaran',
  catatan: 'Catatan',
  alasan_memilih: 'Alasan memilih',
  worker_id: 'Worker',
  game_id: 'Game',
  potongan_persen: 'Potongan (%)',
  rekening: 'Rekening',
  aktif: 'Aktif',
  status: 'Status',
  mulai: 'Tanggal mulai',
  selesai: 'Tanggal selesai',
  peran: 'Peran',
  peringkat_saat_dipilih: 'Peringkat saat dipilih',
}

const UANG = new Set(['harga', 'charge', 'refund'])

function tampil(kunci: string, v: unknown, terjemah?: Penerjemah): string {
  const t = terjemah?.(kunci, v)
  if (t !== undefined) return t
  if (v === null || v === undefined || v === '') return '(kosong)'
  if (UANG.has(kunci) && typeof v === 'number') return rupiah(v)
  if (typeof v === 'boolean') return v ? 'ya' : 'tidak'
  return String(v)
}

export function ringkasDiff(diff: Diff, terjemah?: Penerjemah): string[] {
  const hasil: string[] = []
  for (const [kunci, p] of Object.entries(diff)) {
    if (kunci === 'dihapus_oleh') continue
    if (kunci === 'dihapus_pada') {
      hasil.push(
        p.ke ? 'Dipindahkan ke tempat sampah' : 'Dipulihkan dari tempat sampah'
      )
      continue
    }
    hasil.push(
      `${LABEL[kunci] ?? kunci}: ${tampil(kunci, p.dari, terjemah)} → ${tampil(kunci, p.ke, terjemah)}`
    )
  }
  return hasil
}

export function ringkasBaru(
  data: Record<string, unknown>,
  kunci: string[],
  terjemah?: Penerjemah
): string[] {
  return kunci
    .filter((k) => data[k] !== undefined && data[k] !== null)
    .map((k) => `${LABEL[k] ?? k}: ${tampil(k, data[k], terjemah)}`)
}

export function waktuIndo(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
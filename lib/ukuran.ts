// Batas penyimpanan file. Paket gratis Supabase: 1 GB.
// Ganti angkanya jika paket Anda berbeda.
export const BATAS_PENYIMPANAN_BYTE = 1024 ** 3

export function ukuranFile(byte: number): string {
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 ** 2) return `${Math.round(byte / 1024)} KB`
  if (byte < 1024 ** 3) return `${(byte / 1024 ** 2).toFixed(1)} MB`
  return `${(byte / 1024 ** 3).toFixed(2)} GB`
}
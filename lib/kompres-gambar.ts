export async function kompresGambar(
  file: File,
  lebarMaks = 1600,
  mutu = 0.82
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const skala = Math.min(1, lebarMaks / bitmap.width)
  const lebar = Math.round(bitmap.width * skala)
  const tinggi = Math.round(bitmap.height * skala)

  const kanvas = document.createElement('canvas')
  kanvas.width = lebar
  kanvas.height = tinggi
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Peramban tidak mendukung pengecilan gambar.')
  ctx.drawImage(bitmap, 0, 0, lebar, tinggi)
  bitmap.close()

  const blob: Blob | null = await new Promise((selesai) =>
    kanvas.toBlob(selesai, 'image/jpeg', mutu)
  )
  if (!blob) throw new Error('Gagal memproses gambar.')
  return new File([blob], 'bukti.jpg', { type: 'image/jpeg' })
}
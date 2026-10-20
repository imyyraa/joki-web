'use client'

import { useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { kompresGambar } from '@/lib/kompres-gambar'

export default function UnggahBukti({
  nama,
  label,
  onSibuk,
}: {
  nama: string
  label: string
  onSibuk?: (sibuk: boolean) => void
}) {
  const [path, setPath] = useState('')
  const [info, setInfo] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function saatPilih(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setGalat('')
    setInfo('')
    setPath('')

    if (!file.type.startsWith('image/')) {
      setGalat('File harus berupa gambar.')
      return
    }

    setSibuk(true)
    onSibuk?.(true)
    try {
      const kecil = await kompresGambar(file)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesi login habis, silakan login ulang.')

      const lokasi = `${user.id}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage
        .from('bukti')
        .upload(lokasi, kecil, { contentType: 'image/jpeg', upsert: false })
      if (error) throw new Error(error.message)

      setPath(lokasi)
      setInfo(`Terunggah (${Math.round(kecil.size / 1024)} KB)`)
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Gagal mengunggah.')
    } finally {
      setSibuk(false)
      onSibuk?.(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type="file"
        accept="image/*"
        onChange={saatPilih}
        className="mt-1 w-full text-sm"
      />
      <input type="hidden" name={nama} value={path} />
      {sibuk && <p className="mt-1 text-xs">Mengunggah...</p>}
      {info && <p className="mt-1 text-xs text-green-600">{info}</p>}
      {galat && <p className="mt-1 text-xs text-red-600">{galat}</p>}
    </div>
  )
}
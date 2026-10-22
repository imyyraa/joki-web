'use client'

import { useId, useState, type ChangeEvent } from 'react'
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
  const idIsian = useId()
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
      <label htmlFor={idIsian} className="block text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 rounded-md border border-dashed bg-muted/30 p-3">
        <input
          id={idIsian}
          type="file"
          accept="image/*"
          onChange={saatPilih}
          disabled={sibuk}
          className="w-full text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input type="hidden" name={nama} value={path} />
        <div aria-live="polite">
          {sibuk && (
            <p className="mt-2 text-xs text-muted-foreground">Mengunggah...</p>
          )}
          {info && (
            <p className="mt-2 text-xs text-green-700 dark:text-green-400">
              {info}
            </p>
          )}
        </div>
        {galat && (
          <p
            role="alert"
            className="mt-2 text-xs text-red-600 dark:text-red-400"
          >
            {galat}
          </p>
        )}
      </div>
    </div>
  )
}
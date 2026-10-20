import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ambilPengguna } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const pengguna = await ambilPengguna()
  if (!pengguna) {
    return new NextResponse('Harus login terlebih dahulu.', { status: 401 })
  }

  const path = request.nextUrl.searchParams.get('p') ?? ''
  if (!path) {
    return new NextResponse('Alamat bukti kosong.', { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('bukti').download(path)

  if (error || !data) {
    return new NextResponse(
      'Bukti tidak ditemukan atau Anda tidak berhak melihatnya.',
      { status: 404 }
    )
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'image/jpeg',
      'Cache-Control': 'private, no-store',
    },
  })
}
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const HALAMAN_DILINDUNGI = ['/halo', '/admin']

function alihkan(request: NextRequest, tujuan: string, response: NextResponse) {
  const url = request.nextUrl.clone()
  url.pathname = tujuan
  const hasil = NextResponse.redirect(url)
  response.cookies.getAll().forEach((c) => hasil.cookies.set(c))
  return hasil
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

    const {
    data: { user },
  } = await supabase.auth.getUser()
  const sudahLogin = !!user

  const path = request.nextUrl.pathname
  const perluLogin = HALAMAN_DILINDUNGI.some(
    (p) => path === p || path.startsWith(p + '/')
  )

  if (!sudahLogin && perluLogin) return alihkan(request, '/login', response)
  if (sudahLogin && path === '/login') return alihkan(request, '/halo', response)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
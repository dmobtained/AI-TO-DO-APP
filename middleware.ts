import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const APP_PATHS = [
  '/dashboard',
  '/mail',
  '/admin',
  '/goud',
  '/auto',
  '/business',
  '/notities',
  '/vergaderingen',
  '/valuta',
  '/persoonlijke-info',
]

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isAdmin(user: { user_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!user?.user_metadata?.role) return false
  return String(user.user_metadata.role).toLowerCase().trim() === 'admin'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!isAppPath(pathname)) {
    return NextResponse.next({ request })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname.startsWith('/admin') && !isAdmin(user)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/mail',
    '/mail/:path*',
    '/admin',
    '/admin/:path*',
    '/goud',
    '/goud/:path*',
    '/auto',
    '/auto/:path*',
    '/business',
    '/business/:path*',
    '/notities',
    '/notities/:path*',
    '/vergaderingen',
    '/vergaderingen/:path*',
    '/valuta',
    '/valuta/:path*',
    '/persoonlijke-info',
    '/persoonlijke-info/:path*',
  ],
}

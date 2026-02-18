import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DASHBOARD_PATH = '/dashboard'

function getModuleNameFromPathname(pathname: string): string | null {
  if (pathname === DASHBOARD_PATH || pathname === DASHBOARD_PATH + '/') return 'dashboard'
  if (pathname.startsWith(DASHBOARD_PATH + '/taken')) return 'taken'
  if (pathname.startsWith(DASHBOARD_PATH + '/financien')) return 'financien'
  if (pathname.startsWith(DASHBOARD_PATH + '/email')) return 'email'
  if (pathname.startsWith(DASHBOARD_PATH + '/instellingen')) return 'instellingen'
  if (pathname.startsWith(DASHBOARD_PATH + '/admin')) return 'admin'
  return null
}

function isAdmin(user: { user_metadata?: Record<string, unknown> } | null | undefined): boolean {
  if (!user?.user_metadata?.role) return false
  return String(user.user_metadata.role).toUpperCase() === 'ADMIN'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith(DASHBOARD_PATH)) {
    return NextResponse.next({ request })
  }

  const moduleName = getModuleNameFromPathname(pathname)
  if (!moduleName) return NextResponse.next({ request })

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

  // getUser() leest sessie; setAll vernieuwt cookies. getClaims() kan in Edge hangen (JWKS).
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isAdmin(user)) {
    return supabaseResponse
  }

  const { data: row } = await supabase
    .from('modules')
    .select('is_active')
    .eq('name', moduleName)
    .maybeSingle()

  if (row && row.is_active === false) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}

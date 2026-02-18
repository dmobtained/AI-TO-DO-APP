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

function isAdmin(session: { user: { user_metadata?: Record<string, unknown> } } | null): boolean {
  if (!session?.user?.user_metadata?.role) return false
  const role = String(session.user.user_metadata.role).toUpperCase()
  return role === 'ADMIN'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith(DASHBOARD_PATH)) {
    return response
  }

  const moduleName = getModuleNameFromPathname(pathname)
  if (!moduleName) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: import('@supabase/ssr').CookieOptions) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: import('@supabase/ssr').CookieOptions) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isAdmin(session)) {
    return response
  }

  const { data: row } = await supabase
    .from('modules')
    .select('is_active')
    .eq('name', moduleName)
    .maybeSingle()

  if (row && row.is_active === false) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*'],
}

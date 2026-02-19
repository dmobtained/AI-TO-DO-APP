import { redirect } from 'next/navigation'
import { getDashboardAuth } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getDashboardAuth()
  if (!auth.session) {
    redirect('/')
  }
  if (auth.role !== 'admin') {
    redirect('/dashboard')
  }
  return <>{children}</>
}

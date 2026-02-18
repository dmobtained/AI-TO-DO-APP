export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { getDashboardAuth } from '@/lib/dashboard-auth'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await getDashboardAuth()
  if (!auth.session) {
    redirect('/')
  }
  return (
    <DashboardShell
      session={auth.session}
      role={auth.role}
      flags={auth.flags}
      profileEmail={auth.profileEmail}
      profileName={auth.profileName}
      moduleStatus={auth.moduleStatus}
    >
      {children}
    </DashboardShell>
  )
}

"use client";
export const dynamic = "force-dynamic";

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { useDashboard } from '@/context/DashboardContext'
import { FeatureGuard } from '@/components/FeatureGuard'

export default function FinancienBeleggenPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/')
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 rounded bg-slate-200 animate-pulse" />
      </div>
    )
  }

  return (
    <FeatureGuard feature="finance_module">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900">Beleggen</h1>
        <p className="text-slate-500 text-sm mt-0.5">Beleggingsoverzicht</p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-600">Deze sectie wordt binnenkort beschikbaar.</p>
        </div>
      </div>
    </FeatureGuard>
  )
}

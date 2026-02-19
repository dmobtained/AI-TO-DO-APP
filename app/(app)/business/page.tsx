'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { UserPlus, Phone, Handshake } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function BusinessPage() {
  return (
    <PageContainer>
      <SectionHeader title="Business pipeline" subtitle="Leads en deals" />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Totaal leads" value="0" />
        <StatCard title="Conversieratio" value="—" />
        <StatCard title="Deals waarde" value="€ —" />
      </div>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 min-h-[400px] flex flex-col hover:shadow-md transition-all duration-200">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <UserPlus className="h-5 w-5 text-slate-500" /> Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex items-center">
            <div className="w-full rounded-xl border border-dashed border-[#e5e7eb] p-6 min-h-[320px] flex items-center justify-center">
              <EmptyState icon={UserPlus} title="Geen leads" description="+ Toevoegen (placeholder)" />
            </div>
          </CardContent>
        </Card>
        <Card className="p-6 min-h-[400px] flex flex-col hover:shadow-md transition-all duration-200">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Phone className="h-5 w-5 text-slate-500" /> Gesprek
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex items-center">
            <div className="w-full rounded-xl border border-dashed border-[#e5e7eb] p-6 min-h-[320px] flex items-center justify-center">
              <EmptyState icon={Phone} title="Geen gesprekken" description="+ Toevoegen (placeholder)" />
            </div>
          </CardContent>
        </Card>
        <Card className="p-6 min-h-[400px] flex flex-col hover:shadow-md transition-all duration-200">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Handshake className="h-5 w-5 text-slate-500" /> Deal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex items-center">
            <div className="w-full rounded-xl border border-dashed border-[#e5e7eb] p-6 min-h-[320px] flex items-center justify-center">
              <EmptyState icon={Handshake} title="Geen deals" description="+ Toevoegen (placeholder)" />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

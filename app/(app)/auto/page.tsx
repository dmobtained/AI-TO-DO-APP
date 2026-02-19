'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { StatCard } from '@/components/ui/StatCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { PageContainer } from '@/components/ui/PageContainer'
import { Fuel, Wrench, AlertCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AutoPage() {
  return (
    <PageContainer>
      <SectionHeader title="Auto" subtitle="Kosten en onderhoud" />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Totale kosten dit jaar" value="€ —" />
        <StatCard title="Kosten per km" value="€ —" />
        <StatCard title="Aanschafwaarde" value="€ —" />
        <StatCard title="Huidige waarde" value="€ —" />
      </div>

      <Card className="mt-8 p-6">
        <Tabs defaultValue="tank">
          <TabsList>
            <TabsTrigger value="tank">Tankbeurten</TabsTrigger>
            <TabsTrigger value="onderhoud">Onderhoud</TabsTrigger>
            <TabsTrigger value="reparaties">Reparaties</TabsTrigger>
          </TabsList>
          <TabsContent value="tank">
            <EmptyState icon={Fuel} title="Geen tankbeurten" description="Nog geen tankbeurten geregistreerd. Voeg een tankbeurt toe (placeholder)." />
          </TabsContent>
          <TabsContent value="onderhoud">
            <EmptyState icon={Wrench} title="Geen onderhoud" description="Nog geen onderhoud geregistreerd. Voeg onderhoud toe (placeholder)." />
          </TabsContent>
          <TabsContent value="reparaties">
            <EmptyState icon={AlertCircle} title="Geen reparaties" description="Nog geen reparaties geregistreerd. Voeg een reparatie toe (placeholder)." />
          </TabsContent>
        </Tabs>
      </Card>
    </PageContainer>
  )
}

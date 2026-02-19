'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Car, Fuel, Wrench, AlertCircle } from 'lucide-react'

export default function AutoPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Auto</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Totale kosten dit jaar</p>
          <p className="text-2xl font-bold text-white mt-1">€ —</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Kosten per km</p>
          <p className="text-2xl font-bold text-white mt-1">€ —</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Aanschafwaarde</p>
          <p className="text-2xl font-bold text-white mt-1">€ —</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Huidige waarde</p>
          <p className="text-2xl font-bold text-white mt-1">€ —</p>
        </Card>
      </div>
      <Card className="p-6">
        <Tabs defaultValue="tank">
          <TabsList>
            <TabsTrigger value="tank">Tankbeurten</TabsTrigger>
            <TabsTrigger value="onderhoud">Onderhoud</TabsTrigger>
            <TabsTrigger value="reparaties">Reparaties</TabsTrigger>
          </TabsList>
          <TabsContent value="tank">
            <div className="flex items-center gap-2 text-white/70 text-sm py-4">
              <Fuel className="h-5 w-5" /> Geen tankbeurten geregistreerd. + Toevoegen (placeholder).
            </div>
          </TabsContent>
          <TabsContent value="onderhoud">
            <div className="flex items-center gap-2 text-white/70 text-sm py-4">
              <Wrench className="h-5 w-5" /> Geen onderhoud geregistreerd. + Toevoegen (placeholder).
            </div>
          </TabsContent>
          <TabsContent value="reparaties">
            <div className="flex items-center gap-2 text-white/70 text-sm py-4">
              <AlertCircle className="h-5 w-5" /> Geen reparaties geregistreerd. + Toevoegen (placeholder).
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

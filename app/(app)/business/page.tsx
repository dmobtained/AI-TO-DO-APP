'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { UserPlus, Phone, Handshake } from 'lucide-react'

export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Business pipeline</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5" /> Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="rounded-xl border border-white/10 p-4 text-sm text-white/80">Geen items. + Toevoegen (placeholder)</div>
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-5 w-5" /> Gesprek
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="rounded-xl border border-white/10 p-4 text-sm text-white/80">Geen items. + Toevoegen (placeholder)</div>
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Handshake className="h-5 w-5" /> Deal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            <div className="rounded-xl border border-white/10 p-4 text-sm text-white/80">Geen items. + Toevoegen (placeholder)</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

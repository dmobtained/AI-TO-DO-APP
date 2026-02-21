'use client'

import React, { useCallback, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Lock, Unlock, ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import type { ModuleRow } from '@/lib/moduleLockConfig'

type Props = {
  initialModules: ModuleRow[]
}

export function AdminModulesClient({ initialModules }: Props) {
  const toast = useToast()
  const [modules, setModules] = useState<ModuleRow[]>(initialModules)
  const [updatingKey, setUpdatingKey] = useState<string | null>(null)
  const [lockReason, setLockReason] = useState('')
  const [lockingKey, setLockingKey] = useState<string | null>(null)
  const [killSwitchReason, setKillSwitchReason] = useState('')
  const [showKillLock, setShowKillLock] = useState(false)
  const [killSwitchLoading, setKillSwitchLoading] = useState(false)

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/module-locks', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(data?.error ?? 'Laden mislukt', 'error')
        return
      }
      setModules(Array.isArray(data.modules) ? data.modules : [])
    } catch {
      toast('Laden mislukt', 'error')
    }
  }, [toast])

  const handleLock = useCallback(
    async (moduleKey: string, isLocked: boolean, reason?: string) => {
      setUpdatingKey(moduleKey)
      setLockingKey(null)
      setLockReason('')
      try {
        const res = await fetch('/api/admin/module-locks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            module_key: moduleKey,
            is_locked: isLocked,
            reason: isLocked ? (reason ?? 'Onderhoud') : '',
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast(data?.error ?? 'Opslaan mislukt', 'error')
          return
        }
        setModules((prev) =>
          prev.map((m) =>
            m.module_key === moduleKey
              ? { ...m, is_locked: isLocked, reason: isLocked ? (reason ?? 'Onderhoud') : null, updated_at: new Date().toISOString() }
              : m
          )
        )
        toast(isLocked ? 'Module vergrendeld' : 'Module ontgrendeld')
      } catch {
        toast('Opslaan mislukt', 'error')
      } finally {
        setUpdatingKey(null)
      }
    },
    [toast]
  )

  const handleKillSwitch = useCallback(
    async (locked: boolean) => {
      setKillSwitchLoading(true)
      setShowKillLock(false)
      setKillSwitchReason('')
      try {
        const res = await fetch('/api/admin/module-locks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            action: 'killswitch',
            locked,
            reason: locked ? killSwitchReason.trim() || 'Kill switch' : '',
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast(data?.error ?? data?.details ?? 'Kill switch mislukt', 'error')
          return
        }
        toast(locked ? 'Alle modules vergrendeld' : 'Alle modules ontgrendeld')
        fetchModules()
      } catch {
        toast('Kill switch mislukt', 'error')
      } finally {
        setKillSwitchLoading(false)
      }
    },
    [toast, fetchModules, killSwitchReason]
  )

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-textSecondary hover:text-textPrimary"
        >
          <ArrowLeft className="h-4 w-4" /> Terug naar Admin
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-textPrimary">Module vergrendelingen</h1>

      <Card className="p-6 border-amber-200 bg-amber-50/30">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-textPrimary flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" /> Kill Switch
          </CardTitle>
          <p className="text-sm text-textSecondary font-normal mt-1">
            Vergrendel of ontgrendel alle modules in één keer.
          </p>
        </CardHeader>
        <CardContent className="p-0 flex flex-wrap items-center gap-3">
          {showKillLock ? (
            <>
              <Input
                placeholder="Reden (verplicht bij LOCK ALL)"
                value={killSwitchReason}
                onChange={(e) => setKillSwitchReason(e.target.value)}
                className="max-w-[240px]"
              />
              <Button
                variant="primary"
                className="text-xs py-1.5 px-3"
                disabled={killSwitchLoading || !killSwitchReason.trim()}
                onClick={() => handleKillSwitch(true)}
              >
                <Lock className="h-3.5 w-3 mr-1" /> LOCK ALL
              </Button>
              <Button variant="ghost" className="text-xs py-1.5 px-3" onClick={() => { setShowKillLock(false); setKillSwitchReason('') }}>
                Annuleren
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="text-xs py-1.5 px-3"
                disabled={killSwitchLoading}
                onClick={() => setShowKillLock(true)}
              >
                <Lock className="h-3.5 w-3 mr-1" /> LOCK ALL
              </Button>
              <Button
                variant="secondary"
                className="text-xs py-1.5 px-3"
                disabled={killSwitchLoading}
                onClick={() => handleKillSwitch(false)}
              >
                <ShieldCheck className="h-3.5 w-3 mr-1" /> UNLOCK ALL
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-textPrimary">Modules</CardTitle>
          <p className="text-sm text-textSecondary font-normal mt-1">
            Vergrendelde modules zijn voor gebruikers alleen-lezen (onderhoudsbanner + server guard).
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {modules.length === 0 ? (
            <p className="text-textSecondary text-sm">Geen modules.</p>
          ) : (
            <div className="overflow-auto rounded-[14px] border border-border">
              <table className="w-full text-sm">
                <thead className="bg-hover border-b border-border">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">Module</th>
                    <th className="px-4 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">Reden</th>
                    <th className="px-4 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">Laatst bijgewerkt</th>
                    <th className="px-4 py-3 text-xs font-medium text-textSecondary uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {modules.map((m) => (
                    <tr key={m.module_key} className="hover:bg-hover">
                      <td className="px-4 py-3 font-medium text-textPrimary">{m.label}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.is_locked ? 'warning' : 'success'}>
                          {m.is_locked ? 'Vergrendeld' : 'Ontgrendeld'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-textSecondary max-w-[200px] truncate" title={m.reason ?? undefined}>
                        {m.reason ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-textSecondary whitespace-nowrap">
                        {m.updated_at ? new Date(m.updated_at).toLocaleString('nl-NL') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {lockingKey === m.module_key ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              placeholder="Reden (verplicht bij lock)"
                              value={lockReason}
                              onChange={(e) => setLockReason(e.target.value)}
                              className="max-w-[180px]"
                            />
                            <Button
                              variant="primary"
                              className="text-xs py-1.5 px-3"
                              disabled={!lockReason.trim() || updatingKey === m.module_key}
                              onClick={() => handleLock(m.module_key, true, lockReason.trim())}
                            >
                              Vergrendelen
                            </Button>
                            <Button variant="ghost" className="text-xs py-1.5 px-3" onClick={() => { setLockingKey(null); setLockReason('') }}>
                              Annuleren
                            </Button>
                          </div>
                        ) : m.is_locked ? (
                          <Button
                            variant="secondary"
                            className="text-xs py-1.5 px-3"
                            disabled={updatingKey !== null}
                            onClick={() => handleLock(m.module_key, false)}
                          >
                            <Unlock className="h-3.5 w-3 mr-1" /> Ontgrendelen
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="text-xs py-1.5 px-3"
                            disabled={updatingKey !== null}
                            onClick={() => setLockingKey(m.module_key)}
                          >
                            <Lock className="h-3.5 w-3 mr-1" /> Vergrendelen
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

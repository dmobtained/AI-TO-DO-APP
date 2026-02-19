'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { UserTable, type AdminUser } from '@/components/admin/UserTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Activity, Users, Settings } from 'lucide-react'

type ActivityRow = {
  id: string
  created_at: string
  actor_user_id: string
  actor_email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
}

export default function AdminPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [actorFilter, setActorFilter] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!role || role !== 'admin') {
      router.replace('/dashboard')
      return
    }
  }, [role, authLoading, router])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch (err) {
      console.error('[Admin] fetch users:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, metadata')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setActivity((data ?? []) as ActivityRow[])
    } catch (err) {
      console.error('[Admin] fetch activity:', err)
      setActivity([])
    } finally {
      setActivityLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role !== 'admin') return
    fetchUsers()
  }, [role, fetchUsers])

  useEffect(() => {
    if (role !== 'admin') return
    fetchActivity()
  }, [role, fetchActivity])

  const handleRoleChange = useCallback(async (user: AdminUser) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin'
    setUpdatingId(user.id)
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)))
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[Admin] update role error:', data.error ?? res.statusText)
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: user.role } : u)))
      }
    } catch (err) {
      console.error('[Admin] update role exception:', err)
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: user.role } : u)))
    } finally {
      setUpdatingId(null)
    }
  }, [])

  const filteredActivity = activity.filter((row) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      row.action.toLowerCase().includes(q) ||
      (row.entity_type ?? '').toLowerCase().includes(q)
    const matchActor =
      !actorFilter ||
      row.actor_user_id === actorFilter ||
      (row.actor_email ?? '').toLowerCase().includes(actorFilter.toLowerCase())
    return matchSearch && matchActor
  })

  if (authLoading || (!role && !authLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-white/60 text-sm">Laden...</p>
      </div>
    )
  }

  if (role !== 'admin') {
    return null
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold text-white">Admin</h1>
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" /> Activity
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" /> Users
          </TabsTrigger>
          <TabsTrigger value="system">
            <Settings className="h-4 w-4 mr-2" /> System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Activity log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-2 mb-4">
                <Input
                  placeholder="Filter op action / entity_type..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <Input
                  placeholder="Actor user id / email"
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              {activityLoading ? (
                <p className="text-white/60 text-sm">Laden…</p>
              ) : filteredActivity.length === 0 ? (
                <p className="text-white/60 text-sm">Geen events.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/70">
                        <th className="pb-2 pr-4">Tijd</th>
                        <th className="pb-2 pr-4">Actor</th>
                        <th className="pb-2 pr-4">Action</th>
                        <th className="pb-2 pr-4">Entity</th>
                        <th className="pb-2">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivity.map((row) => (
                        <tr key={row.id} className="border-b border-white/5">
                          <td className="py-2 pr-4 text-white/80 whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString('nl-NL')}
                          </td>
                          <td className="py-2 pr-4 text-white/80">
                            {row.actor_email ?? row.actor_user_id.slice(0, 8)}
                          </td>
                          <td className="py-2 pr-4 text-white font-medium">{row.action}</td>
                          <td className="py-2 pr-4 text-white/80">
                            {row.entity_type ?? '—'} {row.entity_id ? `(${String(row.entity_id).slice(0, 8)})` : ''}
                          </td>
                          <td className="py-2 text-white/60">
                            {Object.keys(row.metadata ?? {}).length > 0
                              ? JSON.stringify(row.metadata).slice(0, 60) + '…'
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Gebruikersbeheer</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <UserTable
                users={users}
                loading={loading}
                updatingId={updatingId}
                onRoleChange={handleRoleChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>System</CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-white/70 text-sm">
              Placeholder: systeeminstellingen (geen developer mode).
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

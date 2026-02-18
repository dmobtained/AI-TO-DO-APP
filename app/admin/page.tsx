'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthProvider'
import { UserTable, type AdminUser } from '@/components/admin/UserTable'

export default function AdminPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!role || role !== 'ADMIN') {
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

  useEffect(() => {
    if (role !== 'ADMIN') return
    fetchUsers()
  }, [role, fetchUsers])

  const handleRoleChange = useCallback(async (user: AdminUser) => {
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
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

  if (authLoading || (!role && !authLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500 text-sm">Laden...</p>
      </div>
    )
  }

  if (role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Gebruikersbeheer</h1>
          <p className="text-slate-500 text-sm mt-0.5">Beheer rollen van gebruikers</p>
        </div>
        <UserTable
          users={users}
          loading={loading}
          updatingId={updatingId}
          onRoleChange={handleRoleChange}
        />
      </div>
    </div>
  )
}

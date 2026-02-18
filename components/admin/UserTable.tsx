'use client'

export type AdminUser = {
  id: string
  email: string | null
  role: 'ADMIN' | 'USER'
}

type UserTableProps = {
  users: AdminUser[]
  loading?: boolean
  updatingId: string | null
  onRoleChange: (user: AdminUser) => void
}

function RoleBadge({ role }: { role: 'ADMIN' | 'USER' }) {
  const className = role === 'ADMIN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {role}
    </span>
  )
}

export function UserTable({ users, loading, updatingId, onRoleChange }: UserTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">Laden...</div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">Geen gebruikers gevonden.</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="text-left px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">Email</th>
              <th className="text-left px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">Rol</th>
              <th className="text-right px-6 py-3 text-slate-600 dark:text-slate-300 font-medium">Actie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{user.email ?? '—'}</td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onRoleChange(user)}
                    disabled={updatingId === user.id}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingId === user.id ? 'Bezig…' : user.role === 'ADMIN' ? 'Naar USER' : 'Naar ADMIN'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

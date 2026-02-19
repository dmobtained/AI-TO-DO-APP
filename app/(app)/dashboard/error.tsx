'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard]', error)
  }, [error])

  const message = error?.message ? String(error.message) : 'Er trad een fout op.'

  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Er is iets misgegaan</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">{message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Opnieuw proberen
      </button>
    </div>
  )
}

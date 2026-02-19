'use client'

export function AIReplyBox({
  draft,
  onDraftChange,
  onGenerate,
  loading,
  error,
  onCopy,
  disabled,
}: {
  draft: string
  onDraftChange: (value: string) => void
  onGenerate: () => void
  loading: boolean
  error: string | null
  onCopy: () => void
  disabled: boolean
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading || disabled}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        Genereer AI Antwoord
      </button>
      <div>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          disabled={disabled}
          placeholder="AI-antwoord verschijnt hier..."
          rows={8}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm disabled:opacity-60"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled || !draft.trim()}
          className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 shadow-sm"
        >
          Kopieer
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 shadow-sm"
        >
          Verzenden
        </button>
      </div>
    </div>
  )
}

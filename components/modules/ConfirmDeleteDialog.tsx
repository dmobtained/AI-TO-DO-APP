'use client'

import { Button } from '@/components/ui/Button'

type ConfirmDeleteDialogProps = {
  open: boolean
  title?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  const {
    open,
    title = 'Verwijderen',
    message = 'Weet je zeker dat je dit wilt verwijderen?',
    onConfirm,
    onCancel,
    loading = false,
  } = props

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-delete-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Bezig…' : 'Verwijderen'}
          </Button>
        </div>
      </div>
    </div>
  )
}

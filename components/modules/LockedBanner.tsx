'use client'

type LockedBannerProps = {
  moduleLabel?: string
  /** When set, show "Under maintenance: {reason}" instead of generic message. */
  reason?: string | null
  className?: string
}

export function LockedBanner({
  moduleLabel = 'Deze module',
  reason,
  className = '',
}: LockedBannerProps) {
  const message = reason?.trim()
    ? `Under maintenance: ${reason}`
    : `${moduleLabel} is alleen-lezen. Alleen beheerders kunnen wijzigingen aanbrengen.`
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}
      role="status"
    >
      {message}
    </div>
  )
}

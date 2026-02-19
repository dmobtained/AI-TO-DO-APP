'use client'

type LockedBannerProps = {
  moduleLabel?: string
  className?: string
}

export function LockedBanner({
  moduleLabel = 'Deze module',
  className = '',
}: LockedBannerProps) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 ${className}`}
      role="status"
    >
      <strong>{moduleLabel}</strong> is alleen-lezen. Alleen beheerders kunnen wijzigingen aanbrengen.
    </div>
  )
}

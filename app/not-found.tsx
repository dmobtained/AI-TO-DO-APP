import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-datadenkt-navy">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-datadenkt-white">Pagina niet gevonden</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-datadenkt-white/70 max-w-sm">
        Deze URL bestaat niet of de link is ongeldig. Ga naar de startpagina om in te loggen, of naar het dashboard als je al ingelogd bent.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Naar startpagina (inloggen)
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-300 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-datadenkt-white hover:bg-slate-50 dark:hover:bg-white/20"
        >
          Naar dashboard
        </Link>
      </div>
    </div>
  )
}

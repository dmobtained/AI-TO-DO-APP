import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <h2 className="text-lg font-semibold text-slate-900">Pagina niet gevonden</h2>
      <p className="mt-2 text-sm text-slate-600">Deze URL bestaat niet. Open de app via de startpagina om in te loggen.</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        Naar startpagina (inloggen)
      </Link>
    </div>
  )
}

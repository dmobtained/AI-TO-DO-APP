'use client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-orange-50 to-amber-50 p-4 relative overflow-hidden">
      <div
        className="absolute w-[600px] h-[600px] bg-orange-200/30 blur-[120px] rounded-full pointer-events-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        aria-hidden
      />

      <div className="relative w-full max-w-[90%] sm:max-w-md animate-fade-in">
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl transition-all duration-300"
        >
          <h1 className="text-2xl font-semibold text-slate-900 tracking-wide text-center mb-2">
            Inloggen
          </h1>
          <p className="text-slate-500 text-sm text-center mb-8">
            Toegang tot uw dashboard
          </p>

          {error && (
            <p className="text-red-400 text-sm mb-6 text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <div className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mailadres"
                required
                autoComplete="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wachtwoord"
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-12 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100"
                aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500/20 border transition-all"
              />
              <span className="text-slate-600 text-sm group-hover:text-slate-800 transition-colors">
                Onthoud mij
              </span>
            </label>
            <a
              href="#"
              className="text-slate-500 text-sm hover:text-blue-600 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Wachtwoord vergeten?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}

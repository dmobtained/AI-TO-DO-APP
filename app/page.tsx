"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setLoading(false);
        return;
      }
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <span className="text-xl font-bold tracking-widest text-white/90">DATADENKT</span>
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2 text-center">
          Welkom terug
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Log in om toegang te krijgen tot je dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm text-slate-400 mb-2">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@email.nl"
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-slate-400 mb-2">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 focus:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              Onthoud mij
            </label>
            <a
              href="#"
              className="text-emerald-400 hover:text-emerald-300 transition"
              onClick={(e) => e.preventDefault()}
            >
              Wachtwoord vergeten?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] text-white rounded-xl font-medium transition duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}

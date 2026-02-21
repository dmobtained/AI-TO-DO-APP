"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabaseClient";

const LOGIN_TIMEOUT_MS = 20000; // 20 sec voor trage verbindingen
const SESSION_CHECK_TIMEOUT_MS = 15000; // 15 sec – Railway cold start / Supabase kan traag zijn

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const sessionCheckDone = useRef(false);


  // Eenmalige session-check bij mount: als er al een sessie is → ga naar dashboard
  useEffect(() => {
    if (sessionCheckDone.current) return;
    sessionCheckDone.current = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace("/dashboard");
        }
      } catch {
        // Negeer; gebruiker moet inloggen
      }
    };

    checkSession();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (typeof window !== "undefined") {
      const url = window.__SUPABASE_ENV__?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url || url === "https://placeholder.supabase.co") {
        setError(
          "Supabase is niet geconfigureerd. Zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local en herstart de dev-server (npm run dev)."
        );
        return;
      }
    }
    setLoading(true);

    try {
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), LOGIN_TIMEOUT_MS)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]);

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      // Sessie check met korte timeout (voorkomt hangen)
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("SESSION_TIMEOUT")), SESSION_CHECK_TIMEOUT_MS)
      );
      const {
        data: { session },
      } = await Promise.race([sessionPromise, sessionTimeout]);

      if (!session) {
        setError("Sessie kon niet worden opgehaald. Probeer het opnieuw.");
        setLoading(false);
        return;
      }

      // Korte pauze zodat cookies (SSR) worden weggeschreven
      await new Promise((r) => setTimeout(r, 200));

      // Full page navigation zodat server (middleware/layout) de cookies ziet
      window.location.href = "/dashboard";
      // loading blijft true tot pagina unloadt
    } catch (e) {
      setLoading(false);
      if (e instanceof Error && e.message === "TIMEOUT") {
        setError(
          "Inloggen duurde te lang (timeout). Controleer je internet en of je op de juiste omgeving test (lokaal: .env.local, Railway: Variables)."
        );
        return;
      }
      if (e instanceof Error && e.message === "SESSION_TIMEOUT") {
        setError("Sessie ophalen duurde te lang. Vernieuw de pagina en probeer opnieuw.");
        return;
      }
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    }
  }

  return (
    <div className="min-h-screen bg-datadenkt-navy flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto mt-32 p-8 rounded-2xl card-primary animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <span className="text-xl font-bold tracking-widest text-datadenkt-white">
            DATADENKT
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-datadenkt-white mb-2 text-center">
          Welkom terug
        </h1>
        <p className="text-datadenkt-white/70 text-center mb-8">
          Log in om toegang te krijgen tot je dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm text-datadenkt-white/70 mb-2"
            >
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
              className="w-full px-4 py-3 bg-datadenkt-navy-dark border border-white/10 rounded-xl text-datadenkt-white placeholder:text-datadenkt-white/50 focus:outline-none focus:ring-2 focus:ring-datadenkt-teal focus:border-datadenkt-teal transition-all duration-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-datadenkt-white/70 mb-2"
            >
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
              className="w-full px-4 py-3 bg-datadenkt-navy-dark border border-white/10 rounded-xl text-datadenkt-white placeholder:text-datadenkt-white/50 focus:outline-none focus:ring-2 focus:ring-datadenkt-teal focus:border-datadenkt-teal transition-all duration-200"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-datadenkt-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-datadenkt-orange rounded focus:ring-2 focus:ring-datadenkt-teal"
              />
              Onthoud mij
            </label>
            <a
              href="#"
              className="text-datadenkt-teal hover:text-datadenkt-teal/90 transition-all duration-200"
              onClick={(e) => e.preventDefault()}
            >
              Wachtwoord vergeten?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? "Bezig met inloggen…" : "Inloggen"}
          </button>
        </form>
      </div>
    </div>
  );
}

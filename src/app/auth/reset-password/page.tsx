"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Eye, EyeOff, Film } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function handleRecovery() {
      // PKCE flow: Supabase redirects with ?code= in the query string.
      // The code must be exchanged before the session is available.
      const code = new URLSearchParams(window.location.search).get("code")
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setLinkError("El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.")
        } else {
          window.history.replaceState({}, "", "/auth/reset-password")
          setIsReady(true)
        }
        return
      }

      // Implicit flow fallback: Supabase puts the token in the URL hash and
      // fires PASSWORD_RECOVERY once the client processes it.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setIsReady(true)
      })

      return () => subscription.unsubscribe()
    }

    handleRecovery()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push("/")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Film className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Nueva contraseña
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Elige una contraseña segura para tu cuenta
            </p>
          </div>

          {linkError ? (
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                <p className="text-sm text-red-600 dark:text-red-400">{linkError}</p>
              </div>
              <div className="text-center">
                <a
                  href="/auth/forgot-password"
                  className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  Solicitar nuevo enlace
                </a>
              </div>
            </div>
          ) : !isReady ? (
            <div className="text-center py-4">
              <p className="text-slate-600 dark:text-slate-400">Verificando enlace de recuperación...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 pr-14 text-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-manipulation"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 pr-14 text-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors touch-manipulation"
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-600 text-white py-4 px-6 rounded-xl text-lg font-semibold hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

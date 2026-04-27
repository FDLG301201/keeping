"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useState } from "react"
import { Film } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const redirectTo =
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
          ? `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL}/auth/reset-password`
          : `${window.location.origin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setSent(true)
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
              Recuperar contraseña
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                <p className="text-green-700 dark:text-green-400 font-medium mb-1">
                  ¡Correo enviado!
                </p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Revisa tu bandeja de entrada y sigue el enlace para restablecer tu contraseña.
                </p>
              </div>
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-base font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 text-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors text-slate-900 dark:text-white placeholder-slate-400"
                />
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
                {isLoading ? "Enviando..." : "Enviar enlace"}
              </button>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

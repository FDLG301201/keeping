import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Cuenta Creada!</h1>
          <p className="text-gray-600 mb-6">
            Hemos enviado un enlace de confirmación a tu email. Por favor, revisa tu bandeja de entrada y haz clic en el
            enlace para activar tu cuenta.
          </p>

          <Link
            href="/auth/login"
            className="inline-block bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    </div>
  )
}

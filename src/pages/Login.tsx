import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { sesion, cargando } = useAuth()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Si ya hay sesión, no tiene sentido mostrar el login.
  if (!cargando && sesion) return <Navigate to="/" replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    setEnviando(false)
    if (error) setError('Correo o contraseña incorrectos.')
    // Si salió bien, AuthProvider detecta la sesión y la línea de arriba redirige.
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-bold">KeraStock</h1>
        <p className="mt-1 text-sm text-stone-600">Inicia sesión para ver el inventario.</p>

        <label htmlFor="email" className="mt-6 block text-sm font-medium">
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-2 focus:outline-stone-800"
        />

        <label htmlFor="clave" className="mt-4 block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="clave"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-2 focus:outline-stone-800"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          disabled={enviando}
          className="mt-6 w-full rounded-lg bg-stone-800 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

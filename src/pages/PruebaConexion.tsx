import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { formatoLitros } from '../lib/formato'
import type { FilaStock } from '../lib/tipos'

// Pantalla TEMPORAL (fases 1 y 2): comprueba que la app habla con Supabase.
// En la fase 3 se reemplaza por el login real y el dashboard.
export default function PruebaConexion() {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [filas, setFilas] = useState<FilaStock[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Escucha si hay sesión iniciada (y sus cambios).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Cada vez que cambia la sesión, vuelve a pedir el stock.
  useEffect(() => {
    setCargando(true)
    supabase
      .from('stock_actual')
      .select('*')
      .order('producto')
      .order('formula')
      .then(({ data, error }) => {
        setError(error ? error.message : null)
        setFilas((data as FilaStock[]) ?? [])
        setCargando(false)
      })
  }, [sesion])

  const total = filas.reduce((suma, f) => suma + Number(f.stock), 0)

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">KeraStock</h1>
      <p className="mt-1 text-sm text-stone-600">Prueba de conexión con Supabase</p>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        {error ? (
          <p className="text-red-700">❌ Error al conectar: {error}</p>
        ) : cargando ? (
          <p>Conectando…</p>
        ) : (
          <p className="text-emerald-700">
            ✅ Conectado a Supabase · {sesion ? `sesión de ${sesion.user.email}` : 'sin sesión'} ·{' '}
            {filas.length} variantes visibles
          </p>
        )}
        {!cargando && !error && !sesion && filas.length === 0 && (
          <p className="mt-2 text-sm text-stone-600">
            Sin sesión no se ve nada: es lo correcto, la seguridad (RLS) está funcionando. Inicia
            sesión abajo para ver el stock.
          </p>
        )}
        {!cargando && !sesion && filas.length > 0 && (
          <p className="mt-2 text-sm text-amber-700">
            ⚠️ Se ve el stock sin iniciar sesión. Corre el SQL de supabase/migraciones/001 para
            cerrarlo.
          </p>
        )}
      </section>

      {sesion ? (
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 text-sm text-stone-600 underline"
        >
          Cerrar sesión
        </button>
      ) : (
        <FormularioLogin />
      )}

      {filas.length > 0 && (
        <table className="mt-6 w-full overflow-hidden rounded-xl bg-white text-left text-sm shadow-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3">Fórmula</th>
              <th className="p-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.variante_id} className="border-t border-stone-100">
                <td className="p-3">{f.producto}</td>
                <td className="p-3">{f.formula}</td>
                <td className="p-3 text-right">
                  {formatoLitros(f.stock)}
                  {f.stock_bajo && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      bajo
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200 font-semibold">
              <td className="p-3" colSpan={2}>
                Total
              </td>
              <td className="p-3 text-right">{formatoLitros(total)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </main>
  )
}

function FormularioLogin() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setMensaje(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) setMensaje('No se pudo entrar: revisa el correo y la contraseña.')
  }

  return (
    <form onSubmit={entrar} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="email">Correo</label>
      <input
        id="email"
        type="email"
        required
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-stone-300 px-3 py-2"
      />
      <label className="sr-only" htmlFor="clave">Contraseña</label>
      <input
        id="clave"
        type="password"
        required
        placeholder="Contraseña"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
        className="flex-1 rounded-lg border border-stone-300 px-3 py-2"
      />
      <button className="rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700">
        Entrar
      </button>
      {mensaje && <p className="text-sm text-red-700 sm:basis-full">{mensaje}</p>}
    </form>
  )
}

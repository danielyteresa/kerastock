import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatoLitros } from '../lib/formato'
import type { FilaStock } from '../lib/tipos'

// Por ahora: el stock actual. En la fase 6 se suman KPIs, alertas y últimos movimientos.
export default function Dashboard() {
  const [filas, setFilas] = useState<FilaStock[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  const total = filas.reduce((suma, f) => suma + Number(f.stock), 0)
  const bajos = filas.filter((f) => f.stock_bajo).length

  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tarjeta titulo="Stock total" valor={formatoLitros(total)} />
        <Tarjeta titulo="Variantes" valor={String(filas.length)} />
        <Tarjeta titulo="Stock bajo" valor={String(bajos)} alerta={bajos > 0} />
      </div>

      {error && <p className="mt-6 text-red-700">No se pudo cargar el stock: {error}</p>}
      {cargando && <p className="mt-6 text-stone-600">Cargando stock…</p>}

      {!cargando && filas.length > 0 && (
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
                <td className="p-3 text-right whitespace-nowrap">
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
        </table>
      )}
    </>
  )
}

function Tarjeta({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${alerta ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'}`}
    >
      <p className="text-sm text-stone-600">{titulo}</p>
      <p className="mt-1 text-2xl font-bold">{valor}</p>
    </div>
  )
}

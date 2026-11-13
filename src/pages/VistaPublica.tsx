import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { formatoLitros } from '../lib/formato'

type FilaPublica = {
  producto: string
  formula: string
  unidad: string
  stock: number
  stock_bajo: boolean
}

// Página SIN login: se abre con /publico/<código>. Solo muestra stock.
// Los datos vienen de la función stock_publico de Supabase, que revisa el código.
export default function VistaPublica() {
  const { token = '' } = useParams()
  const [filas, setFilas] = useState<FilaPublica[] | null>(null)
  const [error, setError] = useState(false)
  const [actualizado, setActualizado] = useState<Date | null>(null)

  useEffect(() => {
    function cargar() {
      supabase.rpc('stock_publico', { p_token: token }).then(({ data, error }) => {
        if (error) {
          setError(true)
          return
        }
        setFilas((data as FilaPublica[]).map((f) => ({ ...f, stock: Number(f.stock) })))
        setActualizado(new Date())
      })
    }
    cargar()
    // Se refresca solo cada minuto, por si la dejan abierta.
    const intervalo = setInterval(cargar, 60_000)
    return () => clearInterval(intervalo)
  }, [token])

  const total = filas?.reduce((s, f) => s + f.stock, 0) ?? 0

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">KeraStock</h1>
      <p className="mt-1 text-sm text-stone-600">Stock actual · solo lectura</p>

      {error && <p className="mt-6 text-red-700">No se pudo cargar el stock. Intenta de nuevo más tarde.</p>}
      {!error && filas === null && <p className="mt-6 text-stone-600">Cargando…</p>}
      {!error && filas?.length === 0 && (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-4 text-stone-700">
          Este enlace no es válido o fue desactivado. Pide uno nuevo a quien te lo compartió.
        </p>
      )}

      {filas && filas.length > 0 && (
        <>
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
                <tr key={`${f.producto}-${f.formula}`} className="border-t border-stone-100">
                  <td className="p-3">{f.producto}</td>
                  <td className="p-3">{f.formula}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {formatoLitros(f.stock)}
                    {f.stock_bajo && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">bajo</span>
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
          {actualizado && (
            <p className="mt-3 text-xs text-stone-500">
              Actualizado a las {actualizado.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} · se
              refresca cada minuto
            </p>
          )}
        </>
      )}
    </main>
  )
}

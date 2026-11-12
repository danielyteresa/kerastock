import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import { alertasStockBajo, aplanar, type FilaVariante } from '../lib/reportes'
import { formatoLitros } from '../lib/formato'

export default function Alertas() {
  const { esAdmin } = useAuth()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarCatalogo()
      .then(setProductos)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [])

  const filas = useMemo(() => aplanar(productos), [productos])
  const bajas = alertasStockBajo(filas)
  // "Cerca": todavía sobre el mínimo, pero a menos de 1 L (o 50 %) de llegar.
  const cerca = filas
    .filter((f) => !f.stockBajo && f.stock - f.stockMinimo <= Math.max(1, f.stockMinimo * 0.5))
    .sort((a, b) => a.stock - a.stockMinimo - (b.stock - b.stockMinimo))

  if (cargando) return <p className="text-stone-600">Cargando…</p>
  if (error) return <p className="text-red-700">{error}</p>

  return (
    <>
      <h1 className="text-2xl font-bold">Alertas</h1>
      <p className="mt-1 text-sm text-stone-600">
        Una variante entra en alerta cuando su stock es igual o menor que su mínimo.
      </p>

      <Seccion
        titulo="Stock bajo"
        icono="⚠️"
        vacio="✅ Ninguna variante está bajo el mínimo."
        filas={bajas}
        esAdmin={esAdmin}
        estilo="border-amber-300 bg-amber-50"
      />
      <Seccion
        titulo="Cerca del mínimo"
        icono="🔸"
        vacio="Nada cerca del mínimo."
        filas={cerca}
        esAdmin={esAdmin}
        estilo="border-stone-200 bg-white"
      />

      <p className="mt-8 text-xs text-stone-500">
        La caducidad por lote queda para una versión futura (tu base de datos todavía no tiene lotes).
      </p>
    </>
  )
}

function Seccion(props: {
  titulo: string
  icono: string
  vacio: string
  filas: FilaVariante[]
  esAdmin: boolean
  estilo: string
}) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">
        {props.titulo} <span className="text-stone-500">({props.filas.length})</span>
      </h2>
      {props.filas.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">{props.vacio}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.filas.map((f) => (
            <li key={f.varianteId} className={`rounded-xl border p-4 ${props.estilo}`}>
              <p className="font-medium">
                <span aria-hidden="true">{props.icono} </span>
                {f.nombre}
              </p>
              <p className="mt-1 text-sm text-stone-700">
                Hay <strong>{formatoLitros(f.stock)}</strong> · mínimo {formatoLitros(f.stockMinimo)}
              </p>
              {props.esAdmin && (
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <Link
                    to={`/movimientos?variante=${f.varianteId}&tipo=entrada`}
                    className="rounded-lg bg-stone-800 px-3 py-1.5 font-medium text-white hover:bg-stone-700"
                  >
                    Reponer
                  </Link>
                  <Link
                    to={`/productos/${f.productoId}`}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:bg-stone-50"
                  >
                    Cambiar mínimo
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

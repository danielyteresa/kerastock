import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import GraficoStock from '../components/GraficoStock'
import ListaMovimientos from '../components/ListaMovimientos'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import { cargarHistorial, cargarNombres, type Movimiento } from '../lib/movimientos'
import { alertasStockBajo, aplanar } from '../lib/reportes'
import { formatoCLP, formatoLitros } from '../lib/formato'

export default function Dashboard() {
  const { esAdmin } = useAuth()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [ultimos, setUltimos] = useState<Movimiento[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Las tres consultas van en paralelo.
  useEffect(() => {
    Promise.all([
      cargarCatalogo(),
      cargarHistorial({ tipo: 'todos', varianteIds: null, desde: '', hasta: '' }, 5),
      cargarNombres(),
    ])
      .then(([p, u, n]) => {
        setProductos(p)
        setUltimos(u)
        setNombres(n)
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [])

  const filas = useMemo(() => aplanar(productos), [productos])
  const alertas = alertasStockBajo(filas)
  const totalLitros = filas.reduce((s, f) => s + f.stock, 0)
  const valorVenta = filas.reduce((s, f) => s + f.valorVenta, 0)
  const valorCosto = filas.reduce((s, f) => s + f.valorCosto, 0)
  const sinPrecio = filas.filter((f) => f.precio === 0).length

  const nombreVariante = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const p of productos) for (const v of p.variante) mapa[v.id] = `${p.nombre} · ${v.formula}`
    return mapa
  }, [productos])

  if (cargando) return <p className="text-stone-600">Cargando…</p>
  if (error) return <p className="text-red-700">No se pudo cargar el inventario: {error}</p>

  return (
    <>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPIs */}
      <div className={`mt-6 grid grid-cols-2 gap-3 ${esAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Tarjeta titulo="Stock total" valor={formatoLitros(totalLitros)} detalle={`${filas.length} variantes activas`} />
        <Tarjeta
          titulo="Valor a precio de venta"
          valor={valorVenta > 0 ? formatoCLP(valorVenta) : '—'}
          detalle={sinPrecio > 0 ? `${sinPrecio} variantes sin precio` : 'stock × precio'}
        />
        {esAdmin && (
          <Tarjeta
            titulo="Valor a costo"
            valor={valorCosto > 0 ? formatoCLP(valorCosto) : '—'}
            detalle="lo que invertiste en el stock"
          />
        )}
        <Tarjeta
          titulo="Alertas"
          valor={String(alertas.length)}
          detalle={alertas.length ? 'variantes con stock bajo' : 'todo en orden'}
          alerta={alertas.length > 0}
          enlace="/alertas"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[3fr_2fr]">
        <GraficoStock filas={filas} />

        {/* Alertas */}
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Stock bajo</h2>
            <Link to="/alertas" className="text-sm text-stone-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          {alertas.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">✅ Ninguna variante bajo el mínimo.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {alertas.slice(0, 5).map((a) => (
                <li key={a.varianteId} className="flex items-center justify-between gap-2">
                  <span>
                    <span aria-hidden="true">⚠️ </span>
                    {a.nombre}
                  </span>
                  <span className="whitespace-nowrap text-stone-600">
                    {formatoLitros(a.stock)} / mín. {formatoLitros(a.stockMinimo)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Últimos movimientos</h2>
        <Link to="/movimientos" className="text-sm text-stone-600 hover:underline">
          Ver historial →
        </Link>
      </div>
      <div className="mt-3">
        {ultimos.length ? (
          <ListaMovimientos movimientos={ultimos} nombreVariante={nombreVariante} nombres={nombres} />
        ) : (
          <p className="text-sm text-stone-600">Todavía no hay movimientos.</p>
        )}
      </div>
    </>
  )
}

function Tarjeta(props: { titulo: string; valor: string; detalle?: string; alerta?: boolean; enlace?: string }) {
  const contenido = (
    <>
      <p className="text-sm text-stone-600">{props.titulo}</p>
      <p className="mt-1 text-2xl font-bold">{props.valor}</p>
      {props.detalle && <p className="mt-0.5 text-xs text-stone-500">{props.detalle}</p>}
    </>
  )
  const clases = `block rounded-xl border p-4 ${props.alerta ? 'border-amber-300 bg-amber-50' : 'border-stone-200 bg-white'}`
  return props.enlace ? (
    <Link to={props.enlace} className={`${clases} hover:shadow-sm`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  )
}

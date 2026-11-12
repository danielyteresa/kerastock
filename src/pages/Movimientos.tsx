import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import FormMovimiento from '../components/FormMovimiento'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import {
  cargarHistorial,
  cargarNombres,
  type FiltrosHistorial,
  type Movimiento,
  type TipoMovimiento,
} from '../lib/movimientos'
import { formatoLitros } from '../lib/formato'

const fechaHora = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' })

const ETIQUETA: Record<TipoMovimiento, string> = {
  entrada: 'bg-emerald-100 text-emerald-800',
  salida: 'bg-red-100 text-red-800',
  ajuste: 'bg-sky-100 text-sky-800',
}

export default function Movimientos() {
  const { esAdmin } = useAuth()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Se incrementa después de registrar un movimiento para recargar todo.
  const [version, setVersion] = useState(0)

  // Filtros del historial
  const [tipo, setTipo] = useState<FiltrosHistorial['tipo']>('todos')
  const [productoId, setProductoId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // Catálogo (para el formulario y para poner nombre a cada movimiento) y nombres de usuarios.
  useEffect(() => {
    cargarCatalogo().then(setProductos).catch((e) => setError(mensajeError(e)))
    cargarNombres().then(setNombres)
  }, [version])

  // variante_id → "Keratina chocolate · 06"
  const nombreVariante = useMemo(() => {
    const mapa: Record<string, string> = {}
    for (const p of productos) for (const v of p.variante) mapa[v.id] = `${p.nombre} · ${v.formula}`
    return mapa
  }, [productos])

  // Historial: se vuelve a pedir cuando cambia un filtro o se registra algo.
  useEffect(() => {
    const producto = productos.find((p) => p.id === productoId)
    if (productoId && !producto) return // espera a que cargue el catálogo
    setCargando(true)
    cargarHistorial({
      tipo,
      varianteIds: producto ? producto.variante.map((v) => v.id) : null,
      desde,
      hasta,
    })
      .then((h) => {
        setHistorial(h)
        setError(null)
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [tipo, productoId, desde, hasta, productos])

  const campo = 'rounded-lg border border-stone-300 bg-white px-3 py-2'

  return (
    <>
      <h1 className="text-2xl font-bold">Movimientos</h1>

      {esAdmin && (
        <div className="mt-6 max-w-3xl">
          <FormMovimiento productos={productos} onRegistrado={() => setVersion((v) => v + 1)} />
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold">Historial</h2>

      {/* Filtros */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as FiltrosHistorial['tipo'])} className={campo}>
            <option value="todos">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
            <option value="ajuste">Ajustes</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Producto</span>
          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </label>
      </div>

      {error && <p className="mt-4 text-red-700">{error}</p>}
      {cargando && <p className="mt-4 text-stone-600">Cargando historial…</p>}
      {!cargando && historial.length === 0 && (
        <p className="mt-4 text-stone-600">No hay movimientos con esos filtros.</p>
      )}

      {/* Lista: tarjetas en móvil, filas en escritorio */}
      {historial.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm">
          {historial.map((m) => (
            <li key={m.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 p-3 text-sm sm:grid-cols-[9rem_1fr_auto]">
              <span className="text-xs text-stone-500 sm:order-none sm:text-sm">
                {fechaHora.format(new Date(m.fecha))}
              </span>
              <span
                className={`row-span-2 self-center text-right font-semibold whitespace-nowrap sm:order-last sm:row-span-1 ${
                  m.cantidad < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {m.cantidad > 0 ? '+' : '−'}
                {formatoLitros(Math.abs(m.cantidad))}
              </span>
              <span>
                <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${ETIQUETA[m.tipo]}`}>{m.tipo}</span>
                <span className="font-medium">{nombreVariante[m.variante_id] ?? '—'}</span>
                <span className="text-stone-500">
                  {m.motivo && ` · ${m.motivo}`}
                  {' · '}
                  {m.usuario_id ? (nombres[m.usuario_id] ?? 'usuario') : 'carga inicial'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {historial.length === 200 && (
        <p className="mt-2 text-xs text-stone-500">Se muestran los 200 más recientes. Usa los filtros para ver otros.</p>
      )}
    </>
  )
}

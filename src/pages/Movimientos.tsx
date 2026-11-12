import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import FormMovimiento from '../components/FormMovimiento'
import ListaMovimientos from '../components/ListaMovimientos'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import {
  cargarHistorial,
  cargarNombres,
  type FiltrosHistorial,
  type Movimiento,
} from '../lib/movimientos'

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

      {historial.length > 0 && (
        <div className="mt-4">
          <ListaMovimientos movimientos={historial} nombreVariante={nombreVariante} nombres={nombres} />
        </div>
      )}
      {historial.length === 200 && (
        <p className="mt-2 text-xs text-stone-500">Se muestran los 200 más recientes. Usa los filtros para ver otros.</p>
      )}
    </>
  )
}

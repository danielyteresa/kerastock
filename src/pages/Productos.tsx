import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import { formatoCLP, formatoLitros } from '../lib/formato'

type FiltroEstado = 'activo' | 'archivado' | 'todos'

export default function Productos() {
  const { esAdmin } = useAuth()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('activo')
  const [formula, setFormula] = useState('todas')
  const [soloBajo, setSoloBajo] = useState(false)

  useEffect(() => {
    cargarCatalogo()
      .then(setProductos)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [])

  // Fórmulas que existen (para el selector), sin repetir.
  const formulas = useMemo(
    () => [...new Set(productos.flatMap((p) => p.variante.map((v) => v.formula)))].sort(),
    [productos],
  )

  // Aplica los filtros. Se recalcula solo cuando algo cambia.
  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => estado === 'todos' || p.estado === estado)
      .map((p) => ({
        ...p,
        variante: p.variante.filter(
          (v) =>
            (formula === 'todas' || v.formula === formula) &&
            (!soloBajo || p.stock[v.id]?.stock_bajo),
        ),
      }))
      .filter((p) => p.variante.length > 0 || (formula === 'todas' && !soloBajo))
      .filter(
        (p) =>
          !texto ||
          p.nombre.toLowerCase().includes(texto) ||
          p.variante.some((v) => v.sku?.toLowerCase().includes(texto)),
      )
  }, [productos, busqueda, estado, formula, soloBajo])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Productos</h1>
        {esAdmin && (
          <Link
            to="/productos/nuevo"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            + Nuevo producto
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Buscar</span>
          <input
            type="search"
            placeholder="Nombre o SKU"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Estado</span>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as FiltroEstado)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          >
            <option value="activo">Activos</option>
            <option value="archivado">Archivados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-stone-600">Fórmula</span>
          <select
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2"
          >
            <option value="todas">Todas</option>
            {formulas.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end py-2 text-sm">
          <input
            type="checkbox"
            checked={soloBajo}
            onChange={(e) => setSoloBajo(e.target.checked)}
            className="size-4"
          />
          Solo stock bajo
        </label>
      </div>

      {error && <p className="mt-6 text-red-700">No se pudo cargar el catálogo: {error}</p>}
      {cargando && <p className="mt-6 text-stone-600">Cargando productos…</p>}
      {!cargando && !error && visibles.length === 0 && (
        <p className="mt-6 text-stone-600">No hay productos con esos filtros.</p>
      )}

      {/* Una tarjeta por producto: se ve bien en móvil y en escritorio */}
      <ul className="mt-6 grid gap-4 lg:grid-cols-2">
        {visibles.map((p) => (
          <li key={p.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{p.nombre}</h2>
                <p className="text-xs text-stone-500">
                  {p.categoria ?? 'Sin categoría'}
                  {p.estado === 'archivado' && ' · Archivado'}
                </p>
              </div>
              {esAdmin && (
                <Link
                  to={`/productos/${p.id}`}
                  className="shrink-0 rounded-lg border border-stone-300 px-3 py-1 text-sm hover:bg-stone-50"
                >
                  Editar
                </Link>
              )}
            </div>

            {p.variante.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Sin variantes.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th className="py-1 font-normal">Fórmula</th>
                    <th className="py-1 font-normal">SKU</th>
                    <th className="py-1 text-right font-normal">Precio</th>
                    <th className="py-1 text-right font-normal">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {p.variante.map((v) => {
                    const s = p.stock[v.id]
                    return (
                      <tr key={v.id} className="border-t border-stone-100">
                        <td className="py-1.5">{v.formula}</td>
                        <td className="py-1.5 text-xs text-stone-500">{v.sku ?? '—'}</td>
                        <td className="py-1.5 text-right">
                          {v.precio > 0 ? formatoCLP(v.precio) : <span className="text-stone-400">—</span>}
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          {formatoLitros(s?.stock ?? 0)}
                          {s?.stock_bajo && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-800">
                              bajo
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

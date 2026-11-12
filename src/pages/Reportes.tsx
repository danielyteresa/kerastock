import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { cargarCatalogo, mensajeError, type ProductoConStock } from '../lib/catalogo'
import { cargarHistorial, cargarNombres, type Movimiento } from '../lib/movimientos'
import { aplanar, descargarCSV, salidasPorVariante } from '../lib/reportes'
import { formatoCLP, formatoLitros } from '../lib/formato'

const PERIODOS = [
  { dias: 7, texto: 'Últimos 7 días' },
  { dias: 30, texto: 'Últimos 30 días' },
  { dias: 90, texto: 'Últimos 90 días' },
  { dias: 0, texto: 'Desde el inicio' },
]

const hoy = () => new Date().toISOString().slice(0, 10)

/** Fecha 'AAAA-MM-DD' de hace N días (en hora local). */
function haceDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reportes() {
  const { esAdmin } = useAuth()
  const [productos, setProductos] = useState<ProductoConStock[]>([])
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [dias, setDias] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    cargarCatalogo().then(setProductos).catch((e) => setError(mensajeError(e)))
    cargarNombres().then(setNombres)
  }, [])

  // Movimientos del periodo elegido (hasta 5.000; de sobra para una tienda pequeña).
  useEffect(() => {
    cargarHistorial({ tipo: 'todos', varianteIds: null, desde: dias ? haceDias(dias) : '', hasta: '' }, 5000)
      .then(setMovs)
      .catch((e) => setError(mensajeError(e)))
  }, [dias])

  const filas = useMemo(() => aplanar(productos), [productos])
  const nombreVariante = useMemo(() => Object.fromEntries(filas.map((f) => [f.varianteId, f.nombre])), [filas])

  // Reporte 2: salidas por variante en el periodo, de más a menos.
  const salidas = useMemo(() => {
    const total = salidasPorVariante(movs)
    return filas
      .map((f) => ({ ...f, salido: total.get(f.varianteId) ?? 0 }))
      .filter((f) => f.salido > 0)
      .sort((a, b) => b.salido - a.salido)
  }, [movs, filas])

  const totalVenta = filas.reduce((s, f) => s + f.valorVenta, 0)
  const totalCosto = filas.reduce((s, f) => s + f.valorCosto, 0)
  const textoPeriodo = PERIODOS.find((p) => p.dias === dias)?.texto.toLowerCase()

  function exportarValor() {
    const enc = ['Producto', 'Fórmula', 'SKU', 'Stock (L)', 'Precio', 'Valor venta']
    if (esAdmin) enc.push('Costo', 'Valor costo')
    descargarCSV(
      `kerastock-valor-${hoy()}.csv`,
      enc,
      filas.map((f) => {
        const fila: (string | number)[] = [f.producto, f.formula, f.sku ?? '', f.stock, f.precio, f.valorVenta]
        if (esAdmin) fila.push(f.costo, f.valorCosto)
        return fila
      }),
    )
  }

  function exportarSalidas() {
    descargarCSV(
      `kerastock-salidas-${dias || 'todo'}d-${hoy()}.csv`,
      ['Producto', 'Fórmula', 'SKU', 'Litros salidos', 'Stock actual'],
      salidas.map((f) => [f.producto, f.formula, f.sku ?? '', f.salido, f.stock]),
    )
  }

  function exportarMovimientos() {
    descargarCSV(
      `kerastock-movimientos-${dias || 'todo'}d-${hoy()}.csv`,
      ['Fecha', 'Tipo', 'Producto', 'Cantidad (L)', 'Motivo', 'Usuario'],
      movs.map((m) => [
        new Date(m.fecha).toLocaleString('es-CL'),
        m.tipo,
        nombreVariante[m.variante_id] ?? '',
        m.cantidad,
        m.motivo ?? '',
        m.usuario_id ? (nombres[m.usuario_id] ?? '') : 'carga inicial',
      ]),
    )
  }

  const boton = 'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50'

  return (
    <>
      <h1 className="text-2xl font-bold">Reportes</h1>
      {error && <p className="mt-4 text-red-700">{error}</p>}

      {/* 1. Valor del inventario */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Valor del inventario</h2>
          <button onClick={exportarValor} className={boton}>
            Exportar CSV
          </button>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="p-3">Variante</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 text-right">Valor venta</th>
                {esAdmin && <th className="p-3 text-right">Valor costo</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.varianteId} className="border-t border-stone-100">
                  <td className="p-3">{f.nombre}</td>
                  <td className="p-3 text-right">{formatoLitros(f.stock)}</td>
                  <td className="p-3 text-right">{f.precio ? formatoCLP(f.precio) : '—'}</td>
                  <td className="p-3 text-right">{f.precio ? formatoCLP(f.valorVenta) : '—'}</td>
                  {esAdmin && <td className="p-3 text-right">{f.costo ? formatoCLP(f.valorCosto) : '—'}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-stone-200 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right">{formatoLitros(filas.reduce((s, f) => s + f.stock, 0))}</td>
                <td />
                <td className="p-3 text-right">{formatoCLP(totalVenta)}</td>
                {esAdmin && <td className="p-3 text-right">{formatoCLP(totalCosto)}</td>}
              </tr>
            </tfoot>
          </table>
        </div>
        {filas.some((f) => !f.precio) && (
          <p className="mt-2 text-xs text-stone-500">Las variantes con "—" no tienen precio todavía: agrégalo en Productos.</p>
        )}
      </section>

      {/* 2. Lo que más sale */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Lo que más sale</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="periodo">
              Periodo
            </label>
            <select
              id="periodo"
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {PERIODOS.map((p) => (
                <option key={p.dias} value={p.dias}>
                  {p.texto}
                </option>
              ))}
            </select>
            <button onClick={exportarSalidas} className={boton}>
              Exportar CSV
            </button>
          </div>
        </div>
        {salidas.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">No hubo salidas en {textoPeriodo}.</p>
        ) : (
          <ol className="mt-3 divide-y divide-stone-100 rounded-xl bg-white shadow-sm">
            {salidas.map((f, i) => (
              <li key={f.varianteId} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span>
                  <span className="mr-2 text-stone-400">{i + 1}.</span>
                  {f.nombre}
                </span>
                <span className="font-semibold whitespace-nowrap">{formatoLitros(f.salido)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 3. Respaldo de movimientos */}
      <section className="mt-10 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">Historial de movimientos</h2>
        <p className="mt-1 text-sm text-stone-600">
          {movs.length} movimientos en {textoPeriodo}. Descárgalos para tenerlos en Excel o como respaldo.
        </p>
        <button onClick={exportarMovimientos} className={`${boton} mt-3`}>
          Exportar CSV
        </button>
      </section>
    </>
  )
}

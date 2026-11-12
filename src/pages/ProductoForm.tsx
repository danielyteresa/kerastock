import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import {
  cargarProducto,
  guardarProducto,
  mensajeError,
  type DatosProducto,
  type DatosVariante,
} from '../lib/catalogo'
import { formatoCLP } from '../lib/formato'

// En el formulario los números se guardan como texto (así el campo puede quedar vacío
// mientras escribes) y se convierten al guardar.
type VarianteForm = {
  clave: string // identificador local para React
  id?: string
  formula: string
  sku: string
  unidad: string
  precio: string
  costo: string
  stock_minimo: string
  stock_inicial: string
}

let contador = 0
const nuevaVariante = (): VarianteForm => ({
  clave: `nueva-${++contador}`,
  formula: '',
  sku: '',
  unidad: 'litro',
  precio: '',
  costo: '',
  stock_minimo: '2',
  stock_inicial: '0',
})

const num = (texto: string) => (texto.trim() === '' ? 0 : Number(texto.replace(',', '.')))

export default function ProductoForm() {
  const { id } = useParams() // undefined en /productos/nuevo
  const esNuevo = !id
  const navegar = useNavigate()
  const { sesion } = useAuth()

  const [datos, setDatos] = useState<DatosProducto>({
    nombre: '',
    categoria: 'Keratina',
    descripcion: '',
    estado: 'activo',
  })
  const [variantes, setVariantes] = useState<VarianteForm[]>(() => [nuevaVariante()])
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al editar, trae el producto de Supabase y llena el formulario.
  useEffect(() => {
    if (!id) return
    cargarProducto(id)
      .then((p) => {
        if (!p) {
          setError('Ese producto no existe.')
          return
        }
        setDatos({
          nombre: p.nombre,
          categoria: p.categoria ?? '',
          descripcion: p.descripcion ?? '',
          estado: p.estado,
        })
        setVariantes(
          p.variante.map((v) => ({
            clave: v.id,
            id: v.id,
            formula: v.formula,
            sku: v.sku ?? '',
            unidad: v.unidad,
            precio: String(v.precio ?? ''),
            costo: String(v.costo ?? ''),
            stock_minimo: String(v.stock_minimo),
            stock_inicial: '0',
          })),
        )
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [id])

  function cambiarVariante(clave: string, campo: keyof VarianteForm, valor: string) {
    setVariantes((vs) => vs.map((v) => (v.clave === clave ? { ...v, [campo]: valor } : v)))
  }

  function validar(): string | null {
    if (!datos.nombre.trim()) return 'El producto necesita un nombre.'
    if (variantes.length === 0) return 'Agrega al menos una variante.'
    const skus = new Set<string>()
    for (const v of variantes) {
      if (!v.formula.trim()) return 'Cada variante necesita su fórmula (ej. 04 o 06).'
      for (const campo of ['precio', 'costo', 'stock_minimo', 'stock_inicial'] as const) {
        const n = num(v[campo])
        if (Number.isNaN(n) || n < 0) return `Revisa los números de la fórmula ${v.formula}: no pueden ser negativos.`
      }
      const sku = v.sku.trim().toUpperCase()
      if (sku) {
        if (skus.has(sku)) return `El SKU ${sku} está repetido.`
        skus.add(sku)
      }
    }
    return null
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    if (!sesion) return
    setGuardando(true)
    setError(null)
    try {
      const filas: DatosVariante[] = variantes.map((v) => ({
        id: v.id,
        formula: v.formula,
        sku: v.sku,
        unidad: v.unidad,
        precio: num(v.precio),
        costo: num(v.costo),
        stock_minimo: num(v.stock_minimo),
        stock_inicial: num(v.stock_inicial),
      }))
      await guardarProducto(id ?? null, datos, filas, sesion.user.id)
      navegar('/productos')
    } catch (e) {
      setError(mensajeError(e))
      setGuardando(false)
    }
  }

  if (cargando) return <p className="text-stone-600">Cargando producto…</p>

  const campo = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2'

  return (
    <form onSubmit={guardar} className="max-w-3xl">
      <Link to="/productos" className="text-sm text-stone-600 hover:underline">
        ← Volver a productos
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{esNuevo ? 'Nuevo producto' : 'Editar producto'}</h1>

      {/* Datos generales */}
      <fieldset className="mt-6 grid gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Datos generales</legend>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block">Nombre *</span>
          <input
            required
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            placeholder="Keratina chocolate"
            className={campo}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Categoría</span>
          <input
            value={datos.categoria}
            onChange={(e) => setDatos({ ...datos, categoria: e.target.value })}
            className={campo}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block">Estado</span>
          <select
            value={datos.estado}
            onChange={(e) => setDatos({ ...datos, estado: e.target.value as DatosProducto['estado'] })}
            className={campo}
          >
            <option value="activo">Activo</option>
            <option value="archivado">Archivado (se oculta, no se borra)</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block">Descripción</span>
          <textarea
            rows={2}
            value={datos.descripcion}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            className={campo}
          />
        </label>
      </fieldset>

      {/* Variantes */}
      <h2 className="mt-8 text-lg font-semibold">Variantes</h2>
      <p className="text-sm text-stone-600">
        Cada fórmula es una variante. Precios en pesos chilenos, sin decimales.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {variantes.map((v) => {
          const precio = num(v.precio)
          const costo = num(v.costo)
          const margen = precio > 0 && costo > 0 ? Math.round(((precio - costo) / precio) * 100) : null
          return (
            <fieldset
              key={v.clave}
              className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-4"
            >
              <legend className="px-1 text-sm font-semibold">
                {v.id ? `Fórmula ${v.formula}` : 'Variante nueva'}
              </legend>
              <label className="text-sm">
                <span className="mb-1 block">Fórmula *</span>
                <input
                  required
                  value={v.formula}
                  onChange={(e) => cambiarVariante(v.clave, 'formula', e.target.value)}
                  placeholder="06"
                  className={campo}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">SKU</span>
                <input
                  value={v.sku}
                  onChange={(e) => cambiarVariante(v.clave, 'sku', e.target.value)}
                  placeholder="KER-CHOC-06"
                  className={`${campo} uppercase`}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Precio venta (CLP)</span>
                <input
                  inputMode="numeric"
                  value={v.precio}
                  onChange={(e) => cambiarVariante(v.clave, 'precio', e.target.value)}
                  placeholder="0"
                  className={campo}
                />
                {precio > 0 && <span className="text-xs text-stone-500">{formatoCLP(precio)} / {v.unidad}</span>}
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Costo (CLP)</span>
                <input
                  inputMode="numeric"
                  value={v.costo}
                  onChange={(e) => cambiarVariante(v.clave, 'costo', e.target.value)}
                  placeholder="0"
                  className={campo}
                />
                {margen !== null && (
                  <span className={`text-xs ${margen < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    Margen {margen}%
                  </span>
                )}
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Unidad</span>
                <input
                  value={v.unidad}
                  onChange={(e) => cambiarVariante(v.clave, 'unidad', e.target.value)}
                  className={campo}
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block">Stock mínimo</span>
                <input
                  inputMode="decimal"
                  value={v.stock_minimo}
                  onChange={(e) => cambiarVariante(v.clave, 'stock_minimo', e.target.value)}
                  className={campo}
                />
              </label>
              {!v.id && (
                <>
                  <label className="text-sm">
                    <span className="mb-1 block">Stock inicial</span>
                    <input
                      inputMode="decimal"
                      value={v.stock_inicial}
                      onChange={(e) => cambiarVariante(v.clave, 'stock_inicial', e.target.value)}
                      className={campo}
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setVariantes((vs) => vs.filter((x) => x.clave !== v.clave))}
                      className="py-2 text-sm text-red-700 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </>
              )}
            </fieldset>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setVariantes((vs) => [...vs, nuevaVariante()])}
        className="mt-3 rounded-lg border border-dashed border-stone-400 px-4 py-2 text-sm hover:bg-white"
      >
        + Agregar variante
      </button>

      {!esNuevo && (
        <p className="mt-3 text-xs text-stone-500">
          El stock de las variantes que ya existen se cambia en Movimientos (fase 5), no aquí: así
          queda registro de cada cambio.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          disabled={guardando}
          className="rounded-lg bg-stone-800 px-5 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <Link to="/productos" className="rounded-lg px-5 py-2.5 text-stone-700 hover:bg-stone-100">
          Cancelar
        </Link>
      </div>
    </form>
  )
}

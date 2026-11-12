import { supabase } from './supabase'

// ---------- Tipos (igual que las tablas en Supabase) ----------

export type Variante = {
  id: string
  producto_id: string
  formula: string
  sku: string | null
  unidad: string
  precio: number
  costo: number
  stock_minimo: number
}

export type Producto = {
  id: string
  nombre: string
  categoria: string | null
  descripcion: string | null
  estado: 'activo' | 'archivado'
  variante: Variante[]
}

/** Producto + el stock de cada variante (viene de la vista stock_actual). */
export type ProductoConStock = Producto & {
  stock: Record<string, { stock: number; stock_bajo: boolean }>
}

// ---------- Lectura ----------

const CAMPOS =
  'id, nombre, categoria, descripcion, estado, variante(id, producto_id, formula, sku, unidad, precio, costo, stock_minimo)'

/** Todos los productos con sus variantes y su stock actual. */
export async function cargarCatalogo(): Promise<ProductoConStock[]> {
  // Dos consultas en paralelo: productos (+variantes) y stock.
  const [productos, stock] = await Promise.all([
    supabase.from('producto').select(CAMPOS).order('nombre'),
    supabase.from('stock_actual').select('variante_id, stock, stock_bajo'),
  ])
  if (productos.error) throw productos.error
  if (stock.error) throw stock.error

  const porVariante: ProductoConStock['stock'] = {}
  for (const s of stock.data) {
    porVariante[s.variante_id] = { stock: Number(s.stock), stock_bajo: s.stock_bajo }
  }

  return (productos.data as Producto[]).map((p) => ({
    ...p,
    variante: [...p.variante].sort((a, b) => a.formula.localeCompare(b.formula)),
    stock: porVariante,
  }))
}

/** Un producto con sus variantes (para editar). */
export async function cargarProducto(id: string): Promise<Producto | null> {
  const { data, error } = await supabase.from('producto').select(CAMPOS).eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const p = data as Producto
  return { ...p, variante: [...p.variante].sort((a, b) => a.formula.localeCompare(b.formula)) }
}

// ---------- Escritura (solo admin; Supabase lo bloquea para el visor) ----------

export type DatosProducto = {
  nombre: string
  categoria: string
  descripcion: string
  estado: 'activo' | 'archivado'
}

export type DatosVariante = {
  id?: string // sin id = variante nueva
  formula: string
  sku: string
  unidad: string
  precio: number
  costo: number
  stock_minimo: number
  stock_inicial: number // solo se usa en variantes nuevas
}

/**
 * Crea o actualiza un producto y sus variantes.
 * Si una variante nueva trae stock inicial, se registra como movimiento de entrada,
 * porque el stock siempre es la suma de los movimientos.
 * Devuelve el id del producto.
 */
export async function guardarProducto(
  productoId: string | null,
  datos: DatosProducto,
  variantes: DatosVariante[],
  usuarioId: string,
): Promise<string> {
  const fila = {
    nombre: datos.nombre.trim(),
    categoria: datos.categoria.trim() || null,
    descripcion: datos.descripcion.trim() || null,
    estado: datos.estado,
  }

  // 1) Producto
  let id = productoId
  if (id) {
    const { error } = await supabase.from('producto').update(fila).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('producto').insert(fila).select('id').single()
    if (error) throw error
    id = data.id as string
  }

  // 2) Variantes
  for (const v of variantes) {
    const filaV = {
      producto_id: id,
      formula: v.formula.trim(),
      sku: v.sku.trim().toUpperCase() || null,
      unidad: v.unidad.trim() || 'litro',
      precio: Math.round(v.precio),
      costo: Math.round(v.costo),
      stock_minimo: v.stock_minimo,
    }

    if (v.id) {
      const { error } = await supabase.from('variante').update(filaV).eq('id', v.id)
      if (error) throw error
    } else {
      const { data, error } = await supabase.from('variante').insert(filaV).select('id').single()
      if (error) throw error
      if (v.stock_inicial > 0) {
        const { error: errMov } = await supabase.from('movimiento').insert({
          variante_id: data.id,
          tipo: 'entrada',
          cantidad: v.stock_inicial,
          motivo: 'Inventario inicial',
          usuario_id: usuarioId,
        })
        if (errMov) throw errMov
      }
    }
  }

  return id
}

/** Traduce los errores de Supabase a algo entendible. */
export function mensajeError(e: unknown): string {
  const err = e as { code?: string; message?: string }
  if (err?.code === '23505') return 'Ese SKU ya existe en otra variante. Usa uno distinto.'
  if (err?.code === '42501') return 'No tienes permiso para hacer cambios (solo admin).'
  return err?.message ?? 'Ocurrió un error inesperado.'
}

import { supabase } from './supabase'

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste'

export type Movimiento = {
  id: string
  variante_id: string
  tipo: TipoMovimiento
  cantidad: number // + suma al stock, − resta
  motivo: string | null
  usuario_id: string | null
  fecha: string
}

// Motivos sugeridos por tipo (el usuario igual puede escribir otro).
export const MOTIVOS: Record<TipoMovimiento, string[]> = {
  entrada: ['Compra a proveedor', 'Devolución de cliente', 'Otro'],
  salida: ['Venta', 'Uso en salón', 'Dañado o caducado', 'Otro'],
  ajuste: ['Conteo físico', 'Corrección de error'],
}

/**
 * Registra un movimiento. La cantidad que escribe el usuario siempre es positiva;
 * aquí se convierte al signo correcto:
 *  - entrada → +cantidad
 *  - salida  → −cantidad
 *  - ajuste  → recibe directamente la diferencia (puede ser + o −)
 */
export async function registrarMovimiento(m: {
  variante_id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  usuario_id: string
}) {
  const cantidad = m.tipo === 'salida' ? -Math.abs(m.cantidad) : m.tipo === 'entrada' ? Math.abs(m.cantidad) : m.cantidad
  const { error } = await supabase.from('movimiento').insert({
    variante_id: m.variante_id,
    tipo: m.tipo,
    cantidad,
    motivo: m.motivo.trim() || null,
    usuario_id: m.usuario_id,
  })
  if (error) throw error
}

export type FiltrosHistorial = {
  tipo: TipoMovimiento | 'todos'
  varianteIds: string[] | null // null = todas
  desde: string // 'AAAA-MM-DD' o ''
  hasta: string
}

/** Últimos movimientos (máx. 200) según los filtros. El filtrado lo hace Supabase. */
export async function cargarHistorial(f: FiltrosHistorial): Promise<Movimiento[]> {
  let q = supabase
    .from('movimiento')
    .select('id, variante_id, tipo, cantidad, motivo, usuario_id, fecha')
    .order('fecha', { ascending: false })
    .limit(200)

  if (f.tipo !== 'todos') q = q.eq('tipo', f.tipo)
  if (f.varianteIds) q = q.in('variante_id', f.varianteIds)
  if (f.desde) q = q.gte('fecha', new Date(`${f.desde}T00:00`).toISOString())
  if (f.hasta) {
    // "hasta" incluye todo ese día: menor que el inicio del día siguiente.
    const fin = new Date(`${f.hasta}T00:00`)
    fin.setDate(fin.getDate() + 1)
    q = q.lt('fecha', fin.toISOString())
  }

  const { data, error } = await q
  if (error) throw error
  return (data as Movimiento[]).map((m) => ({ ...m, cantidad: Number(m.cantidad) }))
}

/** id de usuario → nombre (de la tabla perfil), para mostrar quién hizo cada movimiento. */
export async function cargarNombres(): Promise<Record<string, string>> {
  const { data } = await supabase.from('perfil').select('id, nombre')
  const nombres: Record<string, string> = {}
  for (const p of data ?? []) nombres[p.id] = p.nombre ?? '—'
  return nombres
}

// Una fila de la vista stock_actual en Supabase.
export type FilaStock = {
  variante_id: string
  producto: string
  formula: string
  unidad: string
  stock: number
  stock_minimo: number
  stock_bajo: boolean
}

export type Rol = 'admin' | 'visor'

// Una fila de la tabla perfil.
export type Perfil = {
  id: string
  nombre: string | null
  rol: Rol
}

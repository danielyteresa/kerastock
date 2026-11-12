import type { ProductoConStock } from './catalogo'
import type { Movimiento } from './movimientos'

/** Una variante "aplanada" con todo lo que necesitan el dashboard, alertas y reportes. */
export type FilaVariante = {
  varianteId: string
  productoId: string
  nombre: string // "Keratina chocolate · 06"
  producto: string
  formula: string
  sku: string | null
  stock: number
  stockMinimo: number
  stockBajo: boolean
  precio: number
  costo: number
  valorVenta: number // stock × precio
  valorCosto: number // stock × costo
}

/** Pasa el catálogo a una lista de variantes (solo productos activos). */
export function aplanar(productos: ProductoConStock[]): FilaVariante[] {
  return productos
    .filter((p) => p.estado === 'activo')
    .flatMap((p) =>
      p.variante.map((v) => {
        const stock = p.stock[v.id]?.stock ?? 0
        const precio = Number(v.precio) || 0
        const costo = Number(v.costo) || 0
        return {
          varianteId: v.id,
          productoId: p.id,
          nombre: `${p.nombre} · ${v.formula}`,
          producto: p.nombre,
          formula: v.formula,
          sku: v.sku,
          stock,
          stockMinimo: Number(v.stock_minimo),
          stockBajo: stock <= Number(v.stock_minimo),
          precio,
          costo,
          valorVenta: stock * precio,
          valorCosto: stock * costo,
        }
      }),
    )
}

/** Variantes con stock bajo, de la más urgente (menos stock respecto al mínimo) a la menos. */
export function alertasStockBajo(filas: FilaVariante[]): FilaVariante[] {
  return filas.filter((f) => f.stockBajo).sort((a, b) => a.stock - a.stockMinimo - (b.stock - b.stockMinimo))
}

/** Litros que salieron por variante (solo salidas), de mayor a menor. */
export function salidasPorVariante(movs: Movimiento[]): Map<string, number> {
  const total = new Map<string, number>()
  for (const m of movs) {
    if (m.tipo !== 'salida') continue
    total.set(m.variante_id, (total.get(m.variante_id) ?? 0) + Math.abs(m.cantidad))
  }
  return total
}

/** Descarga una tabla como archivo CSV (lo abre Excel o Google Sheets). */
export function descargarCSV(nombreArchivo: string, encabezados: string[], filas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Punto y coma como separador: Excel en español lo abre bien en columnas.
  const texto = [encabezados, ...filas].map((fila) => fila.map(escapar).join(';')).join('\r\n')
  // El BOM (marca U+FEFF al inicio) hace que Excel respete las tildes y la ñ.
  const BOM = String.fromCharCode(0xfeff)
  const blob = new Blob([BOM + texto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}

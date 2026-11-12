// Pesos chilenos: sin decimales, con punto de miles. Ej: $12.990
const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export function formatoCLP(valor: number | null | undefined): string {
  return clp.format(valor ?? 0)
}

// Litros: hasta 2 decimales, sin ceros sobrantes. Ej: 2 L, 1,5 L
const litros = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })

export function formatoLitros(valor: number | null | undefined): string {
  return `${litros.format(valor ?? 0)} L`
}

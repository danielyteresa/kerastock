import type { FilaVariante } from '../lib/reportes'
import { formatoLitros } from '../lib/formato'

// Barras horizontales: litros por variante. Una sola serie (no necesita leyenda).
// La línea vertical marca el stock mínimo; las barras en ámbar están en alerta
// y además llevan la palabra "bajo" (el color nunca va solo).
export default function GraficoStock({ filas }: { filas: FilaVariante[] }) {
  const maximo = Math.max(1, ...filas.map((f) => Math.max(f.stock, f.stockMinimo)))
  const pct = (n: number) => `${(Math.max(0, n) / maximo) * 100}%`

  return (
    <figure className="rounded-xl border border-stone-200 bg-white p-4">
      <figcaption className="font-semibold">Stock por variante (litros)</figcaption>
      <ul className="mt-4 flex flex-col gap-2.5">
        {filas.map((f) => (
          <li
            key={f.varianteId}
            title={`${f.nombre}: ${formatoLitros(f.stock)} (mínimo ${formatoLitros(f.stockMinimo)})`}
            className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,13rem)_1fr_auto]"
          >
            <span className="truncate text-stone-700">{f.nombre}</span>
            <span className="relative h-3">
              <span
                className={`absolute inset-y-0 left-0 rounded-r ${f.stockBajo ? 'bg-amber-500' : 'bg-stone-700'}`}
                style={{ width: pct(f.stock) }}
              />
              {/* marca del mínimo */}
              <span
                aria-hidden="true"
                className="absolute -inset-y-1 w-px bg-stone-400"
                style={{ left: pct(f.stockMinimo) }}
              />
            </span>
            <span className="w-16 text-right whitespace-nowrap text-stone-800">
              {formatoLitros(f.stock)}
              {f.stockBajo && <span className="sr-only"> (bajo)</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
        <span aria-hidden="true" className="inline-block h-3 w-px bg-stone-400" /> stock mínimo
        <span aria-hidden="true" className="ml-3 inline-block size-2.5 rounded-sm bg-amber-500" /> en alerta
      </p>
    </figure>
  )
}

import type { Movimiento, TipoMovimiento } from '../lib/movimientos'
import { formatoLitros } from '../lib/formato'

const fechaHora = new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' })

const ETIQUETA: Record<TipoMovimiento, string> = {
  entrada: 'bg-emerald-100 text-emerald-800',
  salida: 'bg-red-100 text-red-800',
  ajuste: 'bg-sky-100 text-sky-800',
}

type Props = {
  movimientos: Movimiento[]
  nombreVariante: Record<string, string> // variante_id → "Keratina chocolate · 06"
  nombres: Record<string, string> // usuario_id → nombre
}

// Lista de movimientos: se usa en el Dashboard y en el historial de Movimientos.
export default function ListaMovimientos({ movimientos, nombreVariante, nombres }: Props) {
  return (
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white shadow-sm">
      {movimientos.map((m) => (
        <li
          key={m.id}
          className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 p-3 text-sm sm:grid-cols-[9rem_1fr_auto]"
        >
          <span className="text-xs text-stone-500 sm:text-sm">{fechaHora.format(new Date(m.fecha))}</span>
          <span
            className={`row-span-2 self-center text-right font-semibold whitespace-nowrap sm:order-last sm:row-span-1 ${
              m.cantidad < 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {m.cantidad > 0 ? '+' : '−'}
            {formatoLitros(Math.abs(m.cantidad))}
          </span>
          <span>
            <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${ETIQUETA[m.tipo]}`}>{m.tipo}</span>
            <span className="font-medium">{nombreVariante[m.variante_id] ?? '—'}</span>
            <span className="text-stone-500">
              {m.motivo && ` · ${m.motivo}`}
              {' · '}
              {m.usuario_id ? (nombres[m.usuario_id] ?? 'usuario') : 'carga inicial'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { mensajeError, type ProductoConStock } from '../lib/catalogo'
import { MOTIVOS, registrarMovimiento, type TipoMovimiento } from '../lib/movimientos'
import { formatoLitros } from '../lib/formato'

const TIPOS: { valor: TipoMovimiento; texto: string; ayuda: string }[] = [
  { valor: 'entrada', texto: 'Entrada', ayuda: 'Llegó mercancía: suma al stock.' },
  { valor: 'salida', texto: 'Salida', ayuda: 'Venta, uso o merma: resta del stock.' },
  { valor: 'ajuste', texto: 'Ajuste', ayuda: 'Contaste y el stock real es distinto: escribe lo que hay.' },
]

const num = (t: string) => Number(t.replace(',', '.'))

type Props = {
  productos: ProductoConStock[]
  onRegistrado: () => void
}

// Formulario rápido para registrar un movimiento (solo admin).
export default function FormMovimiento({ productos, onRegistrado }: Props) {
  const { sesion } = useAuth()
  const [tipo, setTipo] = useState<TipoMovimiento>('salida')
  const [varianteId, setVarianteId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS.salida[0])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Opciones del selector: solo productos activos.
  const opciones = productos
    .filter((p) => p.estado === 'activo')
    .flatMap((p) =>
      p.variante.map((v) => ({
        id: v.id,
        texto: `${p.nombre} · ${v.formula}`,
        stock: p.stock[v.id]?.stock ?? 0,
      })),
    )
  const elegida = opciones.find((o) => o.id === varianteId)
  const stockActual = elegida?.stock ?? 0
  const valor = num(cantidad)
  const valorValido = cantidad.trim() !== '' && !Number.isNaN(valor) && valor >= 0

  // En un ajuste se escribe el stock real; lo que se guarda es la diferencia.
  const diferencia = tipo === 'ajuste' && valorValido ? Math.round((valor - stockActual) * 100) / 100 : 0

  function cambiarTipo(t: TipoMovimiento) {
    setTipo(t)
    setMotivo(MOTIVOS[t][0])
    setError(null)
    setExito(null)
  }

  function validar(): string | null {
    if (!elegida) return 'Elige el producto.'
    if (!valorValido) return 'Escribe una cantidad válida (puede tener decimales, ej. 0,5).'
    if (tipo !== 'ajuste' && valor === 0) return 'La cantidad debe ser mayor que 0.'
    if (tipo === 'salida' && valor > stockActual)
      return `Solo hay ${formatoLitros(stockActual)} de ${elegida.texto}. Si el stock está mal, usa un ajuste.`
    if (tipo === 'ajuste' && diferencia === 0) return 'El stock contado es igual al actual: no hay nada que ajustar.'
    if (!motivo.trim()) return 'Escribe el motivo.'
    return null
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setExito(null)
    const problema = validar()
    if (problema) {
      setError(problema)
      return
    }
    if (!sesion || !elegida) return
    setGuardando(true)
    setError(null)
    try {
      await registrarMovimiento({
        variante_id: elegida.id,
        tipo,
        cantidad: tipo === 'ajuste' ? diferencia : valor,
        motivo,
        usuario_id: sesion.user.id,
      })
      const cambio = tipo === 'entrada' ? valor : tipo === 'salida' ? -valor : diferencia
      setExito(
        `Listo: ${elegida.texto} pasa de ${formatoLitros(stockActual)} a ${formatoLitros(stockActual + cambio)}.`,
      )
      setCantidad('')
      onRegistrado()
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const campo = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2'

  return (
    <form onSubmit={guardar} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Registrar movimiento</h2>

      {/* Tipo: botones tipo pestaña */}
      <div role="radiogroup" aria-label="Tipo de movimiento" className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            onClick={() => cambiarTipo(t.valor)}
            className={`rounded-md py-1.5 text-sm font-medium ${
              tipo === t.valor ? 'bg-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.texto}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">{TIPOS.find((t) => t.valor === tipo)?.ayuda}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm sm:col-span-3">
          <span className="mb-1 block">Producto</span>
          <select value={varianteId} onChange={(e) => setVarianteId(e.target.value)} className={campo}>
            <option value="">Elige…</option>
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.texto} — hay {formatoLitros(o.stock)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block">{tipo === 'ajuste' ? 'Stock real contado (L)' : 'Cantidad (L)'}</span>
          <input
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder={tipo === 'ajuste' ? formatoLitros(stockActual).replace(' L', '') : '1'}
            className={campo}
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block">Motivo</span>
          <input
            list={`motivos-${tipo}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className={campo}
          />
          <datalist id={`motivos-${tipo}`}>
            {MOTIVOS[tipo].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
      </div>

      {tipo === 'ajuste' && elegida && valorValido && diferencia !== 0 && (
        <p className="mt-3 text-sm text-stone-600">
          Se registrará un ajuste de{' '}
          <strong className={diferencia < 0 ? 'text-red-700' : 'text-emerald-700'}>
            {diferencia > 0 ? '+' : '−'}
            {formatoLitros(Math.abs(diferencia))}
          </strong>{' '}
          ({formatoLitros(stockActual)} → {formatoLitros(valor)}).
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {exito && (
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {exito}
        </p>
      )}

      <button
        disabled={guardando}
        className="mt-4 w-full rounded-lg bg-stone-800 px-4 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-60 sm:w-auto"
      >
        {guardando ? 'Guardando…' : `Registrar ${TIPOS.find((t) => t.valor === tipo)?.texto.toLowerCase()}`}
      </button>
    </form>
  )
}

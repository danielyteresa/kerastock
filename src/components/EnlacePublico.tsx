import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Enlace = { token: string; activo: boolean }

// Panel del admin para compartir el stock con un enlace (sin cuenta).
export default function EnlacePublico() {
  const [enlace, setEnlace] = useState<Enlace | null>(null)
  const [falta, setFalta] = useState(false) // la migración 002 no se ha corrido
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('enlace_publico')
      .select('token, activo')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) setFalta(true)
        else setEnlace(data as Enlace)
      })
  }, [])

  const url = enlace ? `${window.location.origin}/publico/${enlace.token}` : ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setAviso('Enlace copiado. Pégalo en WhatsApp o donde quieras.')
    } catch {
      setAviso('No se pudo copiar solo: selecciona el enlace y cópialo a mano.')
    }
  }

  async function cambiarActivo() {
    if (!enlace) return
    setOcupado(true)
    const { error } = await supabase.from('enlace_publico').update({ activo: !enlace.activo }).eq('id', 1)
    setOcupado(false)
    if (error) setAviso('No se pudo guardar el cambio.')
    else {
      setEnlace({ ...enlace, activo: !enlace.activo })
      setAviso(enlace.activo ? 'Enlace desactivado: ya nadie puede verlo.' : 'Enlace activado otra vez.')
    }
  }

  async function regenerar() {
    if (!enlace) return
    if (!window.confirm('Se creará un enlace nuevo y el actual dejará de funcionar. ¿Seguir?')) return
    setOcupado(true)
    const { data, error } = await supabase.rpc('regenerar_enlace_publico')
    setOcupado(false)
    if (error) setAviso('No se pudo cambiar el enlace.')
    else {
      setEnlace({ ...enlace, token: data as string })
      setAviso('Listo: enlace nuevo. El anterior ya no funciona.')
    }
  }

  const boton = 'rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60'

  return (
    <section className="mt-10 max-w-2xl rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Enlace público de stock</h2>
      <p className="mt-1 text-sm text-stone-600">
        Quien tenga este enlace ve el stock actual <strong>sin iniciar sesión</strong>. No ve precios, costos ni
        movimientos, y no puede cambiar nada.
      </p>

      {falta && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Falta correr <code>supabase/migraciones/002_vista_publica.sql</code> en el SQL Editor de Supabase.
        </p>
      )}

      {enlace && (
        <>
          <div className="mt-4 flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-xs ${enlace.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}
            >
              {enlace.activo ? 'Activo' : 'Desactivado'}
            </span>
          </div>
          <label htmlFor="enlace" className="sr-only">
            Enlace público
          </label>
          <input
            id="enlace"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className={`mt-2 w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-xs ${enlace.activo ? '' : 'text-stone-400 line-through'}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copiar} disabled={!enlace.activo} className={boton}>
              Copiar enlace
            </button>
            {enlace.activo && (
              <a href={url} target="_blank" rel="noreferrer" className={boton}>
                Abrir ↗
              </a>
            )}
            <button onClick={cambiarActivo} disabled={ocupado} className={boton}>
              {enlace.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button onClick={regenerar} disabled={ocupado} className={`${boton} text-red-700`}>
              Cambiar enlace
            </button>
          </div>
        </>
      )}

      {aviso && (
        <p role="status" className="mt-3 text-sm text-stone-700">
          {aviso}
        </p>
      )}
    </section>
  )
}

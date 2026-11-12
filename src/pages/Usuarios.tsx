import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Perfil } from '../lib/tipos'

// Solo admin. Lista quién tiene acceso y con qué rol.
// Crear usuarios se hace en Supabase (Authentication → Users): crear cuentas desde
// el navegador necesitaría la clave secreta, que nunca debe ir en la app.
export default function Usuarios() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])

  useEffect(() => {
    supabase
      .from('perfil')
      .select('id, nombre, rol')
      .order('rol')
      .then(({ data }) => setPerfiles((data as Perfil[]) ?? []))
  }, [])

  return (
    <>
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <ul className="mt-6 divide-y divide-stone-100 rounded-xl bg-white shadow-sm">
        {perfiles.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-3 text-sm">
            <span>{p.nombre || 'Sin nombre'}</span>
            <span className="text-stone-600">{p.rol === 'admin' ? 'Admin' : 'Visor'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-stone-600">
        Para agregar a alguien: créalo en Supabase → Authentication → Users y luego añade su fila
        en la tabla <code>perfil</code> con rol <code>visor</code> o <code>admin</code>.
      </p>
    </>
  )
}

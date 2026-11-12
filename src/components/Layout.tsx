import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

type Enlace = { a: string; texto: string; soloAdmin?: boolean }

const ENLACES: Enlace[] = [
  { a: '/', texto: 'Dashboard' },
  { a: '/productos', texto: 'Productos' },
  { a: '/movimientos', texto: 'Movimientos' },
  { a: '/alertas', texto: 'Alertas' },
  { a: '/usuarios', texto: 'Usuarios', soloAdmin: true },
]

// Menú lateral en escritorio; en móvil se colapsa en un botón ☰.
export default function Layout() {
  const { sesion, perfil, esAdmin, salir } = useAuth()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const enlaces = ENLACES.filter((e) => !e.soloAdmin || esAdmin)

  return (
    <div className="min-h-dvh md:flex">
      {/* Barra superior (solo móvil) */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <span className="text-lg font-bold">KeraStock</span>
        <button
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          className="rounded-lg px-3 py-1.5 text-xl hover:bg-stone-100"
        >
          <span aria-hidden="true">{menuAbierto ? '✕' : '☰'}</span>
          <span className="sr-only">Menú</span>
        </button>
      </header>

      <aside
        id="menu-principal"
        className={`${menuAbierto ? 'block' : 'hidden'} border-b border-stone-200 bg-white md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col md:border-r md:border-b-0`}
      >
        <div className="hidden px-5 pt-6 pb-4 text-xl font-bold md:block">KeraStock</div>

        <nav className="flex flex-col gap-1 p-3">
          {enlaces.map((e) => (
            <NavLink
              key={e.a}
              to={e.a}
              end={e.a === '/'}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-stone-800 text-white' : 'text-stone-700 hover:bg-stone-100'
                }`
              }
            >
              {e.texto}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-stone-200 p-4 text-sm">
          <p className="truncate font-medium">{perfil?.nombre || sesion?.user.email}</p>
          <p className="mt-0.5">
            <EtiquetaRol rol={perfil?.rol} />
          </p>
          <button onClick={salir} className="mt-3 text-stone-600 underline hover:text-stone-900">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        {!perfil && (
          <p role="alert" className="mb-6 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Tu usuario no tiene perfil en Supabase, así que solo puedes mirar. Pídele al admin que
            te agregue en la tabla <code>perfil</code>.
          </p>
        )}
        <Outlet />
      </main>
    </div>
  )
}

function EtiquetaRol({ rol }: { rol?: string }) {
  if (rol === 'admin')
    return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">Admin</span>
  if (rol === 'visor')
    return <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Visor · solo lectura</span>
  return <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">Sin rol</span>
}

import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth'

// Deja pasar solo a quien tiene sesión (y, si soloAdmin, rol admin).
// Ojo: esto solo esconde pantallas. La seguridad real está en Supabase (RLS).
export default function RutaProtegida({ soloAdmin = false }: { soloAdmin?: boolean }) {
  const { sesion, esAdmin, cargando } = useAuth()

  if (cargando) {
    return <p className="p-8 text-stone-600">Cargando…</p>
  }
  if (!sesion) return <Navigate to="/login" replace />
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />

  return <Outlet />
}

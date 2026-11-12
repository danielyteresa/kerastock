import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil } from '../lib/tipos'
import { AuthContext } from '../hooks/useAuth'

// Envuelve toda la app y guarda en un solo lugar la sesión y el perfil (rol).
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [sesionLista, setSesionLista] = useState(false)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [perfilDe, setPerfilDe] = useState<string | null>(null)

  // 1) Sesión: la que haya guardada y cualquier cambio (entrar / salir).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setSesionLista(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) Perfil: cuando cambia el usuario, se pide su fila en la tabla perfil.
  const usuarioId = sesion?.user.id ?? null
  useEffect(() => {
    if (!usuarioId) return
    let vigente = true
    supabase
      .from('perfil')
      .select('id, nombre, rol')
      .eq('id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vigente) return
        setPerfil((data as Perfil) ?? null)
        setPerfilDe(usuarioId)
      })
    return () => {
      vigente = false
    }
  }, [usuarioId])

  const perfilActual = usuarioId && perfilDe === usuarioId ? perfil : null
  const cargando = !sesionLista || (usuarioId !== null && perfilDe !== usuarioId)

  return (
    <AuthContext.Provider
      value={{
        sesion,
        perfil: perfilActual,
        cargando,
        // Sin perfil = sin permisos. Solo es admin si la tabla lo dice.
        esAdmin: perfilActual?.rol === 'admin',
        salir: async () => {
          await supabase.auth.signOut()
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

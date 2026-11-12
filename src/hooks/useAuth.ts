import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from '../lib/tipos'

export type EstadoAuth = {
  sesion: Session | null
  perfil: Perfil | null
  /** true mientras se averigua si hay sesión y cuál es el rol */
  cargando: boolean
  esAdmin: boolean
  salir: () => Promise<void>
}

export const AuthContext = createContext<EstadoAuth | null>(null)

// Cualquier componente llama useAuth() para saber quién está conectado y con qué rol.
export function useAuth(): EstadoAuth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

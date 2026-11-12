import { createClient } from '@supabase/supabase-js'

// Vite expone al navegador solo las variables que empiezan con VITE_.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa el archivo .env (o las variables en Netlify).',
  )
}

// Un solo cliente para toda la app.
export const supabase = createClient(url, anonKey)

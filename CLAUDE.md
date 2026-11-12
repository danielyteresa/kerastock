# KeraStock — control de inventario (tienda de keratinas)

## Proyecto
App web sencilla para controlar el stock de una tienda de keratinas.
Se publica en Netlify y guarda los datos en Supabase (en la nube),
para que otra persona pueda entrar y verlos. Proyecto personal y de portafolio.
Especificación completa: `KeraStock — Control de inventario para tienda de keratinas.md`
(manda la sección 14; las secciones 4 y 9 son una versión anterior más grande).

## Stack
- Vite + React + TypeScript
- Tailwind CSS v4 (plugin `@tailwindcss/vite`, sin tailwind.config)
- Supabase (Postgres + Auth). Variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Despliegue en Netlify (`netlify.toml`).

## Datos (tablas en Supabase)
producto (nombre, categoria, estado), variante (formula 04/06, sku, unidad litro,
precio, costo, stock_minimo), movimiento (entrada/salida/ajuste), perfil (rol).
Vista `stock_actual`: stock por variante = suma de sus movimientos.
- Esquema original: `supabase/schema.sql` + `supabase/seed.sql` (ya aplicados).
- Cambios posteriores: `supabase/migraciones/NNN_*.sql`, que el usuario pega en el SQL Editor.

## Reglas
- Los datos SIEMPRE van a Supabase, nunca solo al navegador.
- Solo dos roles: **admin** (todo) y **visor** (solo lee). No existe "editor".
- RLS activo: escribir solo admin; leer solo autenticados. Las vistas con `security_invoker = true`.
- Moneda: **pesos chilenos (CLP)**, enteros sin decimales; formatear con `formatoCLP` (src/lib/formato.ts).
- Stock en **litros**; formatear con `formatoLitros`.
- Textos en español, tono cercano. Mobile-first y accesible (alt, foco, contraste).
- Explícame brevemente cada cambio importante: estoy aprendiendo.

## Flujo
1. Proponer un plan antes de cambios grandes.
2. Una fase a la vez; dejar la app corriendo y decir cómo probarla.
3. Commit por funcionalidad, con mensaje en español.

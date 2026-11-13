# KeraStock

App web sencilla para controlar el inventario de una tienda de keratinas: cuánto hay de cada producto, qué entra y qué sale, y avisos cuando algo está por agotarse. Los datos viven en la nube (Supabase), así que varias personas ven el mismo stock actualizado.

**🔗 En vivo:** https://kerastock.netlify.app (requiere cuenta; los datos son de una tienda real)

<!-- Capturas: agrega imágenes en docs/ y descomenta
![Dashboard](docs/dashboard.png)
![Movimientos](docs/movimientos.png)
-->

## Qué hace

- **Dashboard:** stock total, valor del inventario en pesos chilenos, alertas y últimos movimientos, con gráfico de stock por variante.
- **Productos:** catálogo con variantes (fórmula 04 / 06), buscador y filtros; alta y edición con cálculo de margen.
- **Movimientos:** entradas, salidas y ajustes por conteo físico. Cada movimiento guarda quién lo hizo y cuándo; el stock es siempre la suma de los movimientos (nada se borra).
- **Alertas:** stock bajo y cerca del mínimo, con atajo para reponer.
- **Reportes:** valor del inventario, lo que más sale por periodo y exportación a CSV (Excel).
- **Acceso compartido:** login con roles **admin** (todo) y **visor** (solo lectura), más un **enlace público** de solo lectura que el admin puede desactivar o cambiar.
- Responsive: menú hamburguesa y tarjetas en móvil.

## Stack

| Capa | Herramienta |
| --- | --- |
| Interfaz | Vite + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 |
| Rutas | React Router 7 |
| Datos y login | Supabase (Postgres + Auth + Row Level Security) |
| Hosting | Netlify |

## Seguridad

- La clave `anon` de Supabase es pública por diseño; la protección real está en **Row Level Security**: sin sesión no se lee nada, el visor solo lee y solo el admin escribe.
- La vista `stock_actual` usa `security_invoker` para respetar esas reglas.
- La vista pública no abre ninguna tabla: usa una función (`stock_publico`) que exige un código secreto y devuelve solo el stock, sin precios ni costos.

## Correrlo en tu computadora

1. Crea un proyecto en [Supabase](https://supabase.com) y, en el SQL Editor, ejecuta en orden:
   `supabase/schema.sql`, `supabase/seed.sql` y los archivos de `supabase/migraciones/`.
2. Crea tu usuario en *Authentication → Users* y dale rol `admin` en la tabla `perfil`
   (las instrucciones están al final de `migraciones/001_…sql`).
3. Copia `.env.example` a `.env` y pon tu URL y clave anónima de Supabase.
4. Instala y arranca:

   ```bash
   npm install
   npm run dev
   ```

   Abre http://localhost:5173

## Estructura

```text
src/
  pages/        Dashboard, Productos, Movimientos, Alertas, Reportes, Usuarios, Login, VistaPublica
  components/   menú, formularios, gráfico, lista de movimientos, rutas protegidas
  lib/          cliente de Supabase, consultas, cálculos y formato (CLP, litros)
  hooks/        useAuth (sesión y rol)
supabase/
  schema.sql, seed.sql, migraciones/, pruebas/
```

## Próximas mejoras

Lotes con fecha de caducidad, importación de catálogo por CSV, proveedores y notificaciones de stock bajo.

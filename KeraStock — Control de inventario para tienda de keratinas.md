# KeraStock — Control de inventario para tienda de keratinas

Nov 12, 2026 · @Daniel y Tere

Especificación completa de una app web **sencilla** para controlar el inventario de una tienda de keratinas (alisados, tratamientos y cuidado capilar). Nada de Shopify: se abre en el navegador, se publica gratis en **Netlify** y **guarda los datos en la nube con Supabase**, para que tú registres el stock y otra persona (tu socio o la encargada) entre y lo vea actualizado. Es el proyecto 3 de tu portafolio, después de la cafetería (Astro) y Poseidon Sport (Shopify).

## 1. Resumen y objetivo

KeraStock es una app web sencilla para llevar el control de inventario de una tienda de keratinas: cuánto hay de cada producto, qué entra y qué sale, y un aviso cuando algo está por agotarse o por caducar. Se abre en el navegador, se publica en Netlify y los datos viven en la nube.

**Lo nuevo y más importante de esta versión:** los datos no se quedan en tu computadora. Se guardan en **Supabase** (base de datos gratuita en la nube), así que al publicar la app puedes darle acceso a otra persona y ella verá el mismo inventario, siempre actualizado.

**Dentro del alcance (MVP):**

- Catálogo de productos con variantes (volumen, tipo de keratina).
- Existencias por producto con **stock mínimo** y aviso de stock bajo.
- Movimientos: entradas, salidas y ajustes, con quién y cuándo.
- Inicio con los números clave (dashboard) y buscador con filtros.
- **Acceso compartido:** tú editas y otra persona puede ver (o también editar).
- Caducidad por lote: opcional, pensada para una segunda versión.

**Fuera del alcance por ahora:** cobro/punto de venta, facturación, tienda online. Quedan como mejoras futuras (última sección).

## 2. Cómo se guardan y comparten los datos

Netlify publica páginas, pero por sí solo no guarda datos. Para que el inventario se guarde y otra persona lo vea, la app usa **Supabase**: una base de datos en la nube (Postgres), con plan gratuito, que ya incluye inicio de sesión y una API lista para usar.

**Cómo funciona, en simple:**

1. La app (alojada en Netlify) se conecta a Supabase con una clave pública.
2. Cuando registras una entrada o una salida, se guarda en Supabase, no en el navegador.
3. Otra persona abre la misma URL, inicia sesión y ve exactamente el mismo stock.

**Compartir con otra persona — dos formas:**

- **Con cuenta (recomendado):** le creas un usuario en Supabase y entra con correo y contraseña. Puede ser *editor* (registra movimientos) o *visor* (solo mira).
- **Solo lectura por enlace:** una pantalla pública de "stock actual" que cualquiera con el enlace puede ver sin iniciar sesión, útil para mostrar el inventario sin dar acceso a editar.

**Qué necesitas (todo gratis):** una cuenta en Supabase, el proyecto creado y dos valores que la app usa (`SUPABASE_URL` y `SUPABASE_ANON_KEY`), que se configuran como variables de entorno en Netlify. Sin servidores propios que mantener.

## 3. Usuarios y acceso

El inicio de sesión lo maneja Supabase (correo y contraseña), así que no tienes que programar la autenticación. Para una tienda pequeña bastan tres roles; el rol decide qué puede hacer cada quien.

| Rol | Qué puede hacer |
| --- | --- |
| **Administrador** | Todo: crear/editar/borrar productos, ver costos y márgenes, gestionar usuarios y ver reportes. |
| **Editor** (almacén / vendedor) | Registrar entradas, salidas y ajustes; consultar stock. No ve márgenes ni gestiona usuarios. |
| **Visor** (la otra persona) | Solo consulta stock, precios y alertas; no modifica nada. Ideal para un socio que quiere estar al tanto. |

Además del acceso con cuenta, puede haber una **vista pública de solo lectura** (enlace sin iniciar sesión) con el stock actual, para mostrarlo sin dar permiso de editar. Cada movimiento guarda **qué usuario lo hizo y cuándo**, para tener trazabilidad.

## 4. Modelo de datos

El modelo separa el **producto** (la ficha general) de sus **variantes** (cada presentación que se vende), y añade dos capas que una tienda de cosméticos necesita: **lotes con caducidad** y **movimientos** (el histórico de todo lo que entra y sale). El stock de una variante es la suma de las cantidades de sus lotes. Cada entidad de abajo es una tabla en Supabase (Postgres).

**Producto** — la ficha general del artículo.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | UUID | clave primaria |
| handle | texto | identificador para URL y para el CSV de Shopify |
| titulo | texto | ej. "Keratina Brasileña Liso Perfecto" |
| descripcion | texto largo | HTML permitido |
| marca | texto | el "Vendor" de Shopify |
| categoria | texto / FK | Tratamiento, Shampoo, Kit, Herramienta, Accesorio |
| tipo\_keratina | texto | Con formol, Sin formol, Orgánica, Taninoplastia, Botox capilar |
| tags | texto | separados por coma (novedad, oferta, profesional) |
| estado | enum | activo, borrador, archivado |
| seo\_titulo / seo\_desc | texto | opcional |

**Variante** — cada presentación vendible del producto.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | UUID | clave primaria |
| producto\_id | FK | a Producto |
| sku | texto | único, ej. KER-BRAS-500 |
| opcion1\_nombre / valor | texto | ej. Volumen → 100 ml, 300 ml, 500 ml, 1 L |
| opcion2\_nombre / valor | texto | ej. Presentación → Profesional / Hogar (opcional) |
| codigo\_barras | texto | opcional |
| costo | decimal | lo que cuesta comprarlo (solo admin) |
| precio | decimal | precio de venta |
| precio\_comparacion | decimal | precio tachado / antes (opcional) |
| stock\_minimo | entero | umbral para la alerta de stock bajo |
| stock\_actual | entero | calculado = suma de lotes (se puede cachear) |

**Lote** — una remesa concreta con su caducidad. Es lo que permite la trazabilidad.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | UUID | clave primaria |
| variante\_id | FK | a Variante |
| numero\_lote | texto | el que trae el fabricante |
| fecha\_caducidad | fecha | dispara la alerta de caducidad |
| cantidad | entero | unidades disponibles de este lote |
| costo\_unitario | decimal | costo real de esa compra |
| proveedor\_id | FK | a Proveedor |
| fecha\_entrada | fecha | cuándo ingresó |

**Movimiento** — el histórico; nunca se edita, solo se agrega.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | UUID | clave primaria |
| variante\_id | FK | a Variante |
| lote\_id | FK | a Lote (opcional en ajustes) |
| tipo | enum | entrada, salida, ajuste, merma |
| cantidad | entero | positiva en entrada, negativa en salida/merma |
| motivo | texto | compra, venta, caducado, dañado, inventario físico |
| referencia | texto | nº de factura, ticket o nota |
| usuario\_id | FK | quién lo registró |
| fecha | datetime | cuándo |

**Proveedor** — id, nombre, contacto, teléfono, email, notas.

**Usuario** — lo gestiona Supabase Auth (correo y contraseña); en tu tabla guardas nombre, email y rol (administrador / editor / visor).

## 5. Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| **Catálogo** | Alta, edición, archivado y búsqueda de productos y variantes. Filtros por categoría, marca y tipo de keratina. Lista con stock y precio a la vista. |
| **Entradas** | Registrar la llegada de mercancía: producto, cantidad, costo y proveedor. Suma al stock y crea un movimiento de *entrada*. |
| **Salidas** | Descontar stock por venta o uso en el salón. Crea un movimiento de *salida*. |
| **Ajustes** | Corregir el stock tras un conteo físico, o dar de baja producto dañado o caducado, con motivo obligatorio. |
| **Alertas** | Stock bajo (stock ≤ mínimo) y, si activas lotes, caducidad próxima. Se ven en el dashboard y como lista. |
| **Dashboard** | Inicio con los números clave: nº de productos, valor del inventario, nº de alertas y últimos movimientos. |
| **Reportes** | Valor del inventario, productos más movidos, stock por categoría e historial de un producto. |
| **Acceso compartido** | Inicio de sesión con Supabase; roles administrador / editor / visor y una vista pública de solo lectura. |
| **Proveedores** | Directorio simple de proveedores (puede quedar para después). |
| **Importar / Exportar CSV** | Opcional: cargar el catálogo inicial desde un CSV y exportarlo como respaldo. Ya no es específico de Shopify. |

## 6. Pantallas y navegación

Menú lateral fijo a la izquierda y contenido a la derecha. Orden de los apartados:

1. **Dashboard** — tarjetas con los KPIs, lista de alertas y últimos movimientos.
2. **Productos** — tabla con buscador y filtros; botón "Nuevo producto". Al abrir uno: datos generales + pestaña de variantes + pestaña de lotes.
3. **Movimientos** — formulario rápido de entrada/salida/ajuste y, debajo, el historial filtrable por fecha, tipo y producto.
4. **Lotes y caducidad** — tabla de lotes con semáforo y filtro "vence en X días".
5. **Alertas** — stock bajo y caducidad próxima, con acceso directo a reponer o dar de baja.
6. **Proveedores** — directorio y ficha de cada proveedor.
7. **Reportes** — selector de reporte + tabla/gráfica + botón exportar CSV.
8. **Importar / Exportar** — subir CSV, ver previsualización y confirmar; o descargar el catálogo.
9. **Usuarios** y **Ajustes** (solo admin) — cuentas, roles y umbrales de alerta (días de caducidad, etc.).

En móvil/tablet el menú se colapsa en un botón de hamburguesa y las tablas se vuelven tarjetas apiladas.

## 7. Stack tecnológico recomendado

Herramientas sencillas, gratuitas y fáciles de publicar en Netlify. La clave: los datos se guardan en Supabase, no en un servidor propio.

| Capa | Recomendado | Por qué |
| --- | --- | --- |
| Framework | **Vite + React + TypeScript** | Rápido de aprender y de publicar; ideal para una app interactiva de una sola página. |
| Estilos | **Tailwind CSS** (+ shadcn/ui) | Mismo enfoque que tu landing de cafetería; responsive y veloz. |
| Datos y login | **Supabase** (Postgres + Auth + API) | Base de datos en la nube gratis; guarda los datos y deja que otra persona entre a verlos. |
| Tablas y gráficas | TanStack Table + Recharts | Para la lista de productos y el dashboard. |
| Despliegue | **Netlify** (plan gratis) | Deploy automático en cada `git push`, como en tus proyectos anteriores. |
| Control de versiones | Git + GitHub (repo público) | El repo es parte del portafolio. |

**¿Por qué no Astro como en la cafetería?** Astro brilla en páginas de contenido casi estáticas. KeraStock tiene mucha interacción (formularios, tablas que cambian, login), así que Vite + React encaja mejor. Si quieres mantener Astro para que combine, también sirve usando islas de React en las partes interactivas.

**¿Por qué Supabase y no una base local (SQLite)?** Una base local vive en tu máquina y no se comparte; en Netlify ni siquiera persistiría. Supabase pone la base en la nube para que otra persona la vea, y su plan gratuito sobra para una tienda pequeña.

## 8. Estructura de carpetas

Organización sugerida para un proyecto Vite + React + Supabase. Claude Code puede ajustarla:

```text
kerastock/
├── src/
│   ├── pages/               # Dashboard, Productos, Movimientos, Alertas, Login, VistaPublica
│   ├── components/          # tabla, formularios, tarjetas KPI, aviso de stock bajo
│   ├── lib/
│   │   ├── supabase.ts      # cliente de Supabase (lee las variables de entorno)
│   │   ├── stock.ts         # cálculo de stock y de alertas
│   │   └── csv.ts           # importar/exportar CSV (opcional)
│   ├── hooks/               # useProductos, useMovimientos, useAuth
│   ├── App.tsx              # rutas y control de acceso por rol
│   └── main.tsx
├── supabase/
│   ├── schema.sql           # tablas: producto, variante, movimiento, proveedor, perfil
│   └── seed.sql             # catálogo de ejemplo (sección 9)
├── public/
├── .env                     # VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
├── netlify.toml             # configuración de build para Netlify
└── package.json
```

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` van en `.env` para desarrollo y en **Netlify → Site settings → Environment variables** para producción. La clave anónima es pública: la seguridad real la dan las reglas de Supabase (Row Level Security), que definen quién puede leer y escribir cada tabla.

## 9. Catálogo de ejemplo

Usa esta tabla para el `seed.sql`: productos típicos de una tienda de keratinas, con variantes por volumen. Precios en pesos (MXN) a modo de ejemplo; la caducidad y el lote son por remesa, así que al sembrar puedes poner un lote con fecha a 18–24 meses.

| Producto | Tipo | Variante | SKU | Precio | Stock inicial |
| --- | --- | --- | --- | --- | --- |
| Keratina Brasileña Liso Perfecto | Sin formol | 300 ml | KER-BRAS-300 | 890 | 20 |
| Keratina Brasileña Liso Perfecto | Sin formol | 500 ml | KER-BRAS-500 | 1290 | 15 |
| Keratina Brasileña Liso Perfecto | Sin formol | 1 L | KER-BRAS-1000 | 2190 | 10 |
| Keratina Alisado Extremo | Con formol | 500 ml | KER-EXTR-500 | 990 | 12 |
| Keratina Alisado Extremo | Con formol | 1 L | KER-EXTR-1000 | 1690 | 8 |
| Botox Capilar Hidra Nutrición | Botox capilar | 500 ml | KER-BOTOX-500 | 850 | 18 |
| Taninoplastia Orgánica | Orgánica | 500 ml | KER-TANIN-500 | 1150 | 10 |
| Mascarilla de Keratina Reconstructora | Tratamiento | 250 ml | KER-MASC-250 | 320 | 25 |
| Shampoo Antirresiduos Pre-Keratina | Shampoo | 500 ml | KER-SHPRE-500 | 290 | 30 |
| Shampoo Post-Keratina Sin Sal | Shampoo | 500 ml | KER-SHPOST-500 | 340 | 28 |
| Acondicionador Sellador Post-Keratina | Acondicionador | 300 ml | KER-ACOND-300 | 310 | 22 |
| Kit Keratina Hogar | Kit | 3 piezas | KER-KIT-HOGAR | 790 | 14 |
| Plancha Profesional Titanio 230°C | Herramienta | Única | KER-PLAN-TIT | 1490 | 6 |
| Cepillo Térmico Modelador | Herramienta | Única | KER-CEP-TERM | 420 | 15 |

Columnas extra que el `seed` también puede llenar: marca, costo (para el margen), stock\_minimo (por ejemplo 5), número de lote y fecha de caducidad por lote.

## 10. Plan por fases

Construir en este orden para tener algo funcional pronto y pedirle a Claude Code una fase a la vez. Revisa cada fase con `npm run dev` y haz commit antes de seguir.

1. **Cimientos.** Crear el proyecto Vite + React + TypeScript, añadir Tailwind y conectar el repo de GitHub.
2. **Supabase.** Crear el proyecto en Supabase, correr `schema.sql` (tablas) y `seed.sql` (catálogo de ejemplo), y conectar la app con el cliente de Supabase.
3. **Login y roles.** Inicio de sesión con Supabase Auth y control de acceso por rol (administrador / editor / visor).
4. **Catálogo.** Lista de productos con buscador y filtros, y alta/edición de productos y variantes.
5. **Movimientos y stock.** Entradas, salidas y ajustes; cálculo de stock y registro de quién y cuándo. Es el núcleo.
6. **Alertas y dashboard.** Aviso de stock bajo, KPIs, últimos movimientos y reportes básicos.
7. **Vista pública de solo lectura.** Pantalla de stock que otra persona ve con el enlace, sin iniciar sesión.
8. **Publicar en Netlify.** Conectar el repo, poner las variables de Supabase y verificar que otra persona entra y ve los datos.
9. **Pulido.** Responsive, validaciones, reglas de seguridad (RLS) en Supabase y, si quieres, lotes/caducidad e importación de CSV.

Pídele a Claude Code que al terminar cada fase deje la app corriendo y te diga cómo probarla.

## 11. Contenido para CLAUDE.md

Igual que en tus proyectos anteriores, crea un archivo `CLAUDE.md` en la raíz del repo. Claude Code lo lee en cada sesión y así no repites el contexto.

```markdown
# KeraStock — control de inventario (tienda de keratinas)

## Proyecto
App web sencilla para controlar el stock de una tienda de keratinas.
Se publica en Netlify y guarda los datos en Supabase (en la nube),
para que otra persona pueda entrar y verlos.

## Stack
- Vite + React + TypeScript
- Tailwind CSS (+ shadcn/ui)
- Supabase (Postgres + Auth). Variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- Despliegue en Netlify.

## Datos (tablas en Supabase)
producto, variante, movimiento, proveedor, perfil (usuario + rol).
El stock de una variante = suma de sus movimientos (o de sus lotes si se usan).

## Reglas
- Los datos SIEMPRE van a Supabase, nunca solo al navegador.
- Roles: administrador (todo), editor (registra movimientos), visor (solo lee).
- Activar Row Level Security en Supabase: el visor solo puede leer.
- Textos en español, tono cercano. Mobile-first y accesible (alt, foco, contraste).
- Explícame brevemente cada cambio importante: estoy aprendiendo.

## Flujo
1. Proponer un plan antes de cambios grandes.
2. Una fase a la vez; dejar la app corriendo y decir cómo probarla.
3. Commit por funcionalidad, con mensaje en español.
```

## 12. Prompt inicial para Claude Code

Copia este texto como primer mensaje en Claude Code, dentro de una carpeta vacía. Antes, crea tu cuenta y proyecto en Supabase para tener a mano la URL y la clave anónima.

```markdown
Quiero construir "KeraStock", una app web sencilla para controlar el inventario
de una tienda que vende keratinas (tratamientos de alisado, botox capilar,
taninoplastia, shampoos y acondicionadores, kits y herramientas).

Debe publicarse en Netlify y guardar los datos en Supabase (en la nube), para que
yo registre el stock y otra persona pueda entrar con su cuenta y verlo.

Stack: Vite + React + TypeScript + Tailwind CSS (con shadcn/ui) y Supabase
(Postgres + Auth). Nada de Shopify ni de base de datos local.

Datos en Supabase (tablas):
- producto: titulo, descripcion, marca, categoria, tipo_keratina, estado.
- variante: producto_id, sku, volumen, precio, costo, stock_minimo.
- movimiento: variante_id, tipo (entrada/salida/ajuste), cantidad, motivo,
  usuario_id, fecha.
- proveedor: nombre, contacto, telefono, email.
- perfil: usuario_id, nombre, rol (admin/editor/visor).

Reglas:
- El stock de una variante = suma de las cantidades de sus movimientos.
- Alerta de stock bajo cuando stock <= stock_minimo.
- Roles: admin (todo), editor (registra movimientos), visor (solo lee).
- Activa Row Level Security en Supabase para que el visor solo pueda leer.

Empieza por la FASE 1 y la FASE 2: crea el proyecto Vite + React + Tailwind,
escribe schema.sql con esas tablas y seed.sql con ~14 productos de keratina de
ejemplo, y conecta la app a Supabase con las variables VITE_SUPABASE_URL y
VITE_SUPABASE_ANON_KEY. Deja la app corriendo con `npm run dev`, dime cómo
probarla y explícame cada archivo. No avances a la fase 3 hasta que te lo pida.
```

Cuando llegues a la fase de publicar, pídele que te guíe paso a paso para conectar el repo a Netlify y poner las variables de Supabase en producción.

## 13. Criterios de terminado

El proyecto está listo para tu portafolio cuando cumple todo esto:

- [ ] Publicado en una URL pública de Netlify.
- [ ] Los datos se guardan en Supabase y no se pierden al recargar.
- [ ] Otra persona entra con su cuenta y ve el mismo inventario.
- [ ] Hay una vista de solo lectura para compartir por enlace.
- [ ] Registrar una entrada y una salida cambia el stock correctamente.
- [ ] La alerta de stock bajo aparece cuando corresponde.
- [ ] El visor no puede editar (reglas RLS activas en Supabase).
- [ ] Se ve bien en móvil y escritorio, sin errores en la consola.
- [ ] Repo público con README: capturas, stack, cómo correrlo y enlace en vivo.

**Siguiente paso:** reutiliza la misma base cambiando el catálogo para otro tipo de tienda; demuestra que tu código es reutilizable, igual que pasaste de la cafetería al gimnasio.

## 14. Base de datos lista para Supabase (tus productos)

Esta es la base de datos con tu **stock real (40 L)**. En Supabase ve a **SQL Editor**, pega y ejecuta primero `schema.sql`, y luego `seed.sql`. Te entrego los dos archivos para descargar y también los dejo aquí para copiar.

Interpreté **04 / 06** como las dos fórmulas (el % aprox. de formol), cada aroma como un producto y el stock en **litros**. Los precios quedan en 0: edítalos en la tabla `variante` cuando los tengas. Esto reemplaza el catálogo de ejemplo de la sección 9 con tus productos reales.

**Tu stock inicial:**

| Producto | Fórmula | Litros |
| --- | --- | --- |
| Keratina chocolate | 06 | 6 |
| Keratina vainilla | 04 | 2 |
| Keratina vainilla | 06 | 4 |
| Keratina cacao cherry | 04 | 2 |
| Keratina cacao cherry | 06 | 8 |
| Keratina almendra | 04 | 2 |
| Keratina almendra | 06 | 8 |
| Keratina coffee | 06 | 8 |
| **Total** |  | **40** |

**`schema.sql`** — las tablas, la vista de stock y la seguridad:

```sql
-- Perfiles de usuario (rol). Se enlaza con Supabase Auth.
create table if not exists perfil (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  rol        text not null default 'visor' check (rol in ('admin','editor','visor')),
  creado_en  timestamptz not null default now()
);

-- Productos: cada aroma de keratina.
create table if not exists producto (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  categoria   text default 'Keratina',
  descripcion text,
  estado      text not null default 'activo' check (estado in ('activo','archivado')),
  creado_en   timestamptz not null default now()
);

-- Variantes: la fórmula (04 / 06), vendida por litro.
create table if not exists variante (
  id            uuid primary key default gen_random_uuid(),
  producto_id   uuid not null references producto(id) on delete cascade,
  formula       text not null,
  sku           text unique,
  unidad        text not null default 'litro',
  precio        numeric(10,2) default 0,
  costo         numeric(10,2) default 0,
  stock_minimo  numeric(10,2) not null default 2
);

-- Movimientos: entradas, salidas y ajustes. El stock = suma de cantidades.
create table if not exists movimiento (
  id          uuid primary key default gen_random_uuid(),
  variante_id uuid not null references variante(id) on delete cascade,
  tipo        text not null check (tipo in ('entrada','salida','ajuste')),
  cantidad    numeric(10,2) not null,
  motivo      text,
  usuario_id  uuid references auth.users(id),
  fecha       timestamptz not null default now()
);

-- Vista de stock actual por variante.
create or replace view stock_actual as
select v.id as variante_id, p.nombre as producto, v.formula, v.unidad,
       coalesce(sum(m.cantidad),0) as stock, v.stock_minimo,
       (coalesce(sum(m.cantidad),0) <= v.stock_minimo) as stock_bajo
from variante v
join producto p on p.id = v.producto_id
left join movimiento m on m.variante_id = v.id
group by v.id, p.nombre, v.formula, v.unidad, v.stock_minimo;

-- Seguridad: todos los autenticados LEEN; solo editor/admin ESCRIBEN.
alter table perfil enable row level security;
alter table producto enable row level security;
alter table variante enable row level security;
alter table movimiento enable row level security;

create or replace function mi_rol() returns text language sql stable as $$
  select rol from perfil where id = auth.uid()
$$;

create policy leer_perfil on perfil for select to authenticated using (true);
create policy leer_producto on producto for select to authenticated using (true);
create policy leer_variante on variante for select to authenticated using (true);
create policy leer_movimiento on movimiento for select to authenticated using (true);

create policy escribir_producto on producto for all to authenticated
  using (mi_rol() in ('editor','admin')) with check (mi_rol() in ('editor','admin'));
create policy escribir_variante on variante for all to authenticated
  using (mi_rol() in ('editor','admin')) with check (mi_rol() in ('editor','admin'));
create policy escribir_movimiento on movimiento for all to authenticated
  using (mi_rol() in ('editor','admin')) with check (mi_rol() in ('editor','admin'));
```

**`seed.sql`** — tus productos y tu stock inicial:

```sql
insert into producto (nombre) values
  ('Keratina chocolate'),
  ('Keratina vainilla'),
  ('Keratina cacao cherry'),
  ('Keratina almendra'),
  ('Keratina coffee')
on conflict do nothing;

insert into variante (producto_id, formula, sku, stock_minimo)
select p.id, d.formula, d.sku, 2
from (values
  ('Keratina chocolate',    '06', 'KER-CHOC-06'),
  ('Keratina vainilla',     '04', 'KER-VAIN-04'),
  ('Keratina vainilla',     '06', 'KER-VAIN-06'),
  ('Keratina cacao cherry', '04', 'KER-CACH-04'),
  ('Keratina cacao cherry', '06', 'KER-CACH-06'),
  ('Keratina almendra',     '04', 'KER-ALM-04'),
  ('Keratina almendra',     '06', 'KER-ALM-06'),
  ('Keratina coffee',       '06', 'KER-COFF-06')
) as d(nombre, formula, sku)
join producto p on p.nombre = d.nombre
on conflict (sku) do nothing;

insert into movimiento (variante_id, tipo, cantidad, motivo)
select v.id, 'entrada', d.litros, 'Inventario inicial'
from (values
  ('KER-CHOC-06', 6), ('KER-VAIN-04', 2), ('KER-VAIN-06', 4),
  ('KER-CACH-04', 2), ('KER-CACH-06', 8), ('KER-ALM-04', 2),
  ('KER-ALM-06', 8), ('KER-COFF-06', 8)
) as d(sku, litros)
join variante v on v.sku = d.sku;
```

Para darle acceso a otra persona: créale un usuario en Supabase (Authentication → Users) y en la tabla `perfil` ponle su `rol` (`editor` o `visor`).

## 15. Mejoras futuras

Fuera del MVP, para cuando lo básico funcione:

- **Punto de venta (POS)** con cobro y ticket, que descuente stock automáticamente.
- **Conexión con una tienda online** por API, para que el stock cuadre con las ventas.
- **Códigos de barras**: escanear para entradas y salidas más rápidas.
- **Órdenes de compra** a proveedores con sugerencia automática de reposición.
- **Multi-sucursal**: stock por tienda/almacén y traspasos entre ellas.
- **Reportes avanzados**: rotación de inventario, caducidad evitada, ventas por categoría.
- **Notificaciones** por correo o WhatsApp cuando una alerta se dispara.

Con esto tienes el proyecto completo y simple para llevarlo a Claude Code: se publica en Netlify, guarda los datos en Supabase y otra persona puede verlos. Si quieres, te preparo el `schema.sql` y el `seed.sql` listos para pegar en Supabase, o adapto algún detalle a cómo trabajas.

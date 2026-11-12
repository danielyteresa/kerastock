-- Esquema original (sección 14 del documento). Ya está aplicado en Supabase.
-- Los cambios posteriores están en supabase/migraciones/.
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

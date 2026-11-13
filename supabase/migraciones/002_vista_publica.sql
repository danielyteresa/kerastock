-- =====================================================================
-- 002 · Vista pública de solo lectura (fase 7)
-- Pegar COMPLETO en Supabase → SQL Editor → Run.
--
-- Idea: las tablas siguen cerradas para quien no inicia sesión. En vez de
-- abrirlas, creamos una FUNCIÓN que devuelve solo el stock (sin precios ni
-- costos) y SOLO si le pasas el código secreto del enlace. Si el admin
-- desactiva o cambia el código, el enlace viejo deja de funcionar.
-- =====================================================================

-- 1) Dónde se guarda el código secreto (una sola fila).
create table if not exists enlace_publico (
  id      int primary key default 1 check (id = 1),
  token   text not null default replace(gen_random_uuid()::text, '-', ''),
  activo  boolean not null default true,
  creado_en timestamptz not null default now()
);
insert into enlace_publico (id) values (1) on conflict (id) do nothing;

-- Solo el admin puede ver o cambiar el código.
alter table enlace_publico enable row level security;
drop policy if exists admin_enlace on enlace_publico;
create policy admin_enlace on enlace_publico for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');


-- 2) La función que usa la página pública.
--    security definer = corre con permisos del dueño, así puede leer las
--    tablas aunque quien la llama no haya iniciado sesión. Por eso solo
--    devuelve columnas inofensivas y exige el código correcto.
create or replace function stock_publico(p_token text)
returns table (producto text, formula text, unidad text, stock numeric, stock_bajo boolean)
language sql stable security definer set search_path = public as $$
  select p.nombre, v.formula, v.unidad,
         coalesce(sum(m.cantidad), 0)                     as stock,
         coalesce(sum(m.cantidad), 0) <= v.stock_minimo   as stock_bajo
  from variante v
  join producto p on p.id = v.producto_id
  left join movimiento m on m.variante_id = v.id
  where p.estado = 'activo'
    and exists (select 1 from enlace_publico e where e.activo and e.token = p_token)
  group by p.nombre, v.formula, v.unidad, v.stock_minimo
  order by p.nombre, v.formula
$$;

revoke all on function stock_publico(text) from public;
grant execute on function stock_publico(text) to anon, authenticated;


-- 3) Cambiar el código (el enlace anterior deja de servir). Solo admin.
create or replace function regenerar_enlace_publico()
returns text
language plpgsql security definer set search_path = public as $$
declare nuevo text := replace(gen_random_uuid()::text, '-', '');
begin
  if mi_rol() is distinct from 'admin' then
    raise exception 'Solo el admin puede cambiar el enlace' using errcode = '42501';
  end if;
  update enlace_publico set token = nuevo, creado_en = now() where id = 1;
  return nuevo;
end $$;

revoke all on function regenerar_enlace_publico() from public, anon;
grant execute on function regenerar_enlace_publico() to authenticated;

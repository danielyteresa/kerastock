-- =====================================================================
-- 001 · Ajustes antes de la fase 1
-- Pegar COMPLETO en Supabase → SQL Editor → Run. Se puede correr más de
-- una vez sin romper nada.
--
-- 1. Cierra la vista stock_actual para usuarios sin sesión.
-- 2. Deja solo dos roles: admin y visor (se elimina "editor").
-- 3. Precios y costos en pesos chilenos (CLP, sin decimales).
-- =====================================================================

-- 1) Seguridad de la vista -------------------------------------------
-- Por defecto una vista se ejecuta con los permisos de su dueño y se
-- salta RLS. Con security_invoker usa los permisos de quien consulta,
-- así que aplica las mismas reglas que las tablas (solo autenticados).
alter view stock_actual set (security_invoker = true);


-- 2) Solo admin y visor ----------------------------------------------
-- Si alguien quedó como editor, pasa a admin.
update perfil set rol = 'admin' where rol = 'editor';

alter table perfil drop constraint if exists perfil_rol_check;
alter table perfil add constraint perfil_rol_check check (rol in ('admin','visor'));

-- mi_rol() en security definer para que lea perfil sin depender de RLS.
create or replace function mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfil where id = auth.uid()
$$;

-- Escribir: solo admin. Leer: todos los autenticados (no cambia).
drop policy if exists escribir_producto   on producto;
drop policy if exists escribir_variante   on variante;
drop policy if exists escribir_movimiento on movimiento;

create policy escribir_producto on producto for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy escribir_variante on variante for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy escribir_movimiento on movimiento for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');


-- 3) Pesos chilenos --------------------------------------------------
-- El peso chileno no usa centavos: números enteros (hasta 999.999.999.999).
alter table variante alter column precio type numeric(12,0) using round(precio);
alter table variante alter column costo  type numeric(12,0) using round(costo);


-- ---------------------------------------------------------------------
-- DESPUÉS de correr esto, crea tu usuario en Authentication → Users
-- (Add user → con correo y contraseña, marcando "Auto Confirm User") y
-- luego hazte admin con esta línea (cambia el correo):
--
--   insert into perfil (id, nombre, rol)
--   select id, 'Tu nombre', 'admin' from auth.users where email = 'TU_CORREO'
--   on conflict (id) do update set rol = 'admin';
--
-- Para la otra persona, lo mismo pero con rol 'visor'.
-- ---------------------------------------------------------------------

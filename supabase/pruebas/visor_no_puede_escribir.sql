-- =====================================================================
-- Prueba: ¿el visor de verdad NO puede escribir?
-- Pegar en Supabase → SQL Editor, cambiar el correo y dar Run.
-- Todo va dentro de begin … rollback: no se guarda nada.
-- =====================================================================
begin;

-- Hacerse pasar por el usuario visor (como si hubiera iniciado sesión).
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'CORREO_DEL_VISOR'))::text,
  true
);
set local role authenticated;

-- 1) Debe decir 'visor'
select mi_rol() as mi_rol;

-- 2) Leer SÍ puede: debe mostrar 8 filas
select count(*) as variantes_visibles from stock_actual;

-- 3) Escribir NO: esta línea debe fallar con
--    "new row violates row-level security policy for table movimiento"
insert into movimiento (variante_id, tipo, cantidad, motivo)
select id, 'ajuste', 0, 'prueba visor' from variante limit 1;

rollback;

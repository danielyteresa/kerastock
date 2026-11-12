-- Catálogo y stock inicial (sección 14). Ya está aplicado en Supabase.
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

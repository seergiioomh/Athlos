-- OPCIONAL — datos de prueba para la pantalla de Progreso.
--
-- Cinco pesajes repartidos en dos semanas, acabando hoy. No van en días
-- consecutivos a propósito: nadie se pesa a diario, y así se comprueba que
-- la gráfica reparte bien los puntos aunque los huecos sean desiguales.
--
-- Arranca del peso que tengas en el perfil, así que el último registro
-- coincide con lo que ya dice tu ficha.
--
-- Se puede ejecutar varias veces: sobrescribe en lugar de duplicar.
-- Requiere haber ejecutado antes 0003_dev_open_access.sql y 0007_body_weight.sql.

insert into public.body_weight_entries (user_id, weight_kg, measured_on)
select
  public.dev_user_id(),
  round(perfil.base + variacion.delta, 1),
  current_date - variacion.dias
from (
  select coalesce(
    (select weight_kg from public.profiles where id = public.dev_user_id()),
    65
  )::numeric as base
) as perfil
cross join (values
  (13, 1.1),
  (10, 0.8),
  (6,  0.9),
  (3,  0.4),
  (0,  0.0)
) as variacion (dias, delta)
on conflict (user_id, measured_on)
  do update set weight_kg = excluded.weight_kg;

-- Para borrarlos después:
--   delete from public.body_weight_entries
--   where user_id = public.dev_user_id()
--     and measured_on >= current_date - 13;

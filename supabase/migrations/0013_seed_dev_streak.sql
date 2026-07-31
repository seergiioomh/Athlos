-- OPCIONAL — datos de prueba para ver la racha.
--
-- Crea entrenamientos terminados en días consecutivos acabando hoy, así que
-- la racha pasa a valer tantos como días generes.
--
-- Cambia el 6 por el número que quieras ver MENOS UNO: generate_series(0, 6)
-- son siete días (de hoy hacia atrás), y por tanto racha de 7.
--   0, 2  → racha 3
--   0, 6  → racha 7   (escalón ámbar)
--   0, 24 → racha 25  (escalón dorado)
--
-- Van marcadas con notes = 'prueba' para poder borrarlas sin tocar las reales.

insert into public.workout_sessions (user_id, started_at, finished_at, notes)
select
  public.dev_user_id(),
  (current_date - dias) + interval '18 hours',
  (current_date - dias) + interval '19 hours',
  'prueba'
from generate_series(0, 6) as dias;

-- Para borrarlas y volver a tu racha real:
--   delete from public.workout_sessions
--   where user_id = public.dev_user_id() and notes = 'prueba';

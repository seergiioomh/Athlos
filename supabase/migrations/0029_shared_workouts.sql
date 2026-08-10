-- Entrenamientos compartidos entre usuarios.
--
-- El caso: dos amigos van juntos al gimnasio y cada uno tiene en la app un
-- entrenamiento distinto. Uno le pasa el suyo al otro por un enlace y lo hacen
-- juntos.
--
-- Se registra como cualquier otro entrenamiento —cuenta para las estadísticas,
-- la racha y el historial— pero NO pertenece al ciclo de quien lo recibe: es
-- una sesión ocasional, no la siguiente de su rotación.

-- ------------------------------------------------------- origen del plan
-- `source` distinguía dos orígenes: 'ai' (lo diseñó el coach) y 'manual' (se
-- importó de notas en papel, ver 0017). Ahora hay un tercero.
--
-- Importa que sea un valor propio y no un 'manual' cualquiera: es lo que
-- permite que la app excluya estos planes al decidir cuál es el entrenamiento
-- de hoy. Sin esa distinción, aceptar el de un amigo taparía el tuyo.

alter table public.workout_plans
  drop constraint if exists workout_plans_source_check;

alter table public.workout_plans
  add constraint workout_plans_source_check
  check (source in ('ai', 'manual', 'shared'));

-- ------------------------------------------------------- de quién venía
-- Solo para poder decirlo en pantalla: "Entrenamiento de Sergio".
--
-- Se guarda el NOMBRE, no el id del usuario que lo compartió. Con un id
-- habría que leer el perfil de otra persona para pintar la tarjeta, y las
-- políticas de la tabla lo impiden a propósito: nadie ve los datos de nadie.
-- El nombre viaja dentro del enlace, que es la única pieza que cruza de un
-- móvil al otro.
--
-- Null en los planes que no vienen de nadie, que son casi todos.

alter table public.workout_plans
  add column if not exists shared_by text
    check (shared_by is null or length(shared_by) <= 40);

-- Los compartidos se consultan por separado de los del ciclo, y son una
-- minoría dentro de la tabla: el índice parcial solo indexa esas filas.
create index if not exists workout_plans_shared_idx
  on public.workout_plans (user_id, created_at desc)
  where source = 'shared';

-- El reparto deja de ser un calendario y pasa a ser un ciclo.
--
-- Atar cada sesión a un día de la semana obligaba a inventar una regla para
-- cada hueco: qué pasa si se salta el lunes, si entrena un domingo, si vuelve
-- después de dos semanas. Y la peor: un plan pendiente del lunes seguía siendo
-- el vigente el martes, así que saltarse una sesión desfasaba el reparto para
-- siempre.
--
-- Un ciclo no tiene huecos. Sesión 1, 2, 3... y al terminar la última se vuelve
-- a la primera. La siguiente es la siguiente, entrene cuando entrene.
--
-- La tabla sigue llamándose `weekly_splits` a propósito: renombrarla obligaría
-- a tocar políticas, índices y las tres Edge Functions a la vez, y el nombre
-- no es lo que estaba mal.

-- ------------------------------------------------------------- el ciclo
-- `cycle` sustituye a `days`: [{position, label, focus}] en vez de
-- [{day, label, focus}].

alter table public.weekly_splits
  add column if not exists cycle jsonb;

/**
 * `status` distingue tres momentos que antes no se podían separar con un
 * booleano: propuesto y sin revisar, vigente, y jubilado.
 *
 * `active` se conserva porque el índice parcial de 0022 depende de él y
 * porque la app lo sigue escribiendo. Se mantiene alineado con `status`
 * mediante la RPC de abajo: nunca se tocan por separado.
 */
alter table public.weekly_splits
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'active', 'archived'));

-- Cuándo lo aceptó el usuario. Null mientras siga siendo un borrador: es lo
-- que distingue "el coach lo propuso" de "el usuario dijo que sí".
alter table public.weekly_splits
  add column if not exists approved_at timestamptz;

-- ---------------------------------------------- de qué ciclo salió el plan
-- `cycle_position` dice qué sesión fue, y `cycle_id` de qué ciclo.
--
-- Hacen falta los dos: con solo la posición, cambiar de ciclo dejaría números
-- que ya no significan nada —una posición 4 en un ciclo de 3— y no habría
-- forma de saber que ese entrenamiento pertenecía a la estructura anterior.

alter table public.workout_plans
  add column if not exists cycle_id uuid
    references public.weekly_splits on delete set null;

alter table public.workout_plans
  add column if not exists cycle_position int
    check (cycle_position is null or cycle_position between 1 and 7);

-- --------------------------------------------------- conversión de lo que hay
-- Los repartos existentes se convierten respetando su orden de semana:
-- lunes → 1, miércoles → 2, viernes → 3. Nadie pierde su estructura.
--
-- Solo se tocan las filas que aún no tienen `cycle`, así que relanzar la
-- migración no vuelve a numerar nada.

with expandido as (
  select
    s.id,
    e.elem ->> 'label' as label,
    e.elem ->> 'focus' as focus,
    -- Los días irreconocibles van al final en vez de tumbar la conversión.
    coalesce(
      array_position(
        array['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'],
        e.elem ->> 'day'
      ),
      99
    ) as orden_semana,
    e.ord as orden_original
  from public.weekly_splits s
  cross join lateral jsonb_array_elements(s.days) with ordinality as e(elem, ord)
  where s.cycle is null
    and jsonb_typeof(s.days) = 'array'
    and jsonb_array_length(s.days) > 0
),

numerado as (
  select
    id,
    label,
    focus,
    row_number() over (
      partition by id
      order by orden_semana, orden_original
    ) as position
  from expandido
),

agregado as (
  select
    id,
    jsonb_agg(
      jsonb_build_object(
        'position', position,
        'label', coalesce(label, ''),
        'focus', coalesce(focus, '')
      )
      order by position
    ) as cycle
  from numerado
  group by id
)

update public.weekly_splits s
set cycle = a.cycle
from agregado a
where s.id = a.id;

-- Los que ya estaban vigentes se dan por aprobados: el usuario llevaba
-- entrenando con ellos, así que pedirle que los apruebe otra vez sería
-- preguntarle por algo que ya decidió.
-- El filtro por `days` distingue lo viejo de lo nuevo: las filas anteriores al
-- cambio lo tienen relleno porque era `not null`, y las que inserta la app a
-- partir de ahora lo dejan vacío. Así relanzar la migración no convierte en
-- archivado un borrador legítimo que esté esperando aprobación.
update public.weekly_splits
set status = case when active then 'active' else 'archived' end,
    approved_at = case when active then created_at else null end
where status = 'draft'
  and days is not null;

-- `days` deja de escribirse: la app inserta ciclos sin esa columna, y con el
-- `not null` de 0022 esos insert fallarían. Se queda como historial de la
-- forma anterior en vez de borrarse, que no tiene vuelta atrás.
alter table public.weekly_splits
  alter column days drop not null;

-- Solo un ciclo vigente por usuario. Antes era una convención que dependía de
-- que todo el mundo recordara desactivar el anterior; ahora lo impide la base.
create unique index if not exists weekly_splits_one_active_idx
  on public.weekly_splits (user_id)
  where status = 'active';

-- ----------------------------------------------------------- aprobación
/**
 * Aprueba un borrador: archiva el ciclo vigente y activa este, en una sola
 * transacción.
 *
 * Va como función y no como dos updates desde la app porque entre uno y otro
 * el usuario se quedaría sin ciclo vigente, y el índice único de arriba haría
 * fallar el segundo si se hicieran en el orden contrario. Aquí o pasan las dos
 * cosas o no pasa ninguna.
 *
 * Sin `security definer` a propósito: se ejecuta con los permisos de quien
 * llama, así que RLS ya impide tocar los ciclos de otro. El `auth.uid()` del
 * where lo deja escrito además de comprobado.
 */
create or replace function public.approve_training_cycle(p_cycle_id uuid)
returns public.weekly_splits
language plpgsql
set search_path = ''
as $$
declare
  aprobado public.weekly_splits;
begin
  update public.weekly_splits
  set status = 'archived',
      active = false
  where user_id = (select auth.uid())
    and status = 'active'
    and id <> p_cycle_id;

  update public.weekly_splits
  set status = 'active',
      active = true,
      approved_at = coalesce(approved_at, now())
  where id = p_cycle_id
    and user_id = (select auth.uid())
  returning * into aprobado;

  -- `found` lo pone el update anterior: si no tocó ninguna fila, o el ciclo no
  -- existe o es de otro usuario y RLS lo ocultó. Da igual cuál de las dos: al
  -- que llama no se le dice si existe algo que no es suyo.
  if not found then
    raise exception 'No se encontró el ciclo a aprobar';
  end if;

  return aprobado;
end;
$$;

revoke all on function public.approve_training_cycle(uuid) from public, anon;
grant execute on function public.approve_training_cycle(uuid) to authenticated;

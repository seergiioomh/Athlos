-- Racha de entrenamientos completados.
--
-- Cuenta entrenamientos seguidos, no días naturales: descansar forma parte
-- del plan, así que una racha diaria estricta se rompería siempre. La racha
-- sigue viva mientras no pases más de `p_max_gap` días sin entrenar, y ese
-- margen lo calcula la app a partir de los días por semana del usuario.

create or replace function public.workout_streak(
  p_user_id uuid,
  p_max_gap int default 2
)
returns int
language plpgsql
stable
as $$
declare
  fecha date;
  anterior date := null;
  racha int := 0;
begin
  for fecha in
    select distinct finished_at::date as dia
    from public.workout_sessions
    where user_id = p_user_id
      and finished_at is not null
    order by dia desc
  loop
    if anterior is null then
      -- Si el último entrenamiento ya queda lejos, la racha está rota
      -- aunque antes hubiera veinte seguidos.
      if current_date - fecha > p_max_gap then
        return 0;
      end if;
    elsif anterior - fecha > p_max_gap then
      exit;
    end if;

    racha := racha + 1;
    anterior := fecha;
  end loop;

  return racha;
end;
$$;

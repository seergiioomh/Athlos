-- Caducidad de la conversación con el coach.
--
-- El chat no tiene por qué crecer para siempre: lo hablado hace semanas ya no
-- aporta contexto y sí ocupa sitio y tokens en cada petición. Se conservan
-- los últimos días y el resto se borra solo.
--
-- Las propuestas viven en los propios mensajes, así que las que caduquen sin
-- resolver desaparecen con ellos. No es pérdida: una propuesta de hace cinco
-- días ya no encaja con el entrenamiento de hoy. Lo que sí se aplicó siguió
-- su camino a `plan_exercises` o `profiles` y no depende del chat.

create or replace function public.prune_coach_messages(
  p_user_id uuid,
  p_days int default 5
)
returns int
language plpgsql
as $$
declare
  borrados int;
begin
  delete from public.coach_messages
  where user_id = p_user_id
    and created_at < now() - make_interval(days => p_days);

  get diagnostics borrados = row_count;

  return borrados;
end;
$$;

create index if not exists coach_messages_created_idx
  on public.coach_messages (created_at);

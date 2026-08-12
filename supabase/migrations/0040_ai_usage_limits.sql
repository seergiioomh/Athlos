-- Límite diario de uso de IA por usuario.
--
-- Las tres funciones de IA usan la clave del proyecto. El límite vive aquí,
-- antes de llamar al modelo, para que no se pueda saltar desde una app
-- modificada ni gastar por encima de lo previsto con peticiones paralelas.

create table public.ai_daily_usage (
  user_id uuid not null references auth.users on delete cascade,
  usage_date date not null default current_date,
  action text not null check (action in ('workout', 'cycle', 'coach')),
  requests int not null default 0 check (requests >= 0),
  primary key (user_id, usage_date, action)
);

alter table public.ai_daily_usage enable row level security;

/**
 * Consume una solicitud si el usuario aún tiene cuota hoy.
 *
 * Un único INSERT ... ON CONFLICT hace la comprobación y el incremento de
 * forma atómica: dos peticiones simultáneas no pueden pasar ambas el último
 * hueco. Solo las Edge Functions (service role) pueden ejecutarla.
 */
create or replace function public.consume_ai_usage(
  p_user uuid,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_requests int;
begin
  v_limit := case p_action
    when 'workout' then 3
    when 'cycle' then 2
    when 'coach' then 20
    else null
  end;

  if v_limit is null then
    raise exception 'Acción de IA no reconocida';
  end if;

  insert into public.ai_daily_usage (user_id, usage_date, action, requests)
  values (p_user, current_date, p_action, 1)
  on conflict (user_id, usage_date, action) do update
    set requests = ai_daily_usage.requests + 1
    where ai_daily_usage.requests < v_limit
  returning requests into v_requests;

  return v_requests is not null;
end;
$$;

revoke all on table public.ai_daily_usage from public, anon, authenticated;
revoke execute on function public.consume_ai_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text) to service_role;

-- Propuestas de cambio del coach.
--
-- Cuelgan del mensaje que las generó, y no de una tabla aparte, para que al
-- recargar la conversación la tarjeta de confirmación siga donde estaba y se
-- vea qué se aplicó y qué se descartó.

alter table public.coach_messages
  add column proposal jsonb,
  add column proposal_status text
    check (proposal_status in ('pendiente', 'aplicada', 'descartada'));

-- Una propuesta sin estado, o un estado sin propuesta, no significan nada.
alter table public.coach_messages
  add constraint coach_messages_proposal_coherente
  check (
    (proposal is null and proposal_status is null)
    or (proposal is not null and proposal_status is not null)
  );

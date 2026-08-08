-- Más contexto para la IA en la bienvenida.
--
-- La idea de fondo: un modelo saca más de una frase escrita por el usuario que
-- de tres selectores. Se añade un campo libre, se abre el catálogo de objetivos
-- y se pregunta por el deporte que practica fuera del gimnasio.
--
-- No se borra ninguna columna. `focus_areas`, `sleep_hours`, `daily_activity` y
-- `cardio` dejan de preguntarse en la bienvenida, pero siguen existiendo y
-- siguen viajando al prompt: hay perfiles con esos datos ya rellenos, y un
-- `drop column` no tiene vuelta atrás.

-- ------------------------------------------------------------------ objetivo
-- De cuatro opciones a seis. `mantener` sale de la interfaz pero se mantiene
-- aceptado: si un perfil ya lo tiene guardado, quitarlo de la restricción haría
-- fallar su siguiente guardado. Reescribir la respuesta de alguien para que
-- encaje en el catálogo nuevo es peor que aceptar un valor histórico.

-- Se busca por definición y no por nombre. `drop constraint if exists` con el
-- nombre que Postgres suele generar no falla si no acierta: simplemente no
-- borra, y quedarían dos restricciones sobre la misma columna con la vieja
-- rechazando los valores nuevos. Un fallo que no se ve hasta que un usuario
-- elige "rendimiento" y no puede guardar.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%goal%'
      and pg_get_constraintdef(oid) not ilike '%goal_notes%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_goal_check
  check (
    goal in (
      'ganar-musculo',
      'perder-grasa',
      'fuerza',
      'rendimiento',
      'condicion-fisica',
      'recomposicion',
      'mantener'
    )
  );

-- ------------------------------------------------------------ campo libre
-- La pieza con más valor del rediseño. Una etiqueta dice "ganar músculo"; esto
-- dice "ganar músculo y mejorar mi velocidad para fútbol", que es lo que
-- permite programar de verdad.
--
-- El tope de 500 evita que alguien pegue tres páginas y desplace al resto del
-- contexto dentro del prompt.

alter table public.profiles
  add column if not exists goal_notes text
    check (goal_notes is null or length(goal_notes) <= 500);

-- --------------------------------------------------------------- deporte
-- Condiciona la recuperación tanto como el sueño: quien juega al fútbol dos
-- días ya está metiendo carga de piernas que el plan no debería duplicar.
--
-- 'ninguno' es un valor explícito y no un null, para distinguir "no practica
-- nada" de "no se le ha preguntado" — las cuentas anteriores al cambio se
-- quedan en null.

alter table public.profiles
  add column if not exists sport text
    check (
      sport is null
      or sport in ('ninguno', 'futbol', 'running', 'baloncesto', 'ciclismo', 'otro')
    );

alter table public.profiles
  add column if not exists sport_days int
    check (sport_days is null or sport_days between 1 and 7);

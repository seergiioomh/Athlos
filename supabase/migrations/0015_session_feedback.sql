-- Valoración de la sesión.
--
-- Son los datos que el usuario ya venía anotando a mano: nota, energía antes
-- y durante, si había comido bien, molestias y comentarios. Valen para él y,
-- sobre todo, para el coach: explican por qué una sesión salió floja mucho
-- mejor que los kilos levantados.

alter table public.workout_sessions
  -- Grupo trabajado, tal y como lo escribe el usuario: "Pull", "Empuje"...
  add column focus text,

  add column rating int check (rating between 1 and 10),
  add column energy_before int check (energy_before between 1 and 10),
  add column energy_during int check (energy_during between 1 and 10),
  add column ate_well boolean,
  add column discomfort text;

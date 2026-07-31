-- Datos de la persona, recogidos en el formulario de bienvenida.
--
-- Son la base sobre la que la IA programa: sin objetivo, nivel, días
-- disponibles y material, cualquier rutina que proponga es a ciegas.

alter table public.profiles
  -- Guardamos el año de nacimiento y no la edad: la edad caduca sola.
  add column birth_year int
    check (birth_year between 1920 and extract(year from now())::int),

  add column sex text
    check (sex in ('hombre', 'mujer', 'otro')),

  add column height_cm int
    check (height_cm between 100 and 250),

  add column weight_kg numeric(5, 2)
    check (weight_kg between 30 and 300),

  add column goal text
    check (goal in ('perder-grasa', 'ganar-musculo', 'fuerza', 'mantener')),

  add column experience text
    check (experience in ('principiante', 'intermedio', 'avanzado')),

  add column days_per_week int
    check (days_per_week between 1 and 7),

  add column equipment text
    check (equipment in ('gimnasio', 'casa', 'corporal')),

  -- Lesiones o limitaciones, en las palabras del usuario. Va tal cual al
  -- prompt: es justo lo que no se puede encasillar en un desplegable.
  add column limitations text,

  -- Marca de formulario terminado. Es lo que mira la app al arrancar para
  -- decidir si enseña la bienvenida o la aplicación.
  add column onboarded_at timestamptz;

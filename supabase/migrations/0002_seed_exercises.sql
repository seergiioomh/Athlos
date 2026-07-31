-- Catálogo inicial de ejercicios.
--
-- La IA elige de aquí por `slug`, así que este catálogo es el límite de lo
-- que puede proponer. Ampliarlo es solo añadir filas.

insert into public.exercises (slug, name, muscle_group, is_bodyweight) values
  ('press-banca',            'Press banca',              'Pecho',            false),
  ('press-inclinado',        'Press inclinado',          'Pecho superior',   false),
  ('aperturas',              'Aperturas con mancuerna',  'Pecho',            false),
  ('press-militar',          'Press militar',            'Hombro',           false),
  ('elevaciones-laterales',  'Elevaciones laterales',    'Deltoides',        false),
  ('fondos',                 'Fondos en paralelas',      'Tríceps',          true),
  ('extension-triceps',      'Extensión de tríceps',     'Tríceps',          false),
  ('dominadas',              'Dominadas',                'Espalda',          true),
  ('remo-barra',             'Remo con barra',           'Espalda',          false),
  ('jalon-pecho',            'Jalón al pecho',           'Dorsal',           false),
  ('curl-biceps',            'Curl de bíceps',           'Bíceps',           false),
  ('curl-martillo',          'Curl martillo',            'Bíceps',           false),
  ('sentadilla',             'Sentadilla',               'Cuádriceps',       false),
  ('prensa',                 'Prensa de piernas',        'Cuádriceps',       false),
  ('peso-muerto',            'Peso muerto',              'Cadena posterior', false),
  ('zancadas',               'Zancadas',                 'Glúteo',           false),
  ('curl-femoral',           'Curl femoral',             'Isquiotibiales',   false),
  ('elevacion-gemelos',      'Elevación de gemelos',     'Gemelos',          false),
  ('plancha',                'Plancha',                  'Core',             true),
  ('elevacion-piernas',      'Elevación de piernas',     'Core',             true)
on conflict (slug) do nothing;

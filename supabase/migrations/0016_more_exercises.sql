-- Ejercicios que aparecen en los entrenamientos ya registrados a mano y que
-- no estaban en el catálogo inicial.
--
-- El catálogo es el límite de lo que la IA puede proponer, así que ampliarlo
-- también amplía lo que el coach tiene disponible.

insert into public.exercises (slug, name, muscle_group, is_bodyweight) values
  ('remo-maquina',      'Remo en máquina',        'Espalda',        false),
  ('remo-unilateral',   'Remo unilateral',        'Espalda',        false),
  ('face-pull',         'Face pull',              'Deltoides post.', false),
  ('curl-inclinado',    'Curl bíceps inclinado',  'Bíceps',         false),
  ('curl-scott',        'Curl en banco Scott',    'Bíceps',         false),
  ('press-mancuernas',  'Press con mancuernas',   'Pecho',          false),
  ('elevacion-frontal', 'Elevación frontal',      'Hombro',         false),
  ('pajaros',           'Pájaros',                'Deltoides post.', false),
  ('encogimientos',     'Encogimientos',          'Trapecio',       false),
  ('hip-thrust',        'Hip thrust',             'Glúteo',         false),
  ('extension-cuadriceps', 'Extensión de cuádriceps', 'Cuádriceps', false),
  ('peso-muerto-rumano',   'Peso muerto rumano',      'Isquiotibiales', false)
on conflict (slug) do nothing;

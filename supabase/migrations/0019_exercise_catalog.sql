-- Catálogo completo de ejercicios.
--
-- Además de ampliarlo, le da la estructura que le faltaba. Con solo
-- `muscle_group` la IA no podía saber si un ejercicio necesita barra o si
-- sirve en casa, así que la regla "adapta al material" era un deseo, no algo
-- comprobable. Ahora cada ejercicio declara su equipamiento y su patrón de
-- movimiento, y la función filtra el catálogo antes de enseñárselo al modelo.

alter table public.exercises
  add column equipment text not null default 'otro'
    check (equipment in (
      'barra', 'mancuernas', 'maquina', 'polea',
      'peso-corporal', 'kettlebell', 'banda', 'otro'
    )),

  -- Patrón de movimiento. Sirve para equilibrar la sesión: dos empujes
  -- horizontales seguidos no son un buen entrenamiento.
  add column pattern text not null default 'aislamiento'
    check (pattern in (
      'empuje-horizontal', 'empuje-vertical',
      'tiron-horizontal', 'tiron-vertical',
      'rodilla', 'cadera', 'core', 'aislamiento', 'completo'
    )),

  -- Los compuestos van primero en la sesión, cuando queda fuerza.
  add column is_compound boolean not null default false;

-- ------------------------------------------- los que ya estaban en la tabla

update public.exercises set equipment = 'barra',         pattern = 'empuje-horizontal', is_compound = true  where slug = 'press-banca';
update public.exercises set equipment = 'barra',         pattern = 'empuje-horizontal', is_compound = true  where slug = 'press-inclinado';
update public.exercises set equipment = 'mancuernas',    pattern = 'empuje-horizontal', is_compound = true  where slug = 'press-mancuernas';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'aperturas';
update public.exercises set equipment = 'barra',         pattern = 'empuje-vertical',   is_compound = true  where slug = 'press-militar';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'elevaciones-laterales';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'elevacion-frontal';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'pajaros';
update public.exercises set equipment = 'polea',         pattern = 'aislamiento'                            where slug = 'face-pull';
update public.exercises set equipment = 'peso-corporal', pattern = 'empuje-vertical',   is_compound = true  where slug = 'fondos';
update public.exercises set equipment = 'polea',         pattern = 'aislamiento'                            where slug = 'extension-triceps';
update public.exercises set equipment = 'peso-corporal', pattern = 'tiron-vertical',    is_compound = true  where slug = 'dominadas';
update public.exercises set equipment = 'barra',         pattern = 'tiron-horizontal',  is_compound = true  where slug = 'remo-barra';
update public.exercises set equipment = 'maquina',       pattern = 'tiron-horizontal',  is_compound = true  where slug = 'remo-maquina';
update public.exercises set equipment = 'mancuernas',    pattern = 'tiron-horizontal',  is_compound = true  where slug = 'remo-unilateral';
update public.exercises set equipment = 'polea',         pattern = 'tiron-vertical',    is_compound = true  where slug = 'jalon-pecho';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'encogimientos';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'curl-biceps';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'curl-martillo';
update public.exercises set equipment = 'mancuernas',    pattern = 'aislamiento'                            where slug = 'curl-inclinado';
update public.exercises set equipment = 'barra',         pattern = 'aislamiento'                            where slug = 'curl-scott';
update public.exercises set equipment = 'barra',         pattern = 'rodilla',           is_compound = true  where slug = 'sentadilla';
update public.exercises set equipment = 'maquina',       pattern = 'rodilla',           is_compound = true  where slug = 'prensa';
update public.exercises set equipment = 'maquina',       pattern = 'aislamiento'                            where slug = 'extension-cuadriceps';
update public.exercises set equipment = 'barra',         pattern = 'cadera',            is_compound = true  where slug = 'peso-muerto';
update public.exercises set equipment = 'barra',         pattern = 'cadera',            is_compound = true  where slug = 'peso-muerto-rumano';
update public.exercises set equipment = 'mancuernas',    pattern = 'rodilla',           is_compound = true  where slug = 'zancadas';
update public.exercises set equipment = 'maquina',       pattern = 'aislamiento'                            where slug = 'curl-femoral';
update public.exercises set equipment = 'barra',         pattern = 'cadera',            is_compound = true  where slug = 'hip-thrust';
update public.exercises set equipment = 'maquina',       pattern = 'aislamiento'                            where slug = 'elevacion-gemelos';
update public.exercises set equipment = 'peso-corporal', pattern = 'core'                                   where slug = 'plancha';
update public.exercises set equipment = 'peso-corporal', pattern = 'core'                                   where slug = 'elevacion-piernas';

-- ------------------------------------------------------------ ampliación

insert into public.exercises (slug, name, muscle_group, is_bodyweight, equipment, pattern, is_compound) values
  -- Pecho
  ('press-declinado',            'Press declinado',                  'Pecho',            false, 'barra',         'empuje-horizontal', true),
  ('press-inclinado-mancuernas', 'Press inclinado con mancuernas',   'Pecho superior',   false, 'mancuernas',    'empuje-horizontal', true),
  ('press-pecho-maquina',        'Press de pecho en máquina',        'Pecho',            false, 'maquina',       'empuje-horizontal', true),
  ('press-suelo',                'Press en el suelo',                'Pecho',            false, 'mancuernas',    'empuje-horizontal', true),
  ('aperturas-polea',            'Aperturas en polea',               'Pecho',            false, 'polea',         'aislamiento',       false),
  ('aperturas-maquina',          'Aperturas en máquina',             'Pecho',            false, 'maquina',       'aislamiento',       false),
  ('cruces-polea-alta',          'Cruces en polea alta',             'Pecho',            false, 'polea',         'aislamiento',       false),
  ('pullover-mancuerna',         'Pullover con mancuerna',           'Pecho',            false, 'mancuernas',    'aislamiento',       false),
  ('flexiones',                  'Flexiones',                        'Pecho',            true,  'peso-corporal', 'empuje-horizontal', true),
  ('flexiones-inclinadas',       'Flexiones inclinadas',             'Pecho',            true,  'peso-corporal', 'empuje-horizontal', true),
  ('flexiones-declinadas',       'Flexiones declinadas',             'Pecho superior',   true,  'peso-corporal', 'empuje-horizontal', true),
  ('flexiones-diamante',         'Flexiones diamante',               'Tríceps',          true,  'peso-corporal', 'empuje-horizontal', true),

  -- Espalda
  ('dominadas-supinas',          'Dominadas supinas',                'Espalda',          true,  'peso-corporal', 'tiron-vertical',    true),
  ('dominadas-neutras',          'Dominadas agarre neutro',          'Espalda',          true,  'peso-corporal', 'tiron-vertical',    true),
  ('dominadas-asistidas',        'Dominadas asistidas',              'Espalda',          false, 'maquina',       'tiron-vertical',    true),
  ('jalon-supino',               'Jalón supino',                     'Dorsal',           false, 'polea',         'tiron-vertical',    true),
  ('jalon-neutro',               'Jalón agarre neutro',              'Dorsal',           false, 'polea',         'tiron-vertical',    true),
  ('remo-mancuerna',             'Remo con mancuerna',               'Espalda',          false, 'mancuernas',    'tiron-horizontal',  true),
  ('remo-polea-baja',            'Remo en polea baja',               'Espalda',          false, 'polea',         'tiron-horizontal',  true),
  ('remo-t',                     'Remo en T',                        'Espalda',          false, 'barra',         'tiron-horizontal',  true),
  ('remo-pendlay',               'Remo Pendlay',                     'Espalda',          false, 'barra',         'tiron-horizontal',  true),
  ('remo-invertido',             'Remo invertido',                   'Espalda',          true,  'peso-corporal', 'tiron-horizontal',  true),
  ('pullover-polea',             'Pullover en polea',                'Dorsal',           false, 'polea',         'aislamiento',       false),
  ('hiperextensiones',           'Hiperextensiones',                 'Lumbar',           true,  'peso-corporal', 'cadera',            false),
  ('buenos-dias',                'Buenos días',                      'Cadena posterior', false, 'barra',         'cadera',            true),
  ('encogimientos-barra',        'Encogimientos con barra',          'Trapecio',         false, 'barra',         'aislamiento',       false),

  -- Hombro
  ('press-militar-mancuernas',   'Press militar con mancuernas',     'Hombro',           false, 'mancuernas',    'empuje-vertical',   true),
  ('press-arnold',               'Press Arnold',                     'Hombro',           false, 'mancuernas',    'empuje-vertical',   true),
  ('press-hombro-maquina',       'Press de hombro en máquina',       'Hombro',           false, 'maquina',       'empuje-vertical',   true),
  ('elevaciones-laterales-polea','Elevaciones laterales en polea',   'Deltoides',        false, 'polea',         'aislamiento',       false),
  ('elevaciones-laterales-maquina','Elevaciones laterales en máquina','Deltoides',       false, 'maquina',       'aislamiento',       false),
  ('pajaros-polea',              'Pájaros en polea',                 'Deltoides post.',  false, 'polea',         'aislamiento',       false),
  ('pajaros-maquina',            'Pájaros en máquina',               'Deltoides post.',  false, 'maquina',       'aislamiento',       false),
  ('remo-al-menton',             'Remo al mentón',                   'Hombro',           false, 'barra',         'tiron-vertical',    false),
  ('pike-push-up',               'Pike push-up',                     'Hombro',           true,  'peso-corporal', 'empuje-vertical',   true),

  -- Tríceps
  ('extension-triceps-cuerda',   'Extensión de tríceps con cuerda',  'Tríceps',          false, 'polea',         'aislamiento',       false),
  ('extension-triceps-sobre-cabeza','Extensión de tríceps sobre la cabeza','Tríceps',    false, 'mancuernas',    'aislamiento',       false),
  ('extension-triceps-maquina',  'Extensión de tríceps en máquina',  'Tríceps',          false, 'maquina',       'aislamiento',       false),
  ('press-frances',              'Press francés',                    'Tríceps',          false, 'barra',         'aislamiento',       false),
  ('press-cerrado',              'Press banca agarre cerrado',       'Tríceps',          false, 'barra',         'empuje-horizontal', true),
  ('patada-triceps',             'Patada de tríceps',                'Tríceps',          false, 'mancuernas',    'aislamiento',       false),
  ('fondos-banco',               'Fondos en banco',                  'Tríceps',          true,  'peso-corporal', 'empuje-vertical',   false),

  -- Bíceps y antebrazo
  ('curl-barra',                 'Curl con barra',                   'Bíceps',           false, 'barra',         'aislamiento',       false),
  ('curl-barra-z',               'Curl con barra Z',                 'Bíceps',           false, 'barra',         'aislamiento',       false),
  ('curl-concentrado',           'Curl concentrado',                 'Bíceps',           false, 'mancuernas',    'aislamiento',       false),
  ('curl-polea',                 'Curl en polea',                    'Bíceps',           false, 'polea',         'aislamiento',       false),
  ('curl-arana',                 'Curl araña',                       'Bíceps',           false, 'mancuernas',    'aislamiento',       false),
  ('curl-invertido',             'Curl invertido',                   'Antebrazo',        false, 'barra',         'aislamiento',       false),
  ('curl-maquina',               'Curl de bíceps en máquina',        'Bíceps',           false, 'maquina',       'aislamiento',       false),
  ('curl-muneca',                'Curl de muñeca',                   'Antebrazo',        false, 'mancuernas',    'aislamiento',       false),
  ('paseo-granjero',             'Paseo del granjero',               'Antebrazo',        false, 'mancuernas',    'completo',          true),
  ('colgarse-barra',             'Colgarse de la barra',             'Antebrazo',        true,  'peso-corporal', 'aislamiento',       false),

  -- Cuádriceps
  ('sentadilla-frontal',         'Sentadilla frontal',               'Cuádriceps',       false, 'barra',         'rodilla',           true),
  ('sentadilla-goblet',          'Sentadilla goblet',                'Cuádriceps',       false, 'mancuernas',    'rodilla',           true),
  ('sentadilla-bulgara',         'Sentadilla búlgara',               'Cuádriceps',       false, 'mancuernas',    'rodilla',           true),
  ('sentadilla-hack',            'Hack squat',                       'Cuádriceps',       false, 'maquina',       'rodilla',           true),
  ('sentadilla-pared',           'Sentadilla isométrica en pared',   'Cuádriceps',       true,  'peso-corporal', 'rodilla',           false),
  ('sentadilla-salto',           'Sentadilla con salto',             'Cuádriceps',       true,  'peso-corporal', 'rodilla',           true),
  ('zancadas-caminando',         'Zancadas caminando',               'Cuádriceps',       false, 'mancuernas',    'rodilla',           true),
  ('step-up',                    'Subida al cajón',                  'Cuádriceps',       false, 'mancuernas',    'rodilla',           true),
  ('peso-muerto-sumo',           'Peso muerto sumo',                 'Cadena posterior', false, 'barra',         'cadera',            true),

  -- Isquiotibiales y glúteo
  ('peso-muerto-una-pierna',     'Peso muerto a una pierna',         'Isquiotibiales',   false, 'mancuernas',    'cadera',            true),
  ('curl-femoral-tumbado',       'Curl femoral tumbado',             'Isquiotibiales',   false, 'maquina',       'aislamiento',       false),
  ('curl-nordico',               'Curl nórdico',                     'Isquiotibiales',   true,  'peso-corporal', 'aislamiento',       false),
  ('puente-gluteo',              'Puente de glúteo',                 'Glúteo',           true,  'peso-corporal', 'cadera',            false),
  ('patada-gluteo-polea',        'Patada de glúteo en polea',        'Glúteo',           false, 'polea',         'aislamiento',       false),
  ('abduccion-maquina',          'Abducción en máquina',             'Glúteo medio',     false, 'maquina',       'aislamiento',       false),
  ('aduccion-maquina',           'Aducción en máquina',              'Aductores',        false, 'maquina',       'aislamiento',       false),

  -- Gemelos
  ('elevacion-gemelos-pie',      'Elevación de gemelos de pie',      'Gemelos',          false, 'barra',         'aislamiento',       false),
  ('elevacion-gemelos-sentado',  'Elevación de gemelos sentado',     'Gemelos',          false, 'maquina',       'aislamiento',       false),
  ('elevacion-gemelos-prensa',   'Elevación de gemelos en prensa',   'Gemelos',          false, 'maquina',       'aislamiento',       false),

  -- Core
  ('plancha-lateral',            'Plancha lateral',                  'Core',             true,  'peso-corporal', 'core',              false),
  ('elevacion-piernas-colgado',  'Elevación de piernas colgado',     'Core',             true,  'peso-corporal', 'core',              false),
  ('crunch',                     'Crunch abdominal',                 'Core',             true,  'peso-corporal', 'core',              false),
  ('crunch-polea',               'Crunch en polea',                  'Core',             false, 'polea',         'core',              false),
  ('rueda-abdominal',            'Rueda abdominal',                  'Core',             false, 'otro',          'core',              false),
  ('russian-twist',              'Russian twist',                    'Oblicuos',         false, 'mancuernas',    'core',              false),
  ('pallof-press',               'Pallof press',                     'Core',             false, 'polea',         'core',              false),
  ('mountain-climbers',          'Mountain climbers',                'Core',             true,  'peso-corporal', 'core',              false),
  ('hollow-hold',                'Hollow hold',                      'Core',             true,  'peso-corporal', 'core',              false),
  ('dead-bug',                   'Dead bug',                         'Core',             true,  'peso-corporal', 'core',              false),
  ('bicicleta-abdominal',        'Bicicleta abdominal',              'Oblicuos',          true,  'peso-corporal', 'core',              false),
  ('v-ups',                      'V-ups',                            'Core',             true,  'peso-corporal', 'core',              false),

  -- Cuerpo completo
  ('burpees',                    'Burpees',                          'Cuerpo completo',  true,  'peso-corporal', 'completo',          true),
  ('kettlebell-swing',           'Kettlebell swing',                 'Cadena posterior', false, 'kettlebell',    'cadera',            true),
  ('turkish-get-up',             'Turkish get-up',                   'Cuerpo completo',  false, 'kettlebell',    'completo',          true),
  ('thruster',                   'Thruster',                         'Cuerpo completo',  false, 'barra',         'completo',          true),
  ('clean-and-press',            'Cargada y press',                  'Cuerpo completo',  false, 'barra',         'completo',          true),
  ('box-jump',                   'Salto al cajón',                   'Cuádriceps',       true,  'peso-corporal', 'rodilla',           true),
  ('saltos-comba',               'Saltos a la comba',                'Cuerpo completo',  false, 'otro',          'completo',          false),
  ('battle-ropes',               'Cuerdas de batalla',               'Cuerpo completo',  false, 'otro',          'completo',          false),

  -- Bandas, para casa
  ('remo-banda',                 'Remo con banda elástica',          'Espalda',          false, 'banda',         'tiron-horizontal',  true),
  ('press-banda',                'Press de pecho con banda',         'Pecho',            false, 'banda',         'empuje-horizontal', true),
  ('abduccion-banda',            'Abducción con banda',              'Glúteo medio',     false, 'banda',         'aislamiento',       false),
  ('face-pull-banda',            'Face pull con banda',              'Deltoides post.',  false, 'banda',         'aislamiento',       false)
on conflict (slug) do nothing;

# ATHLOS — contexto del proyecto

Documento de arranque para una sesión nueva. Recoge lo que **no se deduce
leyendo el código**: las decisiones tomadas, por qué se tomaron, y los sitios
donde ya nos hemos equivocado una vez.

Última actualización: **20 de agosto de 2026**.

Complementa, no sustituye:

- `AGENTS.md` — reglas mínimas, se carga solo en cada sesión
- `ROADMAP.md` — la visión original
- `supabase/README.md` — puesta en marcha del backend, paso a paso
- `BATALLAS.md` — diseño de las batallas y **en qué paso va**. A medias: si
  vas a seguir por ahí, empieza por ese documento

---

## Empieza aquí

**La app funciona y está instalada en el iPhone del autor**, con una
development build al día. Todo lo escrito está commiteado y subido a
`origin/main`.

Cuatro cosas que conviene saber antes de tocar nada:

1. **El entrenamiento va por CICLO, no por días de la semana.** Es el cambio
   estructural más grande y toca casi todo. Ver *Conceptos del dominio*.

2. **La confirmación de correo está ACTIVADA.** Con ella, el registro no abre
   sesión hasta abrir el enlace del correo. Ese enlace vuelve a la app por
   `athlos://confirm`, que tiene que estar dada de alta en *Authentication →
   URL Configuration*; si no, Supabase manda al *Site URL* y en un móvil no
   abre nada.

3. **`0025_remove_dev_user.sql` no se ejecuta nunca.** Borraría la cuenta real
   del autor. Está desactivado, pero el nombre engaña.

4. **El estado del servidor no vive en git.** Las migraciones aplicadas, los
   secretos, las funciones desplegadas y el cron se configuran a mano en
   Supabase. Que un archivo esté en el repositorio no significa que su SQL se
   haya ejecutado.

   Se puede comprobar sin entrar al panel. Las funciones:

   ```bash
   npx supabase functions list --project-ref dcuvfhbqoteodzzldocc
   ```

   Y si una migración se aplicó, preguntando por una columna que solo ella
   crea: `GET /rest/v1/<tabla>?select=<columna>&limit=1` con la clave anon. Si
   existe devuelve `[]` aunque RLS tape las filas; si no, un error `42703`
   diciendo que la columna no existe.

   **Con funciones RPC esto no vale**: PostgREST responde 404 tanto si no
   existe como si simplemente no la expone, así que da falsos negativos con
   funciones que sí están aplicadas.

---

## Qué es

Un entrenador personal con IA, en español, para iPhone. No es una app de
registro de gimnasio: la idea es que el entrenador **conozca al usuario, le
acompañe y decida con él**. El entrenamiento del día, el ciclo de entrenamiento
y los consejos los genera Claude a partir del perfil y del historial real.

Autor: Sergio Mateos. Uso propio de momento.

**Todo va en español**: interfaz, mensajes de error, comentarios del código y
mensajes de commit.

---

## Estado actual

### Funciona

Acceso y registro · bienvenida en 7 pasos · inicio con el entrenamiento del día
· pantalla de entrenamiento con objetivos y registro de series · pantalla de
fin de entrenamiento con resumen y sensaciones · chat con el coach y propuestas
aplicables · progreso con peso, actividad comparada y marcas por grupo · perfil
· ciclo de entrenamiento · pantalla de rachas · logros · batallas entre
amigos · recordatorios push.

Compartir un entrenamiento por enlace **está construido pero oculto**: el botón
se retiró de la hoja de previsualización porque el enlace no llega usable. Ver
Pendiente.

### Cambios recientes — 20 de agosto de 2026

- **Progreso más visual y compacto.** Debajo de la gráfica de peso hay un
  heatmap rosa de cuatro semanas completas; una casilla encendida significa
  que se terminó un entrenamiento y al tocarla se abre el detalle real de
  ejercicios y series. Se retiró «Tu actividad»: las comparaciones agregadas
  ocupaban mucho espacio y aportaban menos que el historial y las marcas.
- **El sueño sale del producto.** Ya no se pregunta al editar el perfil ni se
  envía a ninguna función de IA. La columna antigua permanece sin uso para no
  introducir una migración destructiva.
- **Una sesión abierta sobrevive al cierre de la app.** `0049` añade
  `workout_sessions.draft_state`: conserva campos todavía sin cerrar, ejercicio
  actual y fin del descanso. Al volver se combina con `session_sets`, que sigue
  mandando sobre qué series están realmente completadas.
- **Un entrenamiento por día, descansos que aconsejan.** Ver "El calendario dice
  cuándo, el ciclo dice qué" en Conceptos del dominio. Toca la tarjeta de
  Inicio, la pestaña Entrenar y `generate-workout`. **La función hay que
  volver a desplegarla**: no es una migración.
- **La zona horaria se guarda al entrar.** Estaba dentro del registro de push y
  se perdía para todo el que rechazaba las notificaciones, así que el servidor
  no sabía qué día era para esa persona. Afectaba ya a los recordatorios.
- **Los mensajes de las Edge Functions llegan al usuario.** `functions.invoke`
  devolvía siempre "Edge Function returned a non-2xx status code"; el texto real
  viaja en `context`. El aviso del límite de IA tampoco se veía.

### Cambios recientes — 12 de agosto de 2026

- **Bienvenida neutral.** Los ejemplos de los campos no contienen datos ni
  contexto del autor: sirven como pistas para cualquier persona que cree una
  cuenta. La misma regla se mantiene al editar el perfil.
- **Ciclo como borrador visible.** `generate-split` siempre crea un borrador;
  al terminar se invalida toda la caché de ciclos, no solo el activo. Tanto en
  Entreno como en «Mi plan semanal» se puede revisar, aceptar o regenerar ese
  borrador. Sin esa invalidación parecía que la generación no había hecho nada.
- **Cuotas de IA en servidor.** `0040_ai_usage_limits.sql` cuenta de forma
  atómica las llamadas antes de llegar a Claude: 3 entrenamientos, 2 ciclos y
  20 mensajes de coach por usuario y día UTC. Las tres Edge Functions ya usan
  `consume_ai_usage()`; nunca se debe poner este límite solo en el cliente.
- **Batallas más legibles.** El código de seis caracteres primero muestra el
  nombre de la sala, creador y aforo, y solo entonces permite entrar. Dentro de
  la sala, los participantes se leen mediante `battle_lobby_participants()`:
  una función `security definer` que devuelve solo sus nombres a quien ya
  participa, sin abrir los perfiles.
- **Logros como vitrina.** La rejilla enseña emblema, nombre y fecha si existe;
  el detalle, descripción y progreso se abren al tocar una tarjeta. Cada logro
  usa un icono distinto. `0041_battle_achievements.sql` añade la familia
  Batallas: participación real y victorias, nunca volumen ni peso ajeno.

### Configuración viva

| Dónde | Estado |
|---|---|
| Supabase, proveedor Email | Activo |
| Supabase, *Confirm email* | Activado |
| Supabase, *Redirect URLs* | `athlos://confirm` y `athlos://reset-password` |
| Supabase, SMTP | El de serie. Pocos correos por hora y **plantillas no editables** |
| Supabase, registros | Permitidos |
| Supabase, migraciones | Aplicadas hasta `0049`; recuperación de sesión probada |
| Supabase, funciones | Cinco activas: las tres de IA, `send-reminders` y `close-battles` |
| Supabase, extensiones | `pg_cron` y `pg_net` activas, cron `enviar-recordatorios` cada hora |
| Supabase, secretos | `ANTHROPIC_API_KEY` y `CRON_SECRET` |
| EAS, variables | Correctas en `production`, `preview` y `development` |
| TestFlight | Build de producción del 10 de agosto |
| Pruebas externas | Sin configurar |
| Rama | `main`, remoto `https://github.com/seergiioomh/Athlos.git`, privado |

### Pendiente

- **No hay política de privacidad**, y la app manda a Anthropic datos
  personales (peso, fecha de nacimiento, lesiones). Hace falta para publicar.
- **Límites de IA.** Cada usuario puede diseñar hasta 3 entrenamientos, 2
  ciclos y enviar 20 mensajes al coach por día UTC. Se aplican en Supabase
  antes de llamar a Claude; la caché abarata cada llamada, pero no sustituye
  este tope de coste.
- **Compartir un entrenamiento está oculto, no borrado.** El botón salió de
  `WorkoutPreviewSheet` porque el enlace no funciona: usa el esquema
  `athlos://`, que WhatsApp no convierte en enlace tocable, así que llega como
  texto plano y quien lo recibe no puede hacer nada con él. Todo lo de detrás
  sigue en su sitio —`share.ts`, la ruta `shared-workout`,
  `importSharedWorkout` y el filtro `.neq("source", "shared")`— para que los
  enlaces ya repartidos se sigan abriendo y volver a enseñarlo sea reponer un
  botón. **No quitar esas piezas** creyendo que son código muerto.

  Arreglarlo de verdad son Universal Links: dominio propio, el archivo
  `apple-app-site-association` servido por HTTPS y recompilar con el
  entitlement `associatedDomains`. Aplazado a conciencia.
- Borrar la rama `master` del remoto, que quedó duplicada.
- No hay tests. Se comprueba con `tsc --noEmit` y `expo lint`.

Ya resuelto, por si aparece en el historial y confunde: la contraseña de la
base de datos se cambió, `EXPO_PUBLIC_DEV_USER_ID` se borró de EAS, el caché
del CLI de Supabase salió de git, y el `README.md` dejó de ser la plantilla de
Expo.

---

## Cómo está montado

Expo SDK 54 · React Native 0.81 · TypeScript · expo-router 6 · Supabase.

```
app/                     rutas (expo-router, enrutado por archivos)
  _layout.tsx            raíz: configuración → sesión → onboarding → app
  auth.tsx               acceso
  onboarding.tsx         bienvenida, 7 pasos
  (tabs)/                inicio · entrenamiento · coach · progreso · perfil
  weekly-plan.tsx        ciclo de entrenamiento, encima de las pestañas
  rachas.tsx             detalle de la racha, encima de las pestañas
  logros.tsx             la vitrina de logros, encima de las pestañas
  batallas.tsx           batalla: sala, clasificación y resultado
  shared-workout.tsx     entrenamiento recibido por enlace (exige sesión)

src/
  features/<área>/       pantalla + componentes + queries + tipos
  services/              acceso a Supabase; ninguna otra capa lo toca
  components/ui/         piezas compartidas
  theme/                 colores, tipografía, espaciado, radios
  lib/supabase.ts        el cliente
  utils/                 fechas, gráficas, mensajes de error

supabase/
  migrations/            SQL numerado, se ejecuta a mano en el panel
  functions/             cinco Edge Functions (Deno)
  imports/               entrenamientos importados de las notas en papel
```

**Capas.** Pantalla → `queries.ts` (React Query) → `services/` (Supabase). Los
componentes nunca llaman a `supabase` directamente, y los servicios no saben
nada de React. Cada área tiene su fábrica de claves (`homeKeys`, `workoutKeys`,
`progressKeys`, `coachKeys`, `splitKeys`, `profileKeys`) — usa esas, no
literales sueltos, o las invalidaciones dejan de encontrarse.

**Estado.** React Query para todo lo del servidor. Zustand solo para la sesión.
No hay más estado global.

**El id del usuario** sale siempre de `useUserId()`. Todos los hooks empiezan
con `const userId = useUserId()!;`. La excepción es `useProfile()`, que se
llama desde el layout raíz antes de haber sesión: usa la versión sin aserción
más `enabled: Boolean(userId)`.

---

## Las pantallas

**Inicio.** El entrenamiento del día en una tarjeta, con ilustración anatómica
recortada por región —si toca torso se ve el torso, no el cuerpo entero, para
que la tarjeta no crezca—. Debajo: nivel ATHLOS, peso, historial de la semana.
La racha va arriba, al lado del avatar, y al pulsarla se abre su pantalla.

En "Esta semana" se ven 7 días hacia atrás y 7 hacia delante, centrados en hoy.
Tocar un día ya entrenado abre lo que se hizo ese día.

**Entrenamiento.** Separa dos cosas que la gente confunde: los **objetivos
sugeridos** por la IA (series, descanso, peso recomendado) que no se editan, y
las **series registradas** por el usuario, que son lo que de verdad hizo.

La pantalla se rediseñó porque el objetivo se decía **tres veces**: en una
tarjeta de métricas, otra vez en una columna de cada fila y una tercera dentro
de los campos. Con eso no cabían cinco columnas en un móvil y los campos
quedaban por debajo del tamaño con el que se acierta con el dedo. Ahora se dice
una vez, en la línea bajo el nombre del ejercicio.

Tres cosas de esa pantalla que ya costaron una vuelta:

- **El campo tiene que ser el `TextInput` entero.** Estuvo metido dentro de una
  caja con la unidad al lado, y solo eran tocables sus 34 px centrales: parecía
  un campo y no lo era.
- **El cronómetro de descanso va DEBAJO de las series.** Puesto entre la
  cabecera y la lista, marcar una serie empujaba hacia abajo justo lo que el
  usuario estaba mirando.
- **El descanso no se escribe en ningún sitio.** El cronómetro salta solo, así
  que anunciarlo era decir dos veces lo que la pantalla ya hace.

El objetivo puede ser **distinto en cada serie**: `plan_exercises.set_targets`
guarda una progresión (ascendente, back-off, descendente) cuando la IA la
propone, y es nulo cuando las series son iguales, que es lo normal. **Nunca
leas esa columna a pelo**: `targetsOf()` en `features/workout/targets.ts`
devuelve siempre una entrada por serie resuelva el caso que resuelva, y
`targetSummary()` la resume en una línea. Cada pantalla que se lo monte por su
cuenta acabará diciendo algo distinto. Al
terminar aparece una pantalla de cierre con el resumen y tres preguntas de
sensaciones, que el coach lee al preparar la siguiente sesión.

**Cerrar la app no reinicia el entrenamiento.** Las series marcadas se guardan
al instante en `session_sets`. Los campos aún abiertos, el ejercicio visible y
la marca absoluta del descanso se guardan con un debounce corto en
`workout_sessions.draft_state`, y se fuerza una escritura al pasar la app a
segundo plano. Al reabrir, `openSession()` recupera ambas fuentes y las mezcla:
una fila real de `session_sets` siempre gana al JSON. Al terminar se borra el
borrador, pero las series reales permanecen. No conviertas el borrador en la
fuente de verdad de lo entrenado: hacerlo falsearía Progreso y Batallas.

**Coach.** Chat con la IA. Puede proponer cambios; el usuario los aplica o no.

**Progreso.** Gráfica de peso interactiva, heatmap rosa de las últimas cuatro
semanas y marcas por ejercicio filtradas por grupo muscular. El heatmap es un
rectángulo de 28 casillas —cuatro filas completas de siete—, sin números ni
leyenda: rosa significa entrenamiento terminado. Tocar una casilla rosa abre
el detalle de ejercicios, pesos y repeticiones de esa sesión. Usa el mismo
`PastWorkoutSheet` que Inicio, pero con el acento rosa de Progreso.

El verde y el ámbar de la variación de peso **dependen del objetivo del
usuario**, no de la dirección: manda el peso objetivo si existe, y si no el
objetivo general. Con "fuerza" o "rendimiento", que no dicen nada sobre la
báscula, el color se queda neutro. Dar por hecho que adelgazar es lo bueno
mentía a media base de usuarios.

**Perfil.** Datos, racha, ajustes de avisos, y un botón que abre el ciclo de
entrenamiento en su propia pantalla para no saturar el perfil.

---

## Conceptos del dominio

**El entrenamiento va por ciclo, no por días de la semana.** Es una rotación:
sesión 1, 2, 3… y al terminar la última se vuelve a la primera. El usuario hace
la siguiente cuando entrena, sea el día que sea.

Antes el reparto estaba atado a días concretos (lunes empuje, miércoles
tirón…), y saltarse un día generaba una contradicción que no tenía arreglo
limpio: ¿el jueves toca lo del miércoles que no hiciste, o lo del jueves?
Numerando las sesiones esa pregunta desaparece.

Vive en `weekly_splits` —la tabla conserva el nombre antiguo— con la columna
`cycle`, y cada plan guarda de qué ciclo y qué posición salió. `generate-workout`
mira el último plan **completado** de ese ciclo y avanza uno.

**Si no hay ninguno de ese ciclo, se deduce por los grupos musculares.** Pasa
siempre al aprobar el primer ciclo: los entrenamientos anteriores se generaron
sin ciclo, así que tienen `cycle_id` nulo, la rotación no encontraba dónde
anclarse, empezaba por la posición 1 y **repetía justo lo que el usuario
acababa de hacer**. Ahora `sesionQueEncaja()` compara los músculos del último
entrenamiento completado con el foco de cada sesión.

Dos detalles de esa heurística que no son arbitrarios:

- **Exige coincidencia mayoritaria.** Un entrenamiento con un ejercicio de
  pecho y otro de espalda encaja "un poco" con Push y con Pull; ahí adivinar es
  peor que empezar por la primera.
- **Un empate decide, no bloquea.** En un ciclo de cinco días, Push y Pierna
  salen dos veces, así que un empuje empata entre la 1 y la 4 — pero empatan
  porque trabajan lo mismo, y la siguiente a cualquiera de ellas sirve igual
  para no repetir foco. Se coge la primera por determinismo. La versión inicial
  devolvía `null` ante empate y por eso no arreglaba nada.

Un ciclo nuevo se guarda como **borrador** (`status: 'draft'`) y no toca al
vigente hasta que el usuario lo aprueba. La función `approve_training_cycle()`
archiva el activo y activa el nuevo en la misma transacción, y un índice único
parcial garantiza que no haya dos activos a la vez. Si se activara al generarlo,
una propuesta que el usuario ni llega a mirar le cambiaría los entrenamientos.

**El plan vive hasta que se hace.** `fetchLatestPlan` trae el último plan esté
hecho o no; la pantalla decide mirando `completedAt`. Si sigue pendiente, es el
entrenamiento vigente por muchos días que pasen. Solo cuando se termina
aparece "preparar el siguiente". No se genera uno nuevo cada día.

### El calendario dice cuándo, el ciclo dice qué

Son dos preguntas distintas y hay que mantenerlas separadas. El ciclo sigue
avanzando por entrenamientos hechos, nunca por días; encima hay una capa fina
—`src/features/workout/schedule.ts`— que solo puede contestar "hoy sí / hoy
no". **En cuanto el calendario pudiera decir "hoy toca pierna" volveríamos al
problema que resolvió `0028`**: saltarse un día desfasaba el reparto para
siempre.

Son dos reglas, y una es blanda a propósito:

- **Un entrenamiento por día** (dura). Al terminar, hasta la medianoche local
  no se prepara otro, y la tarjeta de Inicio enseña la cuenta atrás.
- **Los días de descanso avisan, no bloquean** (blanda). `training_days` es una
  intención declarada, no un contrato: quien se saltó el viernes quiere
  entrenar el sábado, y negárselo por respetar un dato que escribió él mismo le
  arruina la semana. La tarjeta lo dice y deja "Entrenar igualmente".

`estadoDeHoy()` devuelve uno de cuatro estados y **el orden de precedencia es
parte del diseño**: `hecho` gana a todo, `listo` gana al descanso —si el
entrenamiento ya está preparado, recordarte que hoy descansas es ruido—, y
`descanso` solo aparece cuando no hay nada preparado.

Cuatro decisiones que no son arbitrarias:

- **A medianoche local, no a las 24 horas de terminar.** Con un plazo de 24 h,
  entrenar el lunes a las 20:00 impide entrenar el martes por la mañana, que es
  penalizar a quien madruga. El precio —terminar a las 00:30 quema el día
  nuevo— es mucho más raro que el caso que arregla.
- **Se pregunta antes de terminar**, y solo si quedan series sin marcar
  (`confirmarFin` en `ActiveWorkout`). Antes no se preguntaba porque terminar no
  costaba nada; ahora cierra el día, así que un toque de más en el último
  ejercicio dejaba al usuario fuera hasta mañana sin quererlo.
- **"Entrenar igualmente" viaja en la ruta** (`/(tabs)/workout?forzar=1`). Sin
  ese parámetro, la pantalla de Entrenar volvía a preguntar lo mismo: dos
  toques para una sola decisión.
- **Nunca se bloquea por falta de datos.** Sin `training_days` todos los días
  valen; con las sesiones aún cargando no se afirma nada.

El freno se repite en `generate-workout` y no es redundancia: el reloj del móvil
se cambia en dos toques, y **rechazar allí ahorra la llamada a Claude y la cuota
diaria**. Va antes de leer el catálogo, a propósito. Para que el mensaje llegue
al usuario hizo falta `mensajeDeFuncion()` en `services/workout.ts`: ante un
código distinto de 2xx, `functions.invoke` devuelve siempre el mismo texto en
inglés y el cuerpo real viaja en `context`, sin leer. Antes de esto, el aviso
del límite de IA tampoco se veía.

La zona horaria la escribe `useTimezoneSync` al entrar. **Vivía dentro de
`registerForPush` y ahí no llegaba nunca para quien rechazaba las
notificaciones**, porque esa función sale antes con `return null`. Sin ella el
servidor no sabe qué día es para esa persona.

**Los entrenamientos compartidos no entran en el ciclo.** Se guardan con
`source: 'shared'` y **sin** `cycle_id`, y `fetchLatestPlan` los excluye con un
`.neq("source", "shared")`.

Ese filtro es la pieza que protege el ciclo de quien recibe, y quitarlo rompe
algo sutil: aceptar el entrenamiento de un amigo lo convertiría en "el último
plan", y al terminarlo la pantalla diría "prepara el siguiente" sobre la sesión
de otro, dejando la tuya escondida detrás, sin hacer y sin que se note.

El enlace lleva el entrenamiento **entero codificado dentro**, no un
identificador: RLS impide que un usuario lea las filas de otro, así que apuntar
a una fila ajena no funcionaría. Los ejercicios viajan por `slug` y no por id,
porque un id es una fila de una base concreta y el slug identifica al ejercicio
en sí, así que el móvil que lo recibe puede resolverlo contra su catálogo.

**Nivel y experiencia** (`src/features/home/level.ts`). 50 puntos por sesión
terminada, 5 por serie, 500 por nivel. Terminar pesa diez veces más que una
serie suelta a propósito: se premia la constancia, no el volumen. Los rangos
van de Principiante a Élite.

**Rachas** (`src/features/progress/streak-tiers.ts`). Once niveles, de 0 a 250
días: Sin racha, Calentando, Rodaje, Constante, Hábito, Veterano, Máquina,
Bestia, Titán, Élite, Leyenda. Cuanto más alta, más llamativa —el
último es multicolor—. La idea es que el número motive.

**Propuestas del coach.** El coach nunca escribe en la base de datos: devuelve
una propuesta que se guarda y se muestra, y la app la aplica con los permisos
del usuario cuando él confirma.

**Logros** (`src/features/achievements/definitions.ts`). Treinta y nueve hitos en
siete familias. Son la tercera capa de motivación y cada una mide algo distinto:
el **nivel** cuánto llevas hecho, la **racha** cuánto de seguido, y los
**logros** momentos concretos con nombre ("100 kg en una serie") que los otros
dos no saben expresar. Si alguna vez se añade una cuarta, que mida algo que no
midan estas.

Lo conseguido lo dicen **las métricas**, no la tabla; `user_achievements` solo
guarda cuándo. Al revés, los logros que el historial ya cumplía antes de que
existieran salían bloqueados enseñando "1 / 1", porque nunca hubo una fila que
los registrara. Por eso los antiguos aparecen como "Conseguido" sin fecha. La
rejilla no repite la descripción ni la barra de progreso: aparecen en el modal
que se abre al tocar el logro, manteniendo la vitrina compacta.

**Recordatorios push.** A quién avisar lo decide `users_to_remind()` en
Postgres, no la Edge Function: es la única que puede mirar a todos los usuarios
de una vez y cruzar sus días de entrenamiento, su hora elegida y su historial.

Solo devuelve a quien hoy le toca entrenar, está en su hora local elegida y
**todavía no ha terminado sesión hoy**. Esa última condición evita el aviso más
molesto de todos: recordarte que entrenes justo después de haber entrenado.

La hora local exige saber la zona horaria, y el servidor no puede deducirla: la
manda el móvil al registrar el token. Sin ella se asume `Europe/Madrid`.

El cron es **horario, no diario**, porque cada usuario elige su hora y puede
estar en otro huso: cada pasada pregunta a quién le toca en ese momento.

**La conversación caduca a los 5 días.** `RETENTION_DAYS` en
`src/services/coach.ts` tiene que coincidir con el valor que usa la Edge
Function al limpiar; si la app pidiera más de lo que se guarda, enseñaría
huecos.

**Bienvenida**: 7 pasos cortos — objetivo, **campo libre**, datos personales
(nombre, fecha de nacimiento *no la edad*, sexo, altura, peso, peso objetivo),
experiencia y técnica, disponibilidad (días concretos, minutos, material),
deporte de fuera con sus días, y limitaciones.

El **campo libre** (`goal_notes`) es la pieza que más contexto aporta: una
etiqueta dice "ganar músculo", una frase dice "ganar músculo y mejorar mi
velocidad para el fútbol". Viaja a las tres funciones de IA.

Zonas de interés, cardio y actividad diaria **ya no se preguntan** en la
bienvenida, pero siguen editables desde el perfil y siguen viajando al prompt.
Las horas de sueño no se preguntan ni se envían a la IA: una cifra declarada
una vez no describe la recuperación real de hoy. La columna antigua se conserva
para evitar una migración destructiva, pero ya no participa en la app.

Dos trampas del formulario, las dos ya pisadas:

- **Todo campo obligatorio del esquema tiene que estar en el `fields` de algún
  paso.** Al enviar se valida el objeto entero y se busca en qué paso vive el
  que falla; si no está en ninguno, `findIndex` da -1, no se cambia de pantalla
  y el usuario se queda atascado con un error que no ve.
- **La bienvenida se pasa una sola vez.** Cualquier pregunta nueva tiene que
  añadirse también a `EditProfileSheet`, o quien ya tenga cuenta no podrá
  contestarla nunca.

---

## Reglas del proyecto

### 1. La IA propone, la app escribe

Decisión explícita del autor frente a la alternativa de que el coach ajustara
el plan por su cuenta. Si algún día se cambia, que sea porque él lo pida.

### 2. Las funciones sacan el usuario del token

Las Edge Functions usan la clave de servicio y **se saltan RLS**. Por eso
ninguna de las que llama la app acepta un `user_id` en el cuerpo: lo sacan del
`Authorization: Bearer`.

```ts
async function userFromRequest(req, supabase): Promise<string | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(header.slice(7));
  if (error) return null;
  return data.user?.id ?? null;
}
```

Aceptar el id del cuerpo dejaría a cualquiera pedir los datos de cualquiera.
Fue un agujero real que hubo que cerrar; no lo reabras.

La excepción es `send-reminders`, que no la llama ningún usuario: la llama el
cron, y no hay token del que sacar a nadie. Por eso va desplegada con
`--no-verify-jwt` y protegida con `CRON_SECRET` en una cabecera. **Si añades
otra función sin JWT, tiene que llevar su propio secreto**: sin él queda
abierta a quien dé con la URL.

### 3. Una sola paleta

`src/theme/colors.ts` es la única fuente. `features/home/home-theme.ts` es solo
un alias (`export const HomeColors = Colors;`) que se mantiene porque ~27
archivos lo importan.

Hubo dos paletas conviviendo, una clara y otra oscura, y acabaron mezclándose
dos naranjas distintos en la misma pantalla. No definas colores en ningún otro
sitio.

La app es **solo oscura** (`userInterfaceStyle: "dark"`). Si añades un efecto
de cristal, material oscuro: una vez se probó claro y se veía un reborde
blanco horrible.

### 4. Los agregados se calculan en SQL

Racha, resumen de progreso, evolución por ejercicio: funciones RPC de Postgres.
No traigas filas al cliente para sumarlas.

### 5. Los iconos son Hugeicons, de trazo

Se probaron los rellenos y se descartaron. `IconSvgElement` se importa de
`@hugeicons/react-native`, **no** de `@hugeicons/core-free-icons`.

---

## Base de datos

Tablas, todas con RLS por `auth.uid()` (verificado):

| Tabla | Contenido |
|---|---|
| `profiles` | Perfil y respuestas de la bienvenida. Cuelga de `auth.users` |
| `exercises` | Catálogo común, con material y patrón de movimiento |
| `workout_plans` | Entrenamiento generado, con su marca de terminado |
| `plan_exercises` | Objetivos sugeridos por la IA — solo lectura para el usuario |
| `workout_sessions` | Sesión real, con valoración al terminar |
| `session_sets` | Series que registra el usuario de verdad |
| `body_weight_entries` | Pesajes |
| `coach_messages` | Conversación y propuestas. Caduca a los 5 días |
| `weekly_splits` | El ciclo de entrenamiento. **El nombre es histórico**: guarda ciclos, no repartos por día de la semana |
| `push_tokens` | Un móvil registrado para avisos. La clave es el token, no el usuario: una persona puede tener varios |
| `user_achievements` | Cuándo se desbloqueó cada logro. Solo la fecha: si está conseguido lo dicen las métricas |
| `battles` | Una competición entre amigos. Ver `BATALLAS.md` |
| `battle_participants` | Quién compite y con qué objetivo, congelado al empezar |
| `ai_daily_usage` | Contador diario interno de peticiones a la IA, por usuario y acción |

Funciones: `progress_summary`, `progress_period_summary`, `exercise_progress`,
`workout_streak`, `approve_training_cycle`, `users_to_remind`,
`achievement_metrics`, `import_session`, `prune_coach_messages`,
`handle_new_user`, `delete_account`, y las de batallas
(`battle_target`, `create_battle`, `start_battle`, `battle_score`,
`is_battle_participant`).

**`is_battle_participant()` es `security definer` por necesidad, no por
comodidad.** Las políticas de `battle_participants` tienen que preguntar por
`battle_participants`, y una subconsulta directa haría que Postgres entrara en
recursión infinita evaluando la política contra sí misma. No la conviertas en
invoker.

`user_achievements` no tiene políticas de `update` ni `delete` a propósito: un
logro conseguido no se edita ni se retira, y que la política no exista es la
forma de dejarlo escrito.

`delete_account()` es `security definer` y **no recibe parámetros**: saca al
usuario de `auth.uid()`, igual que las Edge Functions lo sacan del token.
Aceptar un id dejaría a cualquiera borrar la cuenta de cualquiera.

La única política permisiva es la del catálogo de ejercicios, que cualquier
usuario autenticado puede leer: es común a todos y no contiene nada personal.

**El perfil se crea solo.** Un trigger en `auth.users` inserta la fila al
registrarse. La bienvenida actualiza, nunca inserta. Sin eso, un fallo en la
bienvenida dejaría cuentas sin perfil, un estado del que cuesta salir.

Las migraciones se ejecutan **a mano en el SQL Editor**, en orden. El CLI no
está enlazado para `db push`. Las que no forman parte de la instalación están
marcadas en `supabase/README.md`.

### La «cuenta de desarrollo» es la cuenta real

`f4707a48-313f-4fe6-9ee2-0a8d09973167` no es un usuario ficticio: se creó con
el correo real del autor, así que al activar el login se convirtió en su cuenta
normal. Es con la que entra, y guarda los entrenamientos importados de sus
notas en papel, los pesajes y el plan.

Por eso `0025_remove_dev_user.sql` está obsoleto y con el `delete` comentado.
Para vaciar entrenamientos sin tocar la cuenta,
`0018_reset_training_data.sql`.

---

## Edge Functions

Cuatro, en Deno, desplegadas con `--use-api` (sin esa opción el CLI exige Docker
en local).

| Función | Modelo | Qué hace |
|---|---|---|
| `generate-workout` | `claude-opus-5` | El entrenamiento del día |
| `generate-split` | `claude-opus-5` | El ciclo de entrenamiento |
| `coach-chat` | `claude-sonnet-5` | El chat, con herramientas |
| `send-reminders` | — | Los avisos push. La llama el cron, no la app |

Las dos de generación usan salida estructurada (`json_schema`), `thinking:
adaptive` y respaldo de servidor (`betas: ["server-side-fallback-2026-07-01"]`
con `fallbacks: "default"`).

Herramientas del coach — todas devuelven propuestas, ninguna escribe:
`ajustar_ejercicio`, `sustituir_ejercicio`, `cambiar_reparto_semanal`,
`actualizar_limitaciones`.

### El prompt solo pide columnas que alguien rellena

`generate-workout` y `coach-chat` pedían `focus`, `energy_before`, `ate_well` y
`discomfort` del historial de sesiones. Las cuatro existen desde la `0015` y
**no las escribe nadie**: `saveSessionFeedback` guarda energía *durante*, nota y
comentarios, y `openSession` inserta solo usuario y plan. Viajaban como cuatro
`null` por sesión —ocho sesiones en cada generación, cinco en cada mensaje del
chat—, y encima el prompt le pedía a Claude que usara la «energía antes», que
nunca ha existido.

Si algún día se recogen, hay que añadirlas **en la consulta y en la regla del
prompt**: las dos, o el prompt vuelve a describir datos que no llegan.

**El sueño no se usa.** `sleep_hours` era una respuesta puntual convertida en
rasgo permanente. Quien escribió 6 horas podía arrastrar recomendaciones de
menor volumen indefinidamente aunque después durmiera bien. Por eso no aparece
en el perfil editable ni viaja a `generate-workout`, `generate-split` o
`coach-chat`. Si algún día se recupera, tendrá que ser como dato reciente, no
como una respuesta fija de la bienvenida.

### Caché de prompts

Las tres de IA usan `cache_control: { type: "ephemeral" }`. Marca un punto de
corte: **todo lo anterior** al marcador se cachea, y las llamadas siguientes lo
reaprovechan mucho más barato.

Se cachea lo que se repite sin cambiar: el prompt de sistema, el catálogo de
ejercicios (que es la mayor parte del contexto), el perfil, y las definiciones
de herramientas del coach.

Dos condiciones que se rompen sin darse cuenta:

- **La caché compara bytes exactos.** El catálogo lleva `.order("slug")` por
  eso; sin un orden fijo, PostgREST puede devolver las filas en otro orden y el
  bloque deja de coincidir consigo mismo.
- **Los JSON van compactos**, sin `null, 2`. La indentación son bytes que se
  pagan en cada llamada y el modelo no los necesita.

`send-reminders` **no llama a ningún modelo**: los textos son fijos. Un aviso
de "hoy toca entrenar" no mejora por generarlo con IA, y multiplicaría el coste
por cada usuario y cada día.

**El catálogo se filtra por material antes de mandarlo al modelo.** Si no,
propone ejercicios con máquinas que el usuario no tiene.

Todas llevan CORS con OPTIONS. Sin eso, `fetch` desde web falla en silencio.

La clave de Anthropic vive **solo** como secreto de Supabase, nunca en el
`.env` de la app: todo lo que lleva `EXPO_PUBLIC_` acaba dentro del bundle y es
legible por cualquiera que descargue la app.

---

## Arranque de la app

`app/_layout.tsx` tiene tres puertas seguidas: falta de configuración → sesión
cargando → perfil cargando. Después `Stack.Protected` decide entre `auth`,
`onboarding` y la app.

Dos cosas que no son adorno:

- **La pantalla de inicio se controla a mano.** `preventAutoHideAsync()` en el
  módulo, `hideAsync()` al montar. Si el layout raíz devuelve algo que no es un
  navegador mientras espera, expo-router nunca la retira y la app se queda
  congelada. Pasó en TestFlight.
- **Tope de 8 segundos.** Si una consulta se cuelga, la app avanza igual en vez
  de dejar al usuario mirando un indicador para siempre.

`configError` en `src/lib/supabase.ts` se enseña **en pantalla** en lugar de
lanzar una excepción: en una app compilada no hay consola donde mirar. También
comprueba que la clave *tenga forma de clave*, no solo que exista.

---

## Trampas conocidas

Cosas que ya han costado tiempo una vez.

**`process.env.EXPO_PUBLIC_*` solo se sustituye con acceso por punto.** Ni
desestructuración ni corchetes. Y la primera vez tras tocar el `.env`, arranca
con `--clear`: las variables se incrustan en el bundle y el caché anterior no
las tiene.

**Los errores de Supabase no son `Error`.** Son objetos planos, así que
`instanceof Error` siempre da falso y acabas enseñando "error desconocido". Usa
`errorMessage()` de `src/utils/errors.ts`.

**No envuelvas una pantalla entera en `Pressable`** para cerrar el teclado: se
queda el gesto al tocar y el scroll deja de funcionar. Envuelve solo las zonas
muertas (cabecera, estado vacío).

**Los modales con campos necesitan `KeyboardAvoidingView`**, y anclar abajo con
un contenedor `flex: 1 / justifyContent: "flex-end"`, no con `marginTop: auto`.

**Si una tarjeta tiene capa de sombra fuera y contenido dentro**, la de dentro
necesita `flex: 1` o queda más baja que sus hermanas.

**Nada de scripts de reemplazo masivo sobre TSX.** Han roto cosas dos veces:
las props necesitan llaves (`prop={Colors.x}`, no `prop=Colors.x`) y los
imports multilínea se parten si buscas "la última línea que empieza por
`import`". Edita a mano.

**Antes de culpar al caché, comprueba de dónde salen los datos.** Una vez se
persiguió un "no se actualiza" que venía de la base de datos, no del valor por
defecto que se estaba editando.

**Los heredocs de Python en Windows meten CRLF.** `io.open(path, "w").write(s)`
traduce los saltos de línea sin avisar, y el resultado son trece archivos que
git da por reescritos enteros y una huella de runtime distinta. Si pasa:

```bash
sed -i 's/\r$//' <archivo>
```

**La cámara de iOS no escanea esquemas propios.** Un QR con `athlos://…` sale
como "contenido no válido": solo acepta `http(s)`, wifi y contactos. Para
conectar con el cliente de desarrollo hay que escanear **desde dentro de la
app**, o escribir la URL de Metro a mano.

**En `Share.share`, `url` y `message` son campos distintos.** En iOS `url`
viaja como elemento propio del selector, que es lo que hace que la app
receptora lo reconozca como enlace tocable; metido dentro de `message` llega
como texto. En Android `url` se ignora del todo y tiene que ir en el mensaje.
Aun así, WhatsApp no convierte en enlace un esquema propio como `athlos://`.

**`cmd` no es bash.** `$(comando)` no se sustituye por nada, así que un
`supabase secrets set CLAVE=$(openssl rand -hex 32)` guarda el secreto vacío y
la CLI se limita a imprimir su ayuda. Se nota porque no confirma nada. Usa
PowerShell.

**El shell de Bash tampoco es PowerShell.** Un here-string `@'…'@` dentro de
`git commit -m` deja el `@` como asunto del commit. Para mensajes de varias
líneas, `git commit -F - <<'EOF'`.

### Las variables de EAS no son el `.env`

Son dos sitios distintos y no se sincronizan solos. El `.env` local vale para
`npx expo start`; las builds y los `eas update` leen las variables del
servidor, por entorno:

```bash
npx eas-cli env:list production
```

Estuvo subido el marcador `TU_CLAVE_ANON` sin sustituir, y el resultado fue una
app que arrancaba bien y solo fallaba al registrarse, con «Invalid API key».
Antes de compilar, comprueba que coinciden.

---

## Despliegue

EAS Build y Submit. Perfiles en `eas.json`: `development`, `preview`,
`production`, cada uno con su entorno y su canal. Versión de compilación
remota, autoincremental. `runtimeVersion` por huella.

- Identificador: `com.sergiohateos.athlos` (`com.athlos.app` está cogido por
  otra persona)
- Proyecto EAS: `fc9f5e21-69f6-48cd-bea2-830a92faf018`, propietario `esematt`
- Proyecto Supabase: `dcuvfhbqoteodzzldocc`

Un cambio solo de JavaScript va con `eas update`; si tocas dependencias nativas
o `app.json`, hay que recompilar.

**Los `eas update` van siempre con `-p ios`.** Por omisión exporta todas las
plataformas, y la web está en `output: "static"`, que prerenderiza en Node: al
importar el layout raíz se crea el cliente de Supabase, que pide la sesión a
AsyncStorage, cuya versión web lee `window.localStorage`. En Node no hay
`window` y el export se cae con `ReferenceError`. Solo hay build de iOS.

Se arreglaría quitando la salida estática de `app.json`, pero eso cambia la
huella y obliga a recompilar. Cuando toque la siguiente build.

### Comprueba la huella justo antes de publicar

Un `eas update` solo llega a un dispositivo si su `runtimeVersion` es idéntica
a la de la build instalada. Si no coincide, no falla nada: se publica, se ve en
el panel, y el móvil la ignora. Parece que la corrección no funciona cuando en
realidad no ha llegado. **Costó una tarde entera.**

```bash
npx expo-updates fingerprint:generate --platform ios
```

```bash
npx eas-cli build:list --limit 1
```

Cuentan para la huella `.gitignore`, `eas.json`, `app.json`, `package.json`
(scripts y versión de react-native), los iconos y el autolinking. El código de
`src/` **no** cuenta, que es justo lo que permite corregir errores por aire.

**El `.gitignore` cuenta**, aunque no influya en nada de lo que se ejecuta.
Añadirle una línea invalida las actualizaciones para las builds existentes.

Y cuentan los **bytes**, no el contenido que ve git: el mismo archivo con CRLF
y con LF da huellas distintas, y `git status` los da por iguales porque
normaliza los saltos al comparar.

Cuando la huella se desalinee, **compilar sale más barato que pelearse con
esto**: al compilar se calcula una huella nueva y las actualizaciones vuelven a
salir solas.

La huella también sirve para **comprobar que una build lleva de verdad lo que
crees**. Si añades una dependencia nativa y la build sale con la misma huella
que la anterior, no la lleva dentro. Al añadir `expo-notifications` se comprobó
así antes de instalar nada:

```bash
npx eas-cli build:list --limit 2
```

### TestFlight

Para añadir a alguien, pruebas **externas**: grupo, build, información de
prueba, y enviar a Beta App Review (de horas a un par de días). Después, por
correo o enlace público. Las pruebas internas exigen meter a la persona en el
equipo de App Store Connect, que es desproporcionado para un probador.

La app pide cuenta nada más abrirse, así que en la información de prueba hay
que decirle al revisor que puede registrarse él mismo. Si no, se encuentra un
muro de acceso y la rechaza.

---

## Trabajar desde otro equipo

```bash
git clone https://github.com/seergiioomh/Athlos.git
```

```bash
npm install
```

El `.env` no viaja en git, a propósito: cópialo a mano o sácalo del panel de
Supabase (`.env.example` dice de dónde). Después:

```bash
npx expo start --clear
```

Clónalo **fuera de OneDrive** —algo tipo `C:\dev\athlos`— o la sincronización
se pelea con el observador de archivos de Metro.

Las conversaciones de Claude Code se guardan en el disco de cada equipo y no
viajan con el repositorio. Por eso existe este documento: en otro ordenador se
empieza una sesión nueva, y lo que sabrá del proyecto es lo que esté escrito
aquí. Si algo importante se decide en una conversación, escríbelo.

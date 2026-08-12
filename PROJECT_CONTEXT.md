# ATHLOS — contexto del proyecto

Documento de arranque para una sesión nueva. Recoge lo que **no se deduce
leyendo el código**: las decisiones tomadas, por qué se tomaron, y los sitios
donde ya nos hemos equivocado una vez.

Última actualización: **11 de agosto de 2026**.

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
amigos · compartir un entrenamiento por enlace · recordatorios push.

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
| Supabase, migraciones | Aplicadas hasta `0043` (verificado el 12 de agosto) |
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
- **Los enlaces de compartir usan el esquema `athlos://`**, que WhatsApp no
  convierte en enlace tocable: llega como texto plano. Arreglarlo son Universal
  Links, que exigen un dominio propio, el archivo
  `apple-app-site-association` servido por HTTPS y recompilar con el
  entitlement `associatedDomains`. Aplazado a conciencia.
- Borrar la rama `master` del remoto, que quedó duplicada.
- No hay tests. Se comprueba con `tsc --noEmit` y `expo lint`.
- **Batallas**: funcionan de punta a punta con una cuenta. Sin una segunda
  cuenta real no se ha probado el aforo, la sala de espera con varios ni la
  clasificación con más de una persona. Ver `BATALLAS.md`.

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

**Coach.** Chat con la IA. Puede proponer cambios; el usuario los aplica o no.

**Progreso.** Gráfica de peso interactiva, "Tu actividad" comparada contra el
periodo anterior, y las marcas por ejercicio filtradas por grupo muscular.

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

Un ciclo nuevo se guarda como **borrador** (`status: 'draft'`) y no toca al
vigente hasta que el usuario lo aprueba. La función `approve_training_cycle()`
archiva el activo y activa el nuevo en la misma transacción, y un índice único
parcial garantiza que no haya dos activos a la vez. Si se activara al generarlo,
una propuesta que el usuario ni llega a mirar le cambiaría los entrenamientos.

**El plan vive hasta que se hace.** `fetchLatestPlan` trae el último plan esté
hecho o no; la pantalla decide mirando `completedAt`. Si sigue pendiente, es el
entrenamiento vigente por muchos días que pasen. Solo cuando se termina
aparece "preparar el siguiente". No se genera uno nuevo cada día.

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
días: Sin racha, Chispa, Encendido, En marcha, Imparable, Al rojo, Oro,
Esmeralda, Llama azul, Leyenda, Mítico. Cuanto más alta, más llamativa —el
último es multicolor—. La idea es que el número motive.

**Propuestas del coach.** El coach nunca escribe en la base de datos: devuelve
una propuesta que se guarda y se muestra, y la app la aplica con los permisos
del usuario cuando él confirma.

**Logros** (`src/features/achievements/definitions.ts`). Veintiocho hitos en
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

Zonas de interés, cardio, actividad diaria y horas de sueño **ya no se
preguntan** en la bienvenida, pero siguen en la tabla, siguen editables desde
el perfil y siguen viajando al prompt. No se borró ninguna columna.

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

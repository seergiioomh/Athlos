# ATHLOS — contexto del proyecto

Documento de arranque para una sesión nueva. Recoge lo que **no se deduce
leyendo el código**: las decisiones tomadas, por qué se tomaron, y los sitios
donde ya nos hemos equivocado una vez.

Última actualización: **8 de agosto de 2026**.

Complementa, no sustituye:

- `AGENTS.md` — reglas mínimas, se carga solo en cada sesión
- `ROADMAP.md` — la visión original
- `supabase/README.md` — puesta en marcha del backend, paso a paso

---

## Empieza aquí

**La app funciona y está instalada en el iPhone del autor** por TestFlight
(build 5). Registro, acceso, y sus datos cargando. Acaba de superarse la
puesta en marcha de la autenticación real, que fue lo último grande.

Tres cosas que conviene saber antes de tocar nada:

1. **La confirmación de correo está DESACTIVADA** en Supabase. Se apagó para
   poder probar el registro sin abrir enlaces. Mientras siga así, cualquiera
   puede darse de alta con un correo que no es suyo. Hay que reactivarla antes
   de que la app salga del móvil del autor.

2. **La huella de runtime está desalineada** con la build 5 instalada. No
   afecta al día a día, pero impide mandar correcciones por aire hasta
   restaurarla o compilar una build nueva. Ver *Despliegue*.

3. **`0025_remove_dev_user.sql` no se ejecuta nunca.** Borraría la cuenta real
   del autor. Está desactivado, pero el nombre engaña.

Lo siguiente en la lista es preparar la app para usuarios que no sean el autor.
Son tres cambios y van juntos, en la misma pantalla:

- **Recuperación de contraseña.** No existe. Hoy, quien olvide la suya pierde
  la cuenta: no hay enlace en la pantalla de acceso ni forma de pedirlo desde
  dentro. Es lo más urgente. Supabase lo resuelve con
  `resetPasswordForEmail`.
- **Mensajes de error en español.** Salen tal cual los manda Supabase: *"User
  already registered"*, *"Invalid login credentials"*. Hay que traducirlos, y
  en el caso de "ya registrado" cambiar solo a modo entrar.
- **Borrado de cuenta desde la app.** No existe. Apple lo exige (directriz
  5.1.1 v) a toda app que permita crearla: sin eso no se puede publicar en la
  App Store. Para TestFlight no lo revisan.

---

## Qué es

Un entrenador personal con IA, en español, para iPhone. No es una app de
registro de gimnasio: la idea es que el entrenador **conozca al usuario, le
acompañe y decida con él**. El entrenamiento del día, el reparto semanal y los
consejos los genera Claude a partir del perfil y del historial real.

Autor: Sergio Mateos. Uso propio de momento.

**Todo va en español**: interfaz, mensajes de error, comentarios del código y
mensajes de commit.

---

## Estado actual

### Funciona

Acceso y registro · bienvenida en 4 pasos · inicio con el entrenamiento del día
· pantalla de entrenamiento con objetivos y registro de series · chat con el
coach y propuestas aplicables · progreso con peso y racha · perfil · reparto
semanal · pantalla de rachas.

### Configuración viva

| Dónde | Estado |
|---|---|
| Supabase, proveedor Email | Activo |
| Supabase, *Confirm email* | **Desactivado** — reactivar antes de compartir |
| Supabase, registros | Permitidos |
| EAS, variables | Correctas en `production`, `preview` y `development` |
| TestFlight | Build 5 instalada en el iPhone del autor |
| Pruebas externas | Sin configurar |
| Rama | `main`, remoto `https://github.com/seergiioomh/Athlos.git`, privado |

### Pendiente, además de las tres de arriba

- Borrar la rama `master` del remoto, que quedó duplicada.
- El `README.md` de la raíz sigue siendo la plantilla de Expo, y menciona un
  script `reset-project` que ya no existe.
- No hay política de privacidad, y la app manda a Anthropic datos personales
  (peso, fecha de nacimiento, lesiones). Hace falta para publicar.
- **No hay límite de gasto por usuario.** Cada persona que use la app consume
  la cuenta de Anthropic del autor, sin tope: alguien puede pedir veinte
  entrenamientos seguidos o tener el chat abierto toda la tarde.

Ya resuelto, por si aparece en el historial y confunde: la contraseña de la
base de datos se cambió, `EXPO_PUBLIC_DEV_USER_ID` se borró de EAS, y el caché
del CLI de Supabase salió de git.

---

## Cómo está montado

Expo SDK 54 · React Native 0.81 · TypeScript · expo-router 6 · Supabase.

```
app/                     rutas (expo-router, enrutado por archivos)
  _layout.tsx            raíz: configuración → sesión → onboarding → app
  auth.tsx               acceso
  onboarding.tsx         bienvenida, 4 pasos
  (tabs)/                inicio · entrenamiento · coach · progreso · perfil
  weekly-plan.tsx        reparto semanal, encima de las pestañas
  rachas.tsx             detalle de la racha, encima de las pestañas

src/
  features/<área>/       pantalla + componentes + queries + tipos
  services/              acceso a Supabase; ninguna otra capa lo toca
  components/ui/         piezas compartidas
  theme/                 colores, tipografía, espaciado, radios
  lib/supabase.ts        el cliente
  utils/                 fechas, gráficas, mensajes de error

supabase/
  migrations/            SQL numerado, se ejecuta a mano en el panel
  functions/             tres Edge Functions (Deno)
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

**Entrenamiento.** Separa dos cosas que la gente confunde: los **objetivos
sugeridos** por la IA (series, descanso, peso recomendado) que no se editan, y
las **series registradas** por el usuario, que son lo que de verdad hizo.

**Coach.** Chat con la IA. Puede proponer cambios; el usuario los aplica o no.

**Progreso.** Gráfica de peso interactiva con detalle, resumen y racha.

**Perfil.** Datos, racha, y un botón que abre el reparto semanal en su propia
pantalla para no saturar el perfil.

---

## Conceptos del dominio

**El plan vive hasta que se hace.** `fetchLatestPlan` trae el último plan esté
hecho o no; la pantalla decide mirando `completedAt`. Si sigue pendiente, es el
entrenamiento vigente por muchos días que pasen. Solo cuando se termina
aparece "preparar el siguiente". No se genera uno nuevo cada día.

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

**La conversación caduca a los 5 días.** `RETENTION_DAYS` en
`src/services/coach.ts` tiene que coincidir con el valor que usa la Edge
Function al limpiar; si la app pidiera más de lo que se guarda, enseñaría
huecos.

**Bienvenida**: 4 pasos, ~20 campos — nombre, fecha de nacimiento (no la edad),
sexo, altura, peso, peso objetivo, objetivo, zonas de interés, experiencia,
nivel técnico, días concretos de entrenamiento, minutos por sesión (con opción
"me es indiferente"), material, cardio, actividad diaria, horas de sueño,
limitaciones y ejercicios a evitar.

---

## Reglas del proyecto

### 1. La IA propone, la app escribe

Decisión explícita del autor frente a la alternativa de que el coach ajustara
el plan por su cuenta. Si algún día se cambia, que sea porque él lo pida.

### 2. Las funciones sacan el usuario del token

Las tres Edge Functions usan la clave de servicio y **se saltan RLS**. Por eso
ninguna acepta un `user_id` en el cuerpo: lo sacan del `Authorization: Bearer`.

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
| `weekly_splits` | Reparto semanal |

Funciones: `progress_summary`, `exercise_progress`, `workout_streak`,
`import_session`, `prune_coach_messages`, `handle_new_user`.

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

Tres, en Deno, desplegadas con `--use-api` (sin esa opción el CLI exige Docker
en local).

| Función | Modelo | Qué hace |
|---|---|---|
| `generate-workout` | `claude-opus-5` | El entrenamiento del día |
| `generate-split` | `claude-opus-5` | El reparto semanal |
| `coach-chat` | `claude-sonnet-5` | El chat, con herramientas |

Las dos de generación usan salida estructurada (`json_schema`), `thinking:
adaptive` y respaldo de servidor (`betas: ["server-side-fallback-2026-07-01"]`
con `fallbacks: "default"`).

Herramientas del coach — todas devuelven propuestas, ninguna escribe:
`ajustar_ejercicio`, `sustituir_ejercicio`, `cambiar_reparto_semanal`,
`actualizar_limitaciones`.

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

Estado hoy: la build 5 espera `60dc546267f3db9ef9a077f4be9d9177272fe2d7`. Para
volver a esa huella, el `.gitignore` tiene que ser el de `db157d7`, con LF:

```bash
git show db157d7:.gitignore > .gitignore
```

Publicas, y lo dejas como estaba:

```bash
git checkout HEAD -- .gitignore
```

Nada de esto hará falta a partir de la siguiente build: al compilar se calcula
una huella nueva y las actualizaciones vuelven a salir solas. **Si dudas,
compilar sale más barato que pelearse con esto.**

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

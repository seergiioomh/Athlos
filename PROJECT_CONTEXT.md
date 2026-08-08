# ATHLOS — contexto del proyecto

Documento de arranque. Léelo entero antes de tocar nada: recoge las decisiones
que no se deducen del código y los sitios donde es fácil equivocarse.

Complementa, no sustituye:

- `AGENTS.md` — Expo 54, consultar siempre la documentación de esa versión
- `ROADMAP.md` — la visión original
- `supabase/README.md` — puesta en marcha del backend, paso a paso

---

## Qué es

Un entrenador personal con IA, en español, para iPhone. No es una app de
registro de gimnasio: la idea es que el entrenador **conozca al usuario, le
acompañe y decida con él**. Todo lo que ves en la app —el entrenamiento del
día, el reparto semanal, los consejos— lo genera Claude a partir del perfil y
del historial real de la persona.

Autor: Sergio Mateos. Uso propio de momento, distribuido por TestFlight.

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

---

## Reglas del proyecto

Esto es lo que hay que respetar sí o sí.

### 1. La IA propone, la app escribe

Las herramientas del coach **no escriben en la base de datos**. Devuelven una
propuesta que se guarda, se le enseña al usuario, y solo se aplica cuando él
pulsa aplicar — desde el cliente, con sus permisos y bajo RLS.

Es una decisión explícita del usuario frente a la alternativa (que el coach
ajustara el plan por su cuenta). Si algún día se cambia, que sea porque él lo
pida.

### 2. Las funciones sacan el usuario del token

Las tres Edge Functions usan la clave de servicio y **se saltan RLS**. Por eso
ninguna acepta un `user_id` en el cuerpo de la petición: lo sacan del
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

### 3. Una sola paleta

`src/theme/colors.ts` es la única fuente. `features/home/home-theme.ts` es solo
un alias (`export const HomeColors = Colors;`) que se mantiene porque ~27
archivos lo importan.

Hubo dos paletas conviviendo, una clara y otra oscura, y acabaron mezclándose
dos naranjas distintos en la misma pantalla. No vuelvas a definir colores en
ningún otro sitio.

La app es **solo oscura** (`userInterfaceStyle: "dark"`). Nada de modo claro:
si añades un efecto de cristal, material oscuro.

### 4. Los agregados se calculan en SQL

Racha, resumen de progreso, evolución por ejercicio: todo son funciones RPC de
Postgres. No traigas filas al cliente para sumarlas.

### 5. Los iconos son Hugeicons, de trazo

Se probaron los rellenos y se descartaron. `IconSvgElement` se importa de
`@hugeicons/react-native`, **no** de `@hugeicons/core-free-icons`.

---

## Base de datos

Tablas, todas con RLS por `auth.uid()`:

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

**Sugerido vs. registrado.** `plan_exercises` es lo que propone la IA y no se
edita; `session_sets` es lo que el usuario hace de verdad. Son dos cosas
distintas a propósito y así se ven en la pantalla de entrenamiento.

**El perfil se crea solo.** Un trigger en `auth.users` inserta la fila al
registrarse. La bienvenida actualiza, nunca inserta.

Las migraciones se ejecutan **a mano en el SQL Editor**, en orden. El CLI no
está enlazado para `db push`. Las que no forman parte de la instalación
(semillas, la etapa antigua sin login, el borrado de datos) están marcadas en
`supabase/README.md`.

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

**El catálogo se filtra por material antes de mandarlo al modelo.** Si no, te
propone ejercicios con máquinas que el usuario no tiene.

Todas llevan CORS con OPTIONS. Sin eso, `fetch` desde web falla en silencio.

---

## Arranque de la app

`app/_layout.tsx` tiene tres puertas seguidas: falta de configuración → sesión
cargando → perfil cargando. Y luego `Stack.Protected` decide entre `auth`,
`onboarding` y la app.

Dos cosas que no son adorno:

- **La pantalla de inicio se controla a mano.** `preventAutoHideAsync()` en el
  módulo, `hideAsync()` al montar. Si el layout raíz devuelve algo que no es un
  navegador mientras espera, expo-router nunca la retira y la app se queda
  congelada. Pasó en TestFlight.
- **Tope de 8 segundos.** Si una consulta se cuelga, la app avanza igual en vez
  de dejar al usuario mirando un indicador para siempre.

`configError` en `src/lib/supabase.ts` se enseña **en pantalla** en lugar de
lanzar una excepción: en una app compilada no hay consola donde mirar.

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

---

## Despliegue

EAS Build y Submit. Perfiles en `eas.json`: `development`, `preview`,
`production`, cada uno con su entorno y su canal. Versión de compilación
remota, autoincremental. `runtimeVersion` por huella.

- Identificador: `com.sergiohateos.athlos` (`com.athlos.app` está cogido)
- Proyecto EAS: `fc9f5e21-69f6-48cd-bea2-830a92faf018`, propietario `esematt`
- Se instala en el iPhone por TestFlight

Un cambio solo de JavaScript va con `eas update` al canal; si tocas
dependencias nativas o `app.json`, hay que recompilar.

**Los `eas update` van siempre con `-p ios`.** Por omisión exporta todas las
plataformas, y la web está en `output: "static"`, que prerenderiza en Node: al
importar el layout raíz se crea el cliente de Supabase, que pide la sesión a
AsyncStorage, cuya versión web lee `window.localStorage`. En Node no hay
`window` y el export se cae con `ReferenceError`. Solo hay build de iOS, así
que exportar web no aporta nada.

Se arreglaría de raíz quitando la salida estática de `app.json`, pero eso
cambia la huella y obliga a recompilar. Cuando toque la siguiente build.

---

## Estado y pendientes

Funcionando: acceso, bienvenida, inicio, entrenamiento, coach con propuestas,
progreso con peso y racha, perfil, reparto semanal.

Rama `main`, remoto `https://github.com/seergiioomh/athlos.git` (privado).

Pendiente:

- Borrar la rama `master` del remoto, que quedó duplicada.
- Reactivar *Confirm email* en Supabase cuando deje de ser solo uso propio.
  Está activada ahora mismo; mientras se prueba, estorba.
- El `README.md` de la raíz sigue siendo el de la plantilla de Expo.

Hecho, por si aparece en el historial y confunde: la contraseña de la base de
datos ya se cambió, y `EXPO_PUBLIC_DEV_USER_ID` ya no está en EAS.

### Las variables de EAS no son el `.env`

Son dos sitios distintos y no se sincronizan solos. El `.env` local vale para
`npx expo start`; las builds y los `eas update` leen las variables del
servidor, por entorno (`npx eas-cli env:list production`).

Estuvo subido el marcador `TU_CLAVE_ANON` sin sustituir, y el resultado fue una
app que arrancaba bien y solo fallaba al registrarse, con «Invalid API key».
Desde entonces `src/lib/supabase.ts` comprueba que la clave tenga forma de
clave, no solo que exista.

Antes de compilar, comprueba que coinciden.

---

## Trabajar desde otro equipo

```bash
git clone https://github.com/seergiioomh/athlos.git
```

```bash
npm install
```

El `.env` no viaja en git, a propósito: cópialo a mano desde el otro equipo o
sácalo del panel de Supabase (`.env.example` dice de dónde). Después:

```bash
npx expo start --clear
```

Clónalo **fuera de OneDrive** —algo tipo `C:\dev\athlos`— o la sincronización
se pelea con el observador de archivos de Metro.

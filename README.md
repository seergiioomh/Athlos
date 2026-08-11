# ATHLOS

Un entrenador personal con IA, en español, para iPhone.

No es una app de registro de gimnasio. La idea es que el entrenador **conozca
al usuario, le acompañe y decida con él**: el entrenamiento del día, el ciclo
de sesiones y los consejos los genera Claude a partir del perfil y del
historial real de entrenamientos.

Expo SDK 54 · React Native · TypeScript · expo-router · Supabase · Claude.

## Documentación

| Documento | Para qué |
|---|---|
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | **Léelo antes de tocar código.** Decisiones tomadas, reglas que no se deducen del código, y las trampas que ya han costado tiempo una vez |
| [`supabase/README.md`](supabase/README.md) | Puesta en marcha del backend, migración a migración |
| [`AGENTS.md`](AGENTS.md) | Reglas mínimas para sesiones de Claude Code |
| [`ROADMAP.md`](ROADMAP.md) | La visión original |

## Arrancar

```bash
npm install
```

El `.env` no viaja en git a propósito. Cópialo de `.env.example` y rellena los
dos valores desde el panel de Supabase.

```bash
npx expo start --clear
```

El `--clear` no es opcional la primera vez tras tocar el `.env`: las variables
`EXPO_PUBLIC_` se incrustan en el bundle y el caché anterior no las tiene.

**No hay Expo Go.** El proyecto usa módulos nativos (notificaciones, cliente de
desarrollo), así que hace falta una development build instalada en el móvil:

```bash
npx eas-cli build --profile development --platform ios
```

Con la build puesta, `npx expo start --dev-client` y se conecta sola si el
móvil está en la misma red.

## Comprobar antes de subir

```bash
npx tsc --noEmit
```

```bash
npx expo lint
```

Las Edge Functions quedan fuera del `tsconfig` porque son Deno, no React
Native: se comprueban al desplegarlas.

## Estructura

```
app/                  rutas (expo-router, enrutado por archivos)
src/
  features/<área>/    pantalla + componentes + queries + tipos
  services/           acceso a Supabase; ninguna otra capa lo toca
  components/ui/      piezas compartidas
  theme/              la paleta única
supabase/
  migrations/         SQL numerado, se ejecuta a mano en el panel
  functions/          Edge Functions (Deno)
```

Las capas van en un solo sentido: pantalla → `queries.ts` (React Query) →
`services/` (Supabase). Los componentes nunca llaman a `supabase`
directamente, y los servicios no saben nada de React.

## Idioma

**Todo va en español**: interfaz, mensajes de error, comentarios del código y
mensajes de commit.

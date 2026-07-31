# Backend de ATHLOS

Supabase (Postgres + Edge Functions). El entrenamiento sugerido lo genera
Claude desde una Edge Function, para que la clave de Anthropic no viaje
nunca dentro de la app.

## Puesta en marcha

**1. Crea el proyecto** en [supabase.com](https://supabase.com) y apunta la URL
y la clave `anon` (Project Settings → Data API).

contraseña proyeccto: Maquinon1+[]
anon: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdXZmaGJxb3Rlb2R6emxkb2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDU0MTUsImV4cCI6MjEwMDgyMTQxNX0.Gk-unotRZSn4zSeIiQ4FREx4uPL8lvZsN22AoJpFRd8
data url: https://dcuvfhbqoteodzzldocc.supabase.co/rest/v1/

**2. Crea el usuario de desarrollo.** Authentication → Users → Add user, con
email y contraseña, marcando *Auto Confirm*. Copia su UUID.

uuIID: f4707a48-313f-4fe6-9ee2-0a8d09973167

**3. Ejecuta las migraciones** en orden, desde el SQL Editor del panel:

| Archivo | Qué hace |
|---|---|
| `0001_workout_schema.sql` | Tablas y RLS por `auth.uid()` |
| `0002_seed_exercises.sql` | Catálogo de 20 ejercicios |
| `0003_dev_open_access.sql` | Acceso anónimo temporal — **pega tu UUID en la línea del `dev_user_id()` antes de ejecutarlo** |
| `0005_seed_dev_plan.sql` | Opcional: un entrenamiento de prueba, para ver la pantalla sin desplegar la función |
| `0006_profile_fields.sql` | Campos del formulario de bienvenida |
| `0007_body_weight.sql` | Histórico de peso corporal |
| `0008_coach_chat.sql` | Conversación con el coach |
| `0009_plan_completion.sql` | Marca de entrenamiento terminado |
| `0010_progress_stats.sql` | Funciones de cálculo para Progreso |
| `0012_workout_streak.sql` | Cálculo de la racha |
| `0014_coach_proposals.sql` | Propuestas de cambio del coach |
| `0015_session_feedback.sql` | Valoración de la sesión (nota, energía, molestias) |
| `0016_more_exercises.sql` | Ampliación del catálogo |
| `0017_import_session.sql` | Función para importar entrenamientos a mano |

`0018_reset_training_data.sql` borra todos tus datos de entrenamiento: se
ejecuta solo cuando quieres empezar de cero. Los entrenamientos importados a
mano viven en `supabase/imports/`, un archivo por día.

`0004_drop_dev_access.sql` no se ejecuta ahora: es para el día que entre el login.

**4. Configura la app.** Copia `.env.example` como `.env` y rellena los tres
valores. El `EXPO_PUBLIC_DEV_USER_ID` tiene que ser el mismo UUID del paso 3.

**5. Despliega la función.** Cuatro comandos, una sola vez.

Autenticarse. Abre el navegador y guarda el token en tu equipo:

```bash
npx supabase login
```

Enlazar esta carpeta con el proyecto en la nube. El `project-ref` es el
subdominio de tu URL (`https://<ESTO>.supabase.co`). Pedirá la contraseña de
la base de datos:

```bash
npx supabase link --project-ref dcuvfhbqoteodzzldocc
```

Subir la clave de Anthropic. Es una variable de entorno del servidor: la ve la
función, nunca la app. Se saca de [console.anthropic.com](https://console.anthropic.com):

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Subir el código de la función. `--use-api` empaqueta en los servidores de
Supabase; sin esa opción el CLI necesita Docker instalado en local:

```bash
npx supabase functions deploy generate-workout --use-api
```

**6. Arranca la app** con `npx expo start --clear`. El `--clear` no es opcional
la primera vez: las variables `EXPO_PUBLIC_` se incrustan en el bundle y el
caché anterior no las tiene.

## Lo que falta antes de publicar

- **Autenticación.** Ahora mismo la app se conecta sin sesión y
  `0003_dev_open_access.sql` deja que el rol `anon` lea y escriba los datos
  del usuario de desarrollo. Cualquiera con la clave anon (que es pública,
  va dentro del bundle) puede tocarlos. Sirve para datos de prueba y para
  nada más.
- **La función confía en el `user_id` del cuerpo** de la petición en vez de
  sacarlo del JWT. Al meter Auth hay que leerlo del token.

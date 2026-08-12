# Backend de ATHLOS

Supabase (Postgres + Edge Functions). El entrenamiento sugerido, el ciclo de
entrenamiento y el chat del coach los genera Claude desde Edge Functions, para
que la clave de Anthropic no viaje nunca dentro de la app. Una cuarta función
manda los recordatorios push, y a esa la llama un cron, no la app.

## Puesta en marcha

**1. Crea el proyecto** en [supabase.com](https://supabase.com) y apunta la URL
y la clave `anon` (Project Settings → Data API).

**2. Configura el acceso.** Authentication → Providers → Email. Durante el
desarrollo conviene desactivar *Confirm email*: con la confirmación activada,
registrarse no abre sesión hasta abrir el enlace del correo.

**3. Ejecuta las migraciones** en orden, desde el SQL Editor del panel:

| Archivo | Qué hace |
|---|---|
| `0001_workout_schema.sql` | Tablas y RLS por `auth.uid()` |
| `0002_seed_exercises.sql` | Catálogo inicial de ejercicios |
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
| `0019_exercise_catalog.sql` | Catálogo completo, con material y patrón |
| `0020_profile_planning_fields.sql` | Días concretos, duración, técnica, prioridades |
| `0021_birth_date.sql` | Fecha de nacimiento en lugar del año |
| `0022_weekly_split.sql` | Reparto semanal (lo reemplaza `0028`, pero hace falta ejecutarlo antes) |
| `0023_coach_retention.sql` | Caducidad de la conversación |
| `0024_enable_auth.sql` | Cierra el acceso anónimo y crea el perfil al registrarse |
| `0026_delete_account.sql` | Borrado de cuenta desde la app (lo exige Apple) |
| `0027_onboarding_context.sql` | Campo libre del objetivo y contexto extra para el prompt |
| `0028_training_cycle.sql` | Ciclo de sesiones en lugar del reparto por días de la semana |
| `0029_shared_workouts.sql` | Entrenamientos que llegan por enlace de otro usuario |
| `0030_completed_session_summary.sql` | Resumen y sensaciones al terminar |
| `0031_session_duration_from_first_set.sql` | La duración cuenta desde la primera serie |
| `0032_progress_period_activity.sql` | Comparación de "Tu actividad" contra el periodo anterior |
| `0033_push_notifications.sql` | Tokens de push y a quién toca avisar |
| `0034_achievements.sql` | Logros: métricas y fecha de desbloqueo |
| `0035_battles.sql` | Batallas entre amigos: tablas y marcador. Ver `BATALLAS.md` |

### Archivos que no forman parte de la instalación

| Archivo | Cuándo |
|---|---|
| `0003_dev_open_access.sql` | Etapa antigua sin login. **No ejecutar.** |
| `0004_drop_dev_access.sql` | Sustituido por `0024`. |
| `0005_seed_dev_plan.sql` | Opcional: entrenamiento de prueba |
| `0011_seed_dev_weight.sql` | Opcional: cinco pesajes de prueba |
| `0013_seed_dev_streak.sql` | Opcional: sesiones para probar la racha |
| `0018_reset_training_data.sql` | Borra tus datos de entrenamiento |
| `0025_remove_dev_user.sql` | **Obsoleto, no ejecutar.** Ver abajo |

La cuenta que `0025` iba a borrar estaba creada con el correo real del dueño de
la app, así que al activar el login pasó a ser su cuenta de usuario, con sus
entrenamientos dentro. El archivo se conserva como registro y con el `delete`
comentado.

Los entrenamientos importados a mano viven en `supabase/imports/`, un archivo
por día.

**4. Configura la app.** Copia `.env.example` como `.env` y rellena los dos
valores.

**5. Despliega las funciones.** Primero, una sola vez:

```bash
npx supabase login
```

Enlazar esta carpeta con el proyecto en la nube. El `project-ref` es el
subdominio de tu URL (`https://<ESTO>.supabase.co`). Pedirá la contraseña de
la base de datos:

```bash
npx supabase link --project-ref dcuvfhbqoteodzzldocc
```

Subir la clave de Anthropic. Es una variable de entorno del servidor: la ven
las funciones, nunca la app. Se saca de
[console.anthropic.com](https://console.anthropic.com):

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Y las funciones. `--use-api` empaqueta en los servidores de Supabase; sin esa
opción el CLI necesita Docker instalado en local:

```bash
npx supabase functions deploy generate-workout --use-api
```

```bash
npx supabase functions deploy generate-split --use-api
```

```bash
npx supabase functions deploy coach-chat --use-api
```

**6. Arranca la app** con `npx expo start --clear`. El `--clear` no es opcional
la primera vez: las variables `EXPO_PUBLIC_` se incrustan en el bundle y el
caché anterior no las tiene.

## Recordatorios push

Aparte, porque no hace falta para que la app funcione y tiene sus propios
pasos. Cinco cosas, en orden.

**1. La migración `0033`**, si no la ejecutaste con el resto.

**2. El secreto compartido.** La función notifica a todo el mundo, así que no
puede quedar abierta a quien conozca la URL: se protege con una cabecera que
solo conocen ella y el cron.

En PowerShell —`$(openssl ...)` es sintaxis de bash y en `cmd` no se sustituye
por nada, así que el secreto se guardaría vacío:

```powershell
$secret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
Write-Host "CRON_SECRET: $secret"
npx supabase secrets set CRON_SECRET=$secret --project-ref dcuvfhbqoteodzzldocc
```

**Apunta el valor que imprime.** Supabase no lo devuelve nunca en claro
—`secrets list` enseña un hash— y hace falta otra vez en el paso 4.

**3. La función.** Va con `--no-verify-jwt` porque no la llama un usuario con
sesión, la llama el cron:

```bash
npx supabase functions deploy send-reminders --use-api --no-verify-jwt
```

**4. El cron.** En el SQL Editor, sustituyendo el secreto del paso 2:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'enviar-recordatorios',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://dcuvfhbqoteodzzldocc.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'EL_SECRETO_DEL_PASO_2'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Cada hora y no una vez al día porque cada usuario elige la suya y puede estar
en otro huso horario: cada pasada pregunta a quién le toca **ahora mismo**.

**5. Una build nueva.** `expo-notifications` es código nativo: con un `eas
update` no llega, y en la app instalada ni siquiera aparece el diálogo de
permiso.

### Comprobar que funciona

```sql
select jobname, schedule, active from cron.job;
select platform, updated_at from public.push_tokens;
select * from public.users_to_remind();
```

La tercera sale vacía casi siempre, y es lo correcto: solo devuelve a alguien
si en su hora local es la que eligió, hoy es día de entrenamiento suyo y aún
no ha terminado sesión.

Para probar sin esperar a la hora, un envío directo al primer token
registrado:

```sql
select net.http_post(
  url := 'https://exp.host/--/api/v2/push/send',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := (
    select jsonb_build_object(
      'to', token,
      'sound', 'default',
      'title', 'Hoy toca',
      'body', 'Tu entrenamiento de hoy te está esperando.',
      'data', jsonb_build_object('screen', 'workout')
    )
    from public.push_tokens
    limit 1
  )
);
```

Con la app **cerrada**, que es como la verá el usuario. Abierta sale como
banner dentro de la app, que se ve distinto.

## Cómo está la seguridad

- **Cada usuario ve solo lo suyo.** Todas las tablas tienen RLS por
  `auth.uid()`, y desde `0024` no queda ningún acceso anónimo.
- **Las funciones sacan el usuario del token**, no del cuerpo de la petición.
  Usan la clave de servicio y se saltan RLS, así que confiar en un `user_id`
  enviado por el cliente permitiría pedir los datos de cualquiera.
- **El borrado de cuenta sale del token.** `delete_account()` es `security
  definer` y no recibe parámetros: mira `auth.uid()`, así que solo puede borrar
  la cuenta de quien la llama.
- **El coach propone, no ejecuta.** Sus herramientas no escriben en la base de
  datos: devuelven una propuesta que la app aplica, con los permisos del
  propio usuario, cuando él lo confirma.
- **La clave de Anthropic vive solo como secreto de Supabase.** Nunca en el
  `.env` de la app, cuyo contenido acaba dentro del bundle.
- **`send-reminders` va sin JWT pero con secreto.** Es la única función que no
  llama un usuario con sesión, así que no puede sacar a nadie del token: se
  protege con `CRON_SECRET` en una cabecera. Sin eso, cualquiera que diera con
  la URL podría notificar a todos los usuarios.
- **Los entrenamientos compartidos viajan dentro del enlace.** RLS impide que
  un usuario lea las filas de otro, así que el enlace lleva el entrenamiento
  entero codificado en lugar de apuntar a una fila ajena. Al aceptarlo se crea
  como plan propio en la cuenta de quien lo recibe.

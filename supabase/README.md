# Backend de ATHLOS

Supabase (Postgres + Edge Functions). El entrenamiento sugerido, el reparto
semanal y el chat del coach los genera Claude desde Edge Functions, para que
la clave de Anthropic no viaje nunca dentro de la app.

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
| `0022_weekly_split.sql` | Reparto semanal |
| `0023_coach_retention.sql` | Caducidad de la conversación |
| `0024_enable_auth.sql` | Cierra el acceso anónimo y crea el perfil al registrarse |

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

Y las tres funciones. `--use-api` empaqueta en los servidores de Supabase; sin
esa opción el CLI necesita Docker instalado en local:

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

## Cómo está la seguridad

- **Cada usuario ve solo lo suyo.** Todas las tablas tienen RLS por
  `auth.uid()`, y desde `0024` no queda ningún acceso anónimo.
- **Las funciones sacan el usuario del token**, no del cuerpo de la petición.
  Usan la clave de servicio y se saltan RLS, así que confiar en un `user_id`
  enviado por el cliente permitiría pedir los datos de cualquiera.
- **El coach propone, no ejecuta.** Sus herramientas no escriben en la base de
  datos: devuelven una propuesta que la app aplica, con los permisos del
  propio usuario, cuando él lo confirma.
- **La clave de Anthropic vive solo como secreto de Supabase.** Nunca en el
  `.env` de la app, cuyo contenido acaba dentro del bundle.

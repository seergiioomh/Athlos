# Batallas — diseño y estado

Competición entre amigos por constancia. Documento vivo: recoge el diseño
completo, **por qué** cada decisión es como es, y en qué paso va la
implementación. Si retomas esto sin contexto previo, empieza aquí.

Última actualización: **11 de agosto de 2026**.

---

## La idea

Un grupo de amigos compite durante una o varias semanas. Gana quien mejor
cumple **su propio plan**, no quien más peso levanta. Estilo Playtomic: se
crea un grupo con un código, la gente entra, y hay clasificación en vivo
mientras dura.

El marcador se mueve en cuanto alguien termina un entrenamiento, así que hay
tensión continua, y el último día hay un ganador.

---

## La regla que sostiene todo

> **Nunca se puntúa el peso ni el volumen absoluto.**

Comparar kilos entre personas compara biología, no esfuerzo: alguien de 90 kg
levanta más que alguien de 55 kg casi siempre. Y comparar volumen premia a
quien tiene más tiempo libre, no a quien se esfuerza más.

Todo se mide **contra uno mismo**. Así compiten de igual a igual un
principiante y un veterano, alguien que quiere ganar músculo y alguien que
quiere perder grasa, quien entrena 3 días y quien entrena 6.

Si algún día se toca la fórmula, que sea sin romper esta regla.

---

## La fórmula

```
Puntos = min(sesiones hechas / objetivo, 1) × 1000     ← adherencia, tope 1000
       + marcas personales superadas × 50               ← tope 300
       + logros desbloqueados × 75
       + días activos × 15
```

**Adherencia** es el término que manda, y el que hace justa la batalla.
`objetivo` es *tuyo*, así que quien entrena 3 días y hace 3 (1000 puntos) gana
a quien entrena 6 y hace 5 (833).

**Marcas personales**: ejercicios donde tu mejor peso durante la batalla supera
tu mejor peso *anterior* a ella. Se cuentan ejercicios distintos, no series.

**Días activos**: días distintos con sesión terminada dentro de la batalla.
Solapa a propósito con la adherencia: como la adherencia está topada en 1000,
es lo único que premia pasarse del objetivo, y lo hace con un peso pequeño.

### De dónde sale el objetivo

De una mezcla: **2/3 los días declarados en el perfil y 1/3 la media real de
las últimas 4 semanas**. Manda el plan, y la realidad reciente lo corrige un
poco en los dos sentidos.

Esto se corrigió sobre la marcha (`0036`) y merece explicación, porque la
primera versión parecía la buena y no lo era.

`0035` usaba **solo la media real**, para cerrar el agujero de bajarse los días
declarados justo antes de retar. Pero abría uno peor: entrenar poco las semanas
previas te regalaba un objetivo ridículo. Con 3 sesiones en 28 días y 5 días
declarados salía un objetivo de **1** — un entrenamiento y ya tenías los 1000
puntos de adherencia al máximo.

Y de los dos agujeros, el que abrí era el barato: entrenar menos no cuesta nada
y no se ve. Bajarse los días declarados sí cuesta, porque **el coach diseña el
ciclo con ese número** y te empeora los entrenamientos de verdad. Los días
declarados son la señal más robusta, justo al revés de lo que asumí, y además
son tu plan: que es exactamente lo que la batalla mide si cumples.

El objetivo se **congela al empezar** (`target_sessions` en
`battle_participants`), así que cambiar el perfil a mitad tampoco sirve.

### Los topes son antitrampas

Hoy nadie tiene motivo para mentir al registrar series. La competición lo crea,
y una serie inventada no solo ensucia el marcador: **corrompe los datos con los
que el coach programa los entrenamientos**.

Por eso ningún término crece sin límite. Inventar tiene techo y deja de
compensar. No cierra el agujero del todo —nada lo hace—, pero quita el
incentivo.

---

## Seguridad: solo cruzan números

Es la primera vez que la app deja ver algo de otra cuenta, así que:

- **Ninguna política nueva abre tablas de datos personales.** Todo pasa por
  funciones `security definer` que devuelven **solo agregados**.
- Tu rival ve tus puntos, tus sesiones hechas y tu objetivo. **Nunca** tus
  ejercicios, tus pesos, tu peso corporal ni tus lesiones.
- `battle_score()` comprueba que quien llama participa en esa batalla antes de
  devolver nada.

### La trampa de la recursión en RLS

`battle_participants` necesita una política del tipo "puedo ver a los
participantes de una batalla en la que participo". Escrita directamente,
consulta `battle_participants` desde la política de `battle_participants` y
Postgres entra en **recursión infinita**.

Por eso existe `is_battle_participant()`, que es `security definer` y por tanto
se salta RLS al comprobarlo. Las políticas la usan a ella, nunca una subconsulta
directa. **No la quites ni la conviertas en invoker.**

---

## Decisiones tomadas, y por qué

| Decisión | Motivo |
|---|---|
| No hay tabla de amigos | La batalla **es** la relación. Sin directorio de usuarios que proteger ni lista que mantener |
| Código de 6 caracteres, no enlace | Los enlaces `athlos://` llegan a WhatsApp como texto plano. Un código se dicta, se copia y se pega donde sea |
| Sala de espera que se cierra al empezar | Dejar entrar a mitad rompe la equidad: quien entra el penúltimo día con objetivo prorrateado se cuela arriba |
| Máximo 8 participantes | Más no se lee en una pantalla de móvil, y el marcador crece con cada uno |
| Una batalla activa a la vez | Dos en paralelo diluyen el pique |
| Duración 1, 2 o 4 semanas | Por defecto **1**: corta para no aburrir, larga para absorber un día malo |
| El cierre lo hace el cron horario | Ya existe para los recordatorios. Cero infraestructura nueva |
| Avisos solo en 3 momentos | Notificar cada adelantamiento, con 8 personas, sería insufrible |

### Casos límite

- Quien se apunta y no entrena se queda a 0 y va último. No hace falta
  expulsarlo.
- Invitaciones sin aceptar caducan a los 7 días.
- Si alguien borra su cuenta, sus filas caen en cascada.
- Empate a puntos: desempata sesiones hechas, luego series, luego empate real.

---

## Los tres pasos

### Paso 1 — Tablas y marcador ✅ HECHO

`supabase/migrations/0035_battles.sql`. Tablas, RLS y las funciones de cálculo.
**Sin nada social**: se crea una batalla en solitario y se comprueba que los
puntos cuadran con lo que se entrena.

Aquí se valida lo único que de verdad puede salir mal, que es la fórmula.

Lo que hay:

| Función | Qué hace |
|---|---|
| `battle_target(user, dias)` | El objetivo de sesiones, de la media real de 4 semanas |
| `create_battle(nombre, dias)` | Crea la batalla en sala de espera y mete al creador |
| `start_battle(id)` | Sala de espera → activa. Congela objetivos y fija el final |
| `battle_score(id)` | La clasificación con su desglose |
| `is_battle_participant(id, user)` | Solo para las políticas RLS. Ver *la trampa de la recursión* |

**Cómo probarlo.** Ojo: el editor SQL de Supabase corre como rol `postgres`
**sin JWT**, así que `auth.uid()` es NULL y todas estas funciones responden
"Sesión no válida". No es un fallo, es la protección haciendo su trabajo. Hay
que suplantar al usuario primero:

```sql
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'TU_CORREO'))::text,
  false
);

select public.create_battle('Reto de prueba', 7) as battle_id;
```

**La suplantación dura una sola ejecución.** El editor usa un pool de
conexiones, así que cada *Run* puede caer en otra y `set_config` se pierde. La
primera sentencia hay que repetirla delante de cada tanda:

```sql
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from auth.users where email = 'TU_CORREO'))::text,
  false
);

select public.start_battle('<id>');
select * from public.battle_score('<id>');
```

El primer parámetro de `create_battle` es el **nombre de la batalla**, no un
correo: a nadie se le invita aquí, eso es el paso 2.

Entrena, vuelve a llamar a `battle_score` y comprueba que los puntos suben como
dice la fórmula. Ese es el objetivo real del paso 1.

### Paso 2 — Unirse: código, sala de espera y acceso entre cuentas ✅ HECHO

`supabase/migrations/0037_battle_join.sql`. Es el paso que abre el acceso entre
cuentas, así que sigue sin haber ninguna política de insert o update en las
tablas: escribir a mano se saltaría el aforo, la regla de una batalla a la vez
y el estado de sala de espera.

| Función | Qué hace |
|---|---|
| `battle_preview(codigo)` | Lo que ves antes de entrar: nombre, quién la creó y cuántos van. **La única que puede llamar quien aún no participa**, así que no devuelve nada más |
| `join_battle(codigo)` | Entrar, validando aforo, estado y que no tengas otra en curso |
| `leave_battle(id)` | Salir de una sala de espera. Quien la creó no puede: tiene que cancelar |
| `cancel_battle(id)` | Cancelar la sala. Solo el creador, solo antes de empezar |
| `expire_stale_lobbies()` | Cancela salas de más de 7 días. La llama el cron en el paso 3 |
| `battle_max_players()` | El aforo, 8, en un solo sitio |

Dos detalles que no son adorno:

- **`join_battle` bloquea la fila con `for update`.** Sin eso, dos personas
  entrando a la vez pasan las dos la comprobación de aforo y la batalla acaba
  con nueve.
- **`leave_battle` y `cancel_battle` existen para no dejar a nadie atrapado.**
  Como solo se permite una batalla a la vez, una sala que nunca arranca dejaría
  a su creador sin poder crear ninguna otra jamás. `expire_stale_lobbies()`
  cubre el caso de quien ni siquiera entra a cancelarla.
- **`expire_stale_lobbies()` no la puede llamar la app.** No comprueba quién
  llama porque la invoca el cron, así que se le revoca el permiso a `anon` y
  `authenticated`.

### Paso 3 — Pantallas y avisos ✅ HECHO

`0038_battle_close.sql`, la función `close-battles` y todo
`src/features/battles/`.

**SQL.** `battle_score` comprobaba que quien llama participa, y el cron no es
nadie —no hay `auth.uid()`—, así que no podía usarla para saber quién ganó.
En vez de duplicar la fórmula (que acabaría divergiendo a la primera de
cambio), se parte en dos: `battle_ranking` tiene el cálculo y no pregunta quién
llama, y `battle_score` se queda como la puerta que sí lo pregunta. Una sola
fórmula, dos maneras de entrar. `battle_ranking` está revocada para los roles
del cliente: tal cual dejaría leer el marcador de una batalla ajena sabiendo
su id.

`close_due_battles()` usa `for update skip locked` para que dos pasadas
solapadas del cron no se peleen por la misma fila.

**App.** Una sola pantalla (`BattlesScreen`) con cuatro estados —sin batalla,
sala de espera, en curso y resultado—, como hace `WorkoutScreen`. Cuatro
pantallas separadas para un flujo lineal solo añaden navegación.

La tarjeta de Inicio aparece **solo mientras está activa**: es información con
fecha de caducidad, y la sala de espera o el resultado no se miran a diario.

No se usa `expo-clipboard` para el botón de copiar el código. Es un módulo
nativo: añadirlo cambia la huella y obliga a recompilar la app entera por un
botón. El menú de compartir del sistema ya trae "Copiar", y el código es texto
seleccionable.

**Avisos.** Al cerrar una batalla se notifica a todos, distinguiendo a quien
gana. Falta el aviso de mitad de batalla si vas fuera del podio; se decidió no
notificar cada adelantamiento porque con 8 personas sería insufrible.

### Ajustes posteriores

`0039_battle_lobby_participants.sql` corrige un detalle de PostgREST: aunque
`battle_participants.user_id` y `profiles.id` apuntan ambos a `auth.users`, no
existe una relación directa que el cliente pueda seguir con un `select` anidado.
La sala consulta `battle_lobby_participants(id)`, `security definer`, que antes
comprueba que quien llama ya participa y devuelve únicamente id y nombre. No
abrir una política de lectura de perfiles para arreglarlo.

El código de la sala no entra a ciegas: al completar sus seis caracteres se
llama a `battle_preview`, se ve nombre, creador y número de participantes, y
solo si la sala sigue en espera aparece «Unirme a esta batalla». Dentro, el
creador se marca como tal y quien no lo creó puede salir con una acción roja;
la cancelación sigue siendo exclusiva del creador.

`0041_battle_achievements.sql` añade cuatro logros propios: disputar la primera
batalla, disputar cinco, la primera victoria y tres victorias. Una sala
cancelada no cuenta; solo las batallas activas o terminadas, y las victorias ya
cerradas por el cron. Estos logros miden participación y constancia competitiva,
no peso, volumen ni información de rivales.

### Puesta en marcha del paso 3

```bash
npx supabase functions deploy close-battles --use-api --no-verify-jwt
```

Y el cron, en el editor SQL, con el mismo `CRON_SECRET` que `send-reminders`:

```sql
select cron.schedule(
  'cerrar-batallas',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://dcuvfhbqoteodzzldocc.supabase.co/functions/v1/close-battles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'EL_MISMO_SECRETO'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

En el minuto 5 y no en el 0 para no solaparse con los recordatorios.

---

## Cómo probarlo sin una segunda persona

Suplantando a otro usuario con el `set_config` de más arriba, cambiando el
correo. Sirve para validar aforo, códigos y que la clasificación ordena bien
con varios, aunque no sustituye a probarlo con otro móvil de verdad.

---

## Lo que bloquea de verdad

**Hace falta al menos otra cuenta real.** El paso 1 se prueba en solitario, pero
los pasos 2 y 3 no tienen sentido sin alguien más, y las pruebas externas de
TestFlight siguen sin configurar: eso exige pasar la Beta App Review y tener
política de privacidad.

No es un problema de código, pero para el paso 2 conviene tenerlo resuelto.

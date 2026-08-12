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

De la **media real de sesiones por semana de las últimas 4 semanas**, no de los
días declarados en el perfil. Si no hay historial suficiente, se cae a
`days_per_week`.

Es deliberado: usando lo declarado, bajarse a "1 día por semana" antes de retar
era la jugada ganadora. Usando lo que de verdad haces, ese atajo desaparece.

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

**Cómo probarlo** (editor SQL, con tu sesión):

```sql
select public.create_battle('Prueba', 7);
select public.start_battle('<id devuelto>');
select * from public.battle_score('<id devuelto>');
```

Entrena, vuelve a llamar a `battle_score` y comprueba que los puntos suben como
dice la fórmula.

### Paso 2 — Unirse: código, sala de espera y acceso entre cuentas ⬜ PENDIENTE

Lo que falta:

- `join_battle(codigo)`: valida que la batalla está en sala de espera, que no
  está llena (8), que no participas ya y que no tienes otra activa.
- `battle_preview(codigo)`: `security definer`, devuelve **solo** el nombre de
  la batalla, quién la creó y cuántos van. Es lo que se ve antes de aceptar,
  así que no puede filtrar nada más.
- Caducidad de las invitaciones a los 7 días.

Es el paso que abre el acceso entre cuentas. Cuidado aquí.

### Paso 3 — Pantallas y avisos ⬜ PENDIENTE

- Crear batalla, sala de espera con el código, clasificación en vivo, resultado.
- Tarjeta en Inicio mientras está activa, con días restantes.
- Cierre y aviso desde el cron: al empezar, a mitad si vas fuera del podio, y
  el resultado final.

---

## Lo que bloquea de verdad

**Hace falta al menos otra cuenta real.** El paso 1 se prueba en solitario, pero
los pasos 2 y 3 no tienen sentido sin alguien más, y las pruebas externas de
TestFlight siguen sin configurar: eso exige pasar la Beta App Review y tener
política de privacidad.

No es un problema de código, pero para el paso 2 conviene tenerlo resuelto.

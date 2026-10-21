# Personalidad y comportamiento (pet.config.js)

`pet.config.js` define el nombre y todo lo que dice la mascota. Cada clave de `phrases` es una
lista; la mascota elige una al azar. `{name}` se reemplaza por el nombre. Si falta una clave,
se usan frases genéricas, así que no es obligatorio llenarlas todas, pero una mascota con frases
propias se siente mucho más viva. Escríbelas en el idioma del usuario.

## Campos

| Campo | Para qué | Ejemplo |
|---|---|---|
| `name` | Nombre visible (menús, ventana, bandeja) | `'Cafecito'` |
| `id` | Identificador corto: minúsculas, números, guiones | `'cafecito'` |
| `appId` | Identificador único de la app (estilo dominio invertido). Si el usuario no tiene marca o dominio, déjalo fuera: se usa `com.mascota.<id>` | `'com.marca.cafecito'` |
| `author` | Quién la publica: la marca, o el nombre del usuario si lo dio; si no, déjalo fuera (se usa el nombre de la mascota). No inventes una marca | `'Mi Marca'` |
| `description` | Una línea | `'Cafecito: una taza que te acompaña'` |
| `version` | Opcional; si no, 1.0.0 | `'1.2.0'` |

Cambiar `id` en una mascota ya instalada hace que el usuario vuelva a iniciar sesión en Claude
dentro de ella (la sesión se guarda por id).

## Claves de frases

| Clave | Cuándo aparece |
|---|---|
| `hello` | Al pasar el mouse encima (después del saludo del día) |
| `greetMorning` / `greetMonday` / `greetAfternoon` / `greetNight` | Primer saludo de cada parte del día |
| `quips` | Comentarios sueltos cada 2–5 minutos |
| `lunch` (12–14 h), `evening` (17–19 h), `monday` (lunes en la mañana), `fridayQuips`, `night` (22–6 h), `music` (si suena música) | Se suman a `quips` según la hora |
| `coffeeMorning` / `coffee` | Al tomar café (mañana / resto del día) |
| `dance`, `friday` | Al bailar (normal / viernes en la tarde) |
| `stretch`, `stretchNight` | Al estirarse (normal / de noche) |
| `moonwalk`, `jetpack`, `look`, `walk` | Al empezar esas acciones |
| `slipUp` | Al levantarse después de resbalar |
| `crashHit`, `crashUp`, `softLand` | Al caer desde muy alto (golpe / al levantarse) y desde poca altura |
| `floating` | Al soltarla con la gravedad apagada |
| `sleep`, `wake` | Al dormirse (desde el menú) y al despertar |
| `back` | Al volver después de esconderse por un juego o video a pantalla completa |

La hora en punto ("¡Son las 3 de la tarde!") y el nombre de la canción se generan solos.

**Cómo escribir buenas frases:** cortas (la burbuja muestra hasta 2 líneas, unos 50 caracteres; las de una línea, hasta ~25, se leen mejor), con humor que
salga del sujeto (una taza habla de café y de no derramarse; un perro de paseos y croquetas; un
astronauta de gravedad y Houston), máximo un emoji, y sin sonar a publicidad. Unas 6–10 `quips`
y 2–3 de cada acción es suficiente.

## Ajustes de comportamiento (opcional, en pet.js)

Solo si el usuario lo pide explícitamente:

- **Frecuencia de cada acción**: función `weights()` en `pet.js` (números relativos; más alto = más seguido).
- **Velocidad al caminar**: constante `speed` dentro de `frame()`.
- **Tiempo para dormirse**: función `sleepAfter()` (4 min de día, 1,5 min de noche).
- **Tamaño inicial**: `settings.scale` al inicio de `main.js` (0.45 mini – 1.0 grande).
- **Atajo de teclado**: `HOTKEY` en `main.js` (por defecto Ctrl/Cmd + Shift + Espacio).

Lo que hace la app (no cambia entre mascotas): pasea por la barra de tareas, abre claude.ai con
la cuenta del usuario en un panel junto a ella, pestaña de música que controla la app de
Spotify instalada (Windows y Mac), se esconde con juegos o videos a pantalla completa, cambia de
tamaño con la rueda del mouse, se arrastra y cae con golpe y polvo, flota si se apaga la
gravedad, y tiene menú de clic derecho con acciones, tamaño y opciones.

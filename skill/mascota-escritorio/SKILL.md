---
name: mascota-escritorio
description: Crea una mascota de escritorio en estilo voxel a partir de la foto de cualquier cosa (un personaje, la mascota de una marca, un animal, un producto, un logo, un objeto) y la entrega como app instalable para Windows y Mac. La mascota camina sobre la barra de tareas, abre claude.ai con la cuenta del usuario al darle clic, controla Spotify, reacciona según la hora, baila, toma café, vuela con jetpack, se cae con golpe y se esconde en juegos a pantalla completa. Usa esta skill siempre que alguien quiera una mascota, bot, compañero o "botsito" que viva en el escritorio, un desktop pet o asistente animado en la pantalla, convertir una foto o un personaje en mascota de escritorio, o un acceso rápido a Claude con forma de personaje, aunque no diga "voxel" ni "skill".
---

# Mascota de escritorio voxel

Convierte la foto de cualquier cosa en una mascota voxel que vive en el escritorio y abre Claude
con un clic. La app ya está hecha en `template/` (Electron): solo cambian dos archivos por
mascota, `character.js` (el modelo voxel) y `pet.config.js` (nombre y frases). Todo lo demás
(animaciones, panel con Claude, música, pantalla completa, menús) funciona igual para cualquier personaje.

Ejemplos incluidos: `template/` trae a **Astro** (astronauta, humanoide), `examples/taza/` a
**Cafecito** (una taza, objeto sin cuerpo) y `examples/perro/` a **Canela** (perrita salchicha:
hocico, orejas caídas, collar y cola). Mira el más parecido a tu sujeto antes de modelar.

## Qué necesitas del usuario

1. **La foto** (o una descripción clara si no tiene foto).
2. **Un nombre** para la mascota. Si no lo da, propón dos o tres que salgan del sujeto.
3. Opcional: **personalidad** (graciosa, tierna, seria, sarcástica…) e **idioma** de las frases.
   Por defecto, el idioma de la conversación y un tono simpático.

Pregunta solo lo que falte, todo junto en un mensaje, y empieza a modelar en cuanto tengas la foto.

**Antes de modelar, revisa de quién es el sujeto.** Haz mascotas de cosas propias del usuario o
genéricas: su marca o su logo, su perro, su producto, un personaje que él creó, un objeto
cotidiano. Si la foto es un personaje conocido de otra empresa (de videojuegos, películas,
caricaturas, mascotas de marcas ajenas), no lo recrees ni hagas una variante que se le parezca:
dilo en una frase y ofrece una mascota original con otra idea. Con personas reales, solo el
propio usuario o alguien que él indique que está de acuerdo, nunca figuras públicas.

## Flujo

### 1. Crear el proyecto

```bash
bash <skill>/scripts/new_project.sh <carpeta-de-trabajo>/<id-de-la-mascota>
```

Necesitas `node` y `python3` con Pillow (`pip install pillow` si falta).

### 2. Leer la foto

Identifica de 3 a 6 rasgos que hacen reconocible al sujeto (silueta, color dominante, la "cara",
un accesorio o detalle de color fuerte) y saca la paleta:

```bash
python3 <skill>/scripts/palette.py <foto>
```

Elige de 5 a 9 colores planos y con contraste. Si la foto tiene fondo, ignora sus colores.
Si no hay foto, trabaja con la descripción: elige tú la paleta y los rasgos.

### 3. Modelar `character.js`

Lee **`references/rig.md`** antes de escribir el archivo: tiene el esqueleto (dónde va cada
pieza para que caminar, sentarse y caerse funcionen), las ayudas de modelado (`box`, `blob`,
`decal`, `art`, `paintSide`, `mirrorX`) y cómo mapear personas, animales, objetos y logos al
cuerpo chibi.

Reemplaza `<proyecto>/character.js` completo y revisa:

```bash
node <proyecto>/tools/check.js <proyecto>
python3 <proyecto>/tools/sheet.py <proyecto> <salida>/<Nombre>-poses.png
```

`check.js` marca ERROR (hay que corregir) o AVISO (revisa en la hoja; si se ve bien, se acepta).

**Mira la hoja** (12 poses, incluida la espalda) y compárala con la foto. Pregúntate: ¿se reconoce el sujeto en
`idle` sin leer el nombre? ¿La cara se ve al frente? ¿Al sentarse (`work`), dormir y caerse
(`slip`) se ve bien? Corrige y vuelve a generar la hoja. Lo normal son 2 a 4 vueltas; no
entregues la primera versión sin haberla mirado.

### 4. Escribir `pet.config.js`

Lee **`references/personalizar.md`**. Pon `name`, `id`, `appId`, `author`, `description` y
frases propias del sujeto en el idioma del usuario (cortas, con humor que salga del personaje).

### 5. Vista previa, para que el usuario revise

```bash
node <proyecto>/tools/configure.js <proyecto>
python3 <proyecto>/tools/icons.py <proyecto>
python3 <proyecto>/tools/preview.py <proyecto> <salida>/<Nombre>-vista-previa.html
```

Antes de entregar, mira `revision-iconos.png` (ícono de la app y de la bandeja; ajusta `iconBg`
o `trayCrop` si hace falta) y, si tienes un navegador sin interfaz (Electron, Playwright, Chrome),
abre la vista previa y revisa que no haya errores en la consola.

Entrega la **vista previa HTML** y la **hoja de poses**. La vista previa funciona en el teléfono:
la mascota pasea, se puede tocar para abrir un panel de ejemplo, arrastrar y soltar para ver la
caída, y tiene botones arriba para probar cada acción. Pide comentarios y ajusta antes de
compilar, porque compilar es lo más lento.

### 6. Instaladores

Lee **`references/empaquetar.md`** y elige el camino:

- **GitHub** (recomendado, sobre todo para quien no programa): el proyecto trae el flujo que
  compila Windows y Mac en la nube. Si hay conector de GitHub, ofrece crear el repositorio y
  subirlo; pide confirmación y nombre antes de crear nada en su cuenta.
- **En su computadora**: `npm install` y `npm run dist:win` o `npm run dist:mac`.
- **Aquí mismo**: `bash <skill>/scripts/build_local.sh <proyecto> all` (Windows necesita wine;
  Mac sale como `.zip` sin firma).

Entrega cada archivo suelto (no todo en un solo ZIP: hay gente que revisa desde el teléfono y no
puede abrir comprimidos). Puedes sumar un ZIP del proyecto como extra.

## Al entregar

En pocas líneas, di:

- Qué hace la mascota: clic abre Claude con su cuenta, pestaña de música para Spotify, acciones
  en el clic derecho, rueda del mouse para el tamaño, arrastrar y soltar, se esconde en juegos.
- Cómo abrirla la primera vez: aviso de Windows "Más información → Ejecutar de todas formas"; en
  Mac, lo que corresponda según cómo se compiló (ver `references/empaquetar.md`, sección 4).

Avisa también estos límites, que son de la plataforma y no de la mascota:

- La pestaña de música controla la app de Spotify instalada. No es un reproductor propio: el
  reproductor web de Spotify no funciona dentro de apps así por su protección anticopia.
- Para entrar a Claude conviene usar correo y código; el botón de Google a veces se bloquea dentro
  de apps de escritorio.
- Lo que no hayas podido probar de verdad. Por ejemplo, el control de Spotify o la detección de
  pantalla completa en Windows no se pueden probar desde Linux.

## Archivos de la skill

- `template/` — la app completa con Astro de ejemplo (copiarla, nunca editarla en su lugar).
- `examples/taza/` y `examples/perro/` — Cafecito y Canela: más `character.js` y `pet.config.js` de ejemplo.
- `scripts/` — `new_project.sh`, `palette.py`, `build_local.sh` (más copias de las herramientas
  que también vienen dentro de cada proyecto en `tools/`: `check.js`, `sheet.py`, `icons.py`,
  `preview.py`, `configure.js`).
- `references/rig.md` — cómo modelar el personaje (léelo siempre antes del paso 3).
- `references/personalizar.md` — nombre, frases y ajustes de comportamiento.
- `references/empaquetar.md` — instaladores, GitHub y primera apertura.

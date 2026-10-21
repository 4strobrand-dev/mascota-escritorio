# Mascota de escritorio voxel

Una mascota voxel que camina sobre la barra de tareas de tu escritorio. Al darle clic abre
Claude (claude.ai) con tu cuenta en un panel a su lado, y trae una pestaña para controlar Spotify.

## Qué hace

- **Clic:** abre o cierra el panel de Claude. También se abre con Ctrl/Cmd + Shift + Espacio.
- **Pestaña Música:** muestra la canción que suena en Spotify, con anterior, play/pausa y siguiente.
  Mientras suena música, la mascota baila.
- **Clic derecho:** menú de acciones (bailar, café, jetpack, moonwalk, resbalarse, dormir…),
  tamaño, gravedad, pasear e iniciar con el sistema.
- **Rueda del mouse** sobre la mascota: cambia su tamaño.
- **Arrastrar y soltar:** cae con golpe. Si la gravedad está apagada, se queda flotando donde la sueltes.
- **Según la hora:** café en la mañana, aviso del almuerzo, bostezos de noche y jetpack en cada hora en punto.
- **Pantalla completa:** se esconde sola con juegos o videos a pantalla completa y vuelve al salir.

## Archivos para personalizar

- `character.js` — el modelo voxel del personaje.
- `pet.config.js` — nombre y frases.

El resto es el motor común.

## Compilar los instaladores con GitHub

1. Sube esta carpeta a un repositorio de GitHub. Incluye la carpeta oculta `.github`.
2. En **Releases → Draft a new release**, crea una etiqueta como `v1.0.0` y publica.
3. En unos 10 minutos aparecen en ese release los archivos para descargar:
   - Windows: instalador y versión portable (`.exe`).
   - Mac: un `.dmg` para Apple Silicon y otro para Intel.

## Compilar en tu computadora

Necesitas Node.js 20 o superior y Python con Pillow.

```bash
node tools/configure.js .
python tools/icons.py .
npm install
npm start          # probar
npm run dist:win   # Windows
npm run dist:mac   # Mac
```

## Primera vez que la abres

- **Windows:** si aparece "Windows protegió su PC", elige **Más información → Ejecutar de todas formas**.
- **Mac:** si dice que no se puede verificar, ve a **Configuración del Sistema → Privacidad y seguridad
  → Abrir igualmente**.

Hecho con la skill `mascota-escritorio` para Claude.

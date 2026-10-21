# Entregar la mascota: instaladores para Windows y Mac

Hay tres caminos. Elige según lo que tenga el usuario; el más simple para alguien que no
programa es **GitHub** (no instala nada en su computadora).

## Contenido
1. GitHub Actions (recomendado)
2. Compilar en la computadora del usuario
3. Compilar en el entorno de Claude (sandbox)
4. Primera apertura en Windows y Mac
5. Problemas comunes

## 1. GitHub Actions (recomendado)

El proyecto ya trae `.github/workflows/build.yml`. GitHub compila en sus servidores un
`.exe` (instalador y portable) para Windows y un `.dmg` para Mac (Apple Silicon e Intel),
genera los íconos desde el personaje y los publica en **Releases**.

Pasos para el usuario:

1. Crear un repositorio en GitHub (puede ser privado) y subir **todo el contenido de la carpeta
   del proyecto** (incluida la carpeta oculta `.github`). No hace falta subir `assets/`: se regenera.
2. Ir a **Releases → Draft a new release**, escribir una etiqueta como `v1.0.0` y publicar.
   (O ir a **Actions → Compilar instaladores → Run workflow** para probar sin publicar.)
3. Esperar unos 10 minutos. Los instaladores aparecen en el release (o como "artifacts" en
   la ejecución de Actions).

Si la sesión tiene el conector de GitHub, Claude puede crear el repositorio, subir los archivos
y crear la etiqueta por el usuario: pídele confirmación antes (crea contenido en su cuenta) y
pregúntale el nombre del repositorio y si lo quiere público o privado. Todos los archivos del
proyecto son de texto, así que se pueden subir con la API.

Cada vez que el usuario cambie el personaje o las frases, basta subir los archivos nuevos y
crear otra etiqueta (`v1.0.1`, `v1.1.0`…).

## 2. Compilar en la computadora del usuario

Necesita Node.js 20 o superior (nodejs.org) y Python con Pillow (`pip install pillow`).
Dentro de la carpeta del proyecto:

```bash
node tools/configure.js .
python tools/icons.py .
npm install
npm start            # probar la mascota sin instalar
npm run dist:win     # en Windows → dist/*.exe
npm run dist:mac     # en Mac     → dist/*.dmg
```

Cada sistema compila bien su propio instalador; Windows no puede compilar el de Mac ni al revés.

## 3. Compilar en el entorno de Claude (sandbox)

Útil para entregar archivos directamente en la conversación.

```bash
bash <skill>/scripts/build_local.sh <proyecto> all
```

- **Windows** necesita `wine` (en Ubuntu/Debian: `dpkg --add-architecture i386 && apt-get update && apt-get install -y wine wine32 wine64`).
  Sin wine, el script lo avisa y se usa GitHub.
- **Mac** desde Linux sale como `.zip` **sin firma** (Apple Silicon e Intel). Funciona, pero el
  usuario debe habilitarla una vez con el comando de la sección 4.
- Si la red del entorno bloquea la descarga de Electron o de las herramientas de empaquetado,
  usa GitHub.
- Los `.exe` pesan ~90 MB y los `.zip` de Mac ~105 MB. Entrega cada archivo suelto.

## 4. Primera apertura en Windows y Mac

Las apps no tienen firma de un desarrollador registrado (eso cuesta dinero a Apple y Microsoft),
así que el sistema avisa la primera vez:

- **Windows**: "Windows protegió su PC" → **Más información** → **Ejecutar de todas formas**.
- **Mac, `.dmg` de GitHub**: arrastrar la app a Aplicaciones; al abrirla, si dice que no se puede
  verificar, ir a **Configuración del Sistema → Privacidad y seguridad → Abrir igualmente**.
- **Mac, `.zip` compilado en Linux**: después de moverla a Aplicaciones, pegar en Terminal
  (cambiando el nombre de la app):

  ```bash
  xattr -cr "/Applications/Nombre.app" && codesign --force --deep -s - "/Applications/Nombre.app"
  ```

- En Mac, la primera vez que use la pestaña de música, el sistema pide permiso para controlar
  Spotify: hay que aceptarlo.

Para actualizar a una versión nueva: cerrar la mascota (clic derecho → Salir) e instalar encima.

## 5. Problemas comunes

- **La compilación de Windows falla con "wine"**: no hay wine; usa GitHub o la PC del usuario.
- **"Cannot read properties of null (reading 'provider')" al final**: es un aviso de publicación
  que no afecta; los `.exe` ya quedaron en `dist/`.
- **El ícono sale vacío**: `tools/icons.py` necesita `node` en el PATH y Pillow instalado.
- **El inicio de sesión con Google no abre dentro de la app**: usar correo y código en claude.ai.

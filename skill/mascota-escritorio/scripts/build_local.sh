#!/usr/bin/env bash
# Compila instaladores en esta máquina (sandbox Linux o la PC del usuario).
# Windows desde Linux necesita wine; Mac desde Linux sale como .zip sin firmar.
# Uso: bash build_local.sh <carpeta-del-proyecto> [win|mac|all]
set -e
DIR="$(cd "${1:?carpeta}" && pwd)"; WHAT="${2:-all}"
cd "$DIR"
node "$(dirname "$0")/configure.js" "$DIR"
[ -d node_modules/electron-builder ] || npm install
rm -rf dist; mkdir -p release
NAME=$(node -p "require('./package.json').productName")
if [[ "$WHAT" == win || "$WHAT" == all ]]; then
  if [[ "$(uname)" == MINGW* || "$(uname)" == MSYS* ]] || command -v wine >/dev/null; then
    WINEDEBUG=-all npx electron-builder --win --x64 --publish never || true
    cp dist/*.exe release/ 2>/dev/null || true
  else
    echo "Sin wine: no se puede compilar Windows aquí (usa GitHub Actions)."
  fi
fi
if [[ "$WHAT" == mac || "$WHAT" == all ]]; then
  if [[ "$(uname)" == Darwin ]]; then
    npx electron-builder --mac --publish never && cp dist/*.dmg release/
  else
    npx electron-builder --mac zip --arm64 --x64 -c.mac.identity=null --publish never || true
    (cd dist/mac-arm64 && zip -qry "../../release/$NAME-Mac-AppleSilicon.zip" "$NAME.app") 2>/dev/null || true
    (cd dist/mac && zip -qry "../../release/$NAME-Mac-Intel.zip" "$NAME.app") 2>/dev/null || true
  fi
fi
ls -lh release

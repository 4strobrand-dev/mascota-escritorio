#!/usr/bin/env bash
# Copia la plantilla de la app a una carpeta nueva de trabajo.
# Uso: bash new_project.sh <carpeta-destino>
set -e
DEST="${1:?Indica la carpeta destino}"
SRC="$(cd "$(dirname "$0")/../template" && pwd)"
mkdir -p "$DEST"
cp -r "$SRC"/. "$DEST"/
echo "Proyecto creado en $DEST"

#!/usr/bin/env python3
"""Vista previa en un solo HTML (se abre en el teléfono o en cualquier navegador).
Uso: python3 preview.py <carpeta-del-proyecto> <salida.html>"""
import os, re, sys

proj, out = sys.argv[1], sys.argv[2]
read = lambda f: open(os.path.join(proj, f), encoding='utf-8').read()
h = read('pet.html')
h = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', h)
for f in ('pet.config.js', 'character.js', 'engine.js', 'pet.js'):
    h = h.replace(f'<script src="{f}"></script>', '<script>\n' + read(f).replace('</script', '<\\/script') + '\n</script>')
name = re.search(r"name:\s*'([^']+)'", read('pet.config.js'))
if name:
    h = h.replace('<title>Mascota</title>', f'<title>{name.group(1)} · vista previa</title>')
open(out, 'w', encoding='utf-8').write(h)
print('vista previa guardada en', out)

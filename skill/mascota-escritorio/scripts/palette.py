#!/usr/bin/env python3
"""Colores dominantes de una foto, para elegir la paleta del personaje voxel.
Uso: python3 palette.py <foto> [cantidad]"""
import sys
from PIL import Image

path = sys.argv[1]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
img = Image.open(path).convert('RGBA')
img.thumbnail((200, 200))
# ignora fondo transparente
bg = Image.new('RGBA', img.size, (0, 0, 0, 0))
pix = [p[:3] for p in img.getdata() if p[3] > 128]
im = Image.new('RGB', (len(pix), 1))
im.putdata(pix)
q = im.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
pal = q.getpalette()[:n * 3]
counts = sorted(q.getcolors(), reverse=True)
total = sum(c for c, _ in counts)
for c, i in counts:
    r, g, b = pal[i * 3:i * 3 + 3]
    print(f'#{r:02X}{g:02X}{b:02X}  {100 * c / total:5.1f}%')

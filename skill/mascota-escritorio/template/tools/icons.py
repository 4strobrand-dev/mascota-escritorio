#!/usr/bin/env python3
"""Genera assets/icon.png (app) y assets/tray*.png (bandeja) a partir del personaje.
Uso: python3 icons.py <carpeta-del-proyecto>"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw

proj = os.path.abspath(sys.argv[1])
js = f"""
const V = require({json.dumps(proj + '/engine.js')});
process.stdout.write(JSON.stringify({{ polys: V.render({{}}, 160), info: V.info }}));
"""
res = json.loads(subprocess.check_output(['node', '-e', js]))
polys, info = res['polys'], res['info'] or {}
xs = [q['p'][j] for q in polys for j in range(0, 8, 2)]
ys = [q['p'][j] for q in polys for j in range(1, 8, 2)]
w, h = int(max(xs) - min(xs)) + 8, int(max(ys) - min(ys)) + 8
body = Image.new('RGBA', (w, h), (0, 0, 0, 0))
d = ImageDraw.Draw(body)
for q in polys:
    p = q['p']
    col = tuple(int(c) for c in q['f'][4:-1].split(','))
    d.polygon([(p[j] - min(xs) + 4, p[j + 1] - min(ys) + 4) for j in range(0, 8, 2)], fill=col, outline=col)

bg = info.get('iconBg', '#1E2430').lstrip('#')
bgc = tuple(int(bg[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
N = 4096
canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0))
ImageDraw.Draw(canvas).rounded_rectangle((N * 0.06, N * 0.06, N * 0.94, N * 0.94), radius=N * 0.2, fill=bgc)
sc = min((N * 0.74) / body.height, (N * 0.74) / body.width)
b = body.resize((int(body.width * sc), int(body.height * sc)), Image.LANCZOS)
canvas.alpha_composite(b, ((N - b.width) // 2, (N - b.height) // 2))
os.makedirs(os.path.join(proj, 'assets'), exist_ok=True)
canvas.resize((1024, 1024), Image.LANCZOS).save(os.path.join(proj, 'assets', 'icon.png'))

# bandeja: parte superior del personaje (la cabeza), cuadrada y transparente
top = body.crop((0, 0, body.width, int(body.height * float(info.get('trayCrop', 0.56)))))
top = top.crop(top.getbbox())
side = max(top.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.alpha_composite(top, ((side - top.width) // 2, (side - top.height) // 2))
for size, name in ((22, 'tray.png'), (44, 'tray@2x.png'), (32, 'tray32.png')):
    sq.resize((size, size), Image.LANCZOS).save(os.path.join(proj, 'assets', name))
# hoja de revisión: ícono + bandeja ampliada (para mirarlos de un vistazo)
rev = Image.new('RGBA', (560, 300), (240, 242, 246, 255))
rev.alpha_composite(canvas.resize((256, 256), Image.LANCZOS), (22, 22))
tray_big = sq.resize((44, 44), Image.LANCZOS).resize((176, 176), Image.NEAREST)
rev.alpha_composite(tray_big, (330, 62))
rev.convert('RGB').save(os.path.join(proj, 'revision-iconos.png'))
print('íconos listos en', os.path.join(proj, 'assets'), '(revisa revision-iconos.png)')

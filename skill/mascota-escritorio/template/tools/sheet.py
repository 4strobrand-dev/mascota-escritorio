#!/usr/bin/env python3
"""Hoja de contacto con todas las poses del personaje, para revisarlo de un vistazo.
Uso: python3 sheet.py <carpeta-del-proyecto> <salida.png> [escala]"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

proj, out = os.path.abspath(sys.argv[1]), sys.argv[2]
s = float(sys.argv[3]) if len(sys.argv) > 3 else 11
SS = 3
poses = ['idle', 'walk', 'wave', 'coffee', 'sip', 'work', 'sleep', 'jetpack', 'dance', 'back', 'slip', 'drag']
EXTRA = {'back': {'spin': 3.1416}}
js = f"""
const V = require({json.dumps(proj + '/engine.js')});
const out = {{}};
const EXTRA = {json.dumps(EXTRA)};
for (const k of {json.dumps(poses)}) out[k] = V.render(Object.assign({{flameT: 0.3}}, V.POSES[k] || EXTRA[k] || {{}}), {s * SS});
process.stdout.write(JSON.stringify(out));
"""
data = json.loads(subprocess.check_output(['node', '-e', js]))
cols = 6
cw, ch = int(30 * s) * SS, int(40 * s) * SS
img = Image.new('RGB', (cw * cols, ch * ((len(poses) + cols - 1) // cols)), (226, 231, 238))
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14 * SS)
except Exception:
    font = None
for i, k in enumerate(poses):
    polys = data[k]
    if not polys:
        continue
    xs = [q['p'][j] for q in polys for j in range(0, 8, 2)]
    ys = [q['p'][j] for q in polys for j in range(1, 8, 2)]
    ox = (i % cols) * cw + cw / 2 - (min(xs) + max(xs)) / 2
    oy = (i // cols) * ch + ch - 12 * SS - max(ys)
    for q in polys:
        p = q['p']
        col = tuple(int(c) for c in q['f'][4:-1].split(','))
        d.polygon([(p[j] + ox, p[j + 1] + oy) for j in range(0, 8, 2)], fill=col, outline=col)
    d.text(((i % cols) * cw + 10 * SS, (i // cols) * ch + 8 * SS), k, fill=(60, 66, 78), font=font)
img = img.resize((img.width // SS, img.height // SS), Image.LANCZOS)
img.save(out)
print('hoja guardada en', out)

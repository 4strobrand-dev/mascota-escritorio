/* Motor voxel isométrico para mascotas de escritorio.
   El personaje se define en character.js (cargado antes que este archivo).
   Funciona en el navegador (window.PetVoxel) y en Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./character.js'));
  else root.PetVoxel = factory(root.PET_CHARACTER);
})(typeof self !== 'undefined' ? self : this, function (CHARACTER) {
  const key = (x, y, z) => x + ',' + y + ',' + z;

  // ---------- Esqueleto (fijo para que todas las animaciones funcionen) ----------
  // Coordenadas: x = ancho (derecha), y = profundidad (+y es el FRENTE), z = altura.
  // Cada vóxel [x, y, z, color] ocupa el cubo [x, x+1] × [y, y+1] × [z, z+1].
  const RIG = {
    legL:  { pivot: [2.5, 2.5, 6] },            // pierna izquierda: x 1..3, y 1..3, z 0..5
    legR:  { pivot: [6.5, 2.5, 6] },            // pierna derecha:   x 5..7, y 1..3, z 0..5
    torso: { pivot: [4.5, 2.5, 6] },            // cuerpo: alrededor de x 0..8, y 0..4, z 6..13
    armL:  { pivot: [-0.5, 2.5, 12] },          // brazo izquierdo: x -2..-1, z 6..11 (cuelga del hombro)
    armR:  { pivot: [9.5, 2.5, 12] },           // brazo derecho:   x 9..10,  z 6..11
    head:  { pivot: [4.5, 1.5, 14] },           // cabeza: desde z 14 hacia arriba
    laptop: { pivot: [4.5, 6, 3], fixed: true, show: 'laptop' },
    mug:   { pivot: [9.5, 2.5, 12], follow: 'armR', show: 'mug' },
    flame: { pivot: [4.5, 2.5, 6], follow: 'torso', show: 'flame' }
  };

  // ---------- Ayudas para modelar ----------
  const H = {
    // caja llena; col puede ser un color '#RRGGBB' o una función (x, y, z) => color | null
    box(out, x0, x1, y0, y1, z0, z1, col) {
      for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
          for (let z = z0; z <= z1; z++) {
            const c = typeof col === 'function' ? col(x, y, z) : col;
            if (c) out.push([x, y, z, c]);
          }
      return out;
    },
    // volumen redondeado (superelipsoide). p = 2 esfera, 3-4 cubo redondeado, 6+ casi caja
    blob(out, center, radius, p, col) {
      const [cx, cy, cz] = center, [rx, ry, rz] = radius;
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
          for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
            const d = Math.pow(Math.abs((x + 0.5 - cx) / rx), p) + Math.pow(Math.abs((y + 0.5 - cy) / ry), p) +
              Math.pow(Math.abs((z + 0.5 - cz) / rz), p);
            if (d > 1) continue;
            const c = typeof col === 'function' ? col(x, y, z) : col;
            if (c) out.push([x, y, z, c]);
          }
      return out;
    },
    // pinta la cara FRONTAL (+y) de una pieza: fn(x, z) => color | null. depth = capas hacia adentro
    decal(vox, fn, depth = 1) {
      const front = {};
      for (const v of vox) { const k = v[0] + ',' + v[2]; front[k] = Math.max(front[k] ?? -1e9, v[1]); }
      for (const v of vox) {
        const fy = front[v[0] + ',' + v[2]];
        if (v[1] > fy - depth) { const c = fn(v[0], v[2], v[1] === fy); if (c) v[3] = c; }
      }
      return vox;
    },
    // pixel art sobre el frente: filas de arriba (z = top) hacia abajo, columnas desde x = left.
    // '.' o ' ' = no pintar. palette: { k: '#000000', w: '#ffffff', ... }
    art(vox, rows, palette, left, top, depth = 1) {
      const map = {};
      rows.forEach((row, i) => [...row].forEach((ch, j) => { if (palette[ch]) map[(left + j) + ',' + (top - i)] = palette[ch]; }));
      return H.decal(vox, (x, z) => map[x + ',' + z] || null, depth);
    },
    // pinta un lado: side = '+x' | '-x' | '-y' (espalda) | '+z' (arriba)
    paintSide(vox, side, fn, depth = 1) {
      const axis = { '+x': 0, '-x': 0, '-y': 1, '+y': 1, '+z': 2 }[side];
      const sign = side[0] === '-' ? -1 : 1;
      const o = [0, 1, 2].filter(a => a !== axis);
      const ext = {};
      for (const v of vox) { const k = v[o[0]] + ',' + v[o[1]]; ext[k] = Math.max(ext[k] ?? -1e9, sign * v[axis]); }
      for (const v of vox) {
        const e = ext[v[o[0]] + ',' + v[o[1]]];
        if (sign * v[axis] > e - depth) { const c = fn(v[0], v[1], v[2]); if (c) v[3] = c; }
      }
      return vox;
    },
    // copia espejada en x (para hacer la pierna/brazo derecho a partir del izquierdo): x' = sum - x
    mirrorX(vox, sum) { return vox.map(([x, y, z, c]) => [sum - x, y, z, c]); },
    // recolorea donde pred(x, y, z, color) sea verdadero
    paint(vox, pred, color) { for (const v of vox) if (pred(v[0], v[1], v[2], v[3])) v[3] = color; return vox; }
  };

  // ---------- Accesorios por defecto (el personaje puede reemplazarlos) ----------
  function defaultProps(colors) {
    const k = Object.assign({ laptop: '#3B414B', laptopTop: '#4A515C', logo: '#F28C28', mug: '#EEF1F5',
      mugBand: '#F28C28', coffee: '#5B3A21', nozzle: '#4A515C' }, colors || {});
    const laptop = [], mug = [], flame = [];
    H.box(laptop, 1, 7, 4, 8, 3, 3, (x, y) => (y >= 5 && y <= 7 && x >= 2 && x <= 6) ? k.laptopTop : k.laptop);
    H.box(laptop, 1, 7, 9, 9, 3, 8, (x, y, z) => (x === 4 && z === 6) ? k.logo : k.laptop);
    H.box(mug, 9, 10, 4, 5, 5, 8, (x, y, z) => z === 8 ? k.coffee : z === 6 ? k.mugBand : k.mug);
    mug.push([11, 4, 6, k.mug], [11, 4, 7, k.mug]);
    for (const fx of [0, 7])
      for (let x = fx; x <= fx + 1; x++)
        for (let y = -2; y <= -1; y++) {
          flame.push([x, y, 6, k.nozzle]);
          for (let z = -1; z <= 5; z++) {
            if (z <= 2 && !(x === fx + (fx ? 0 : 1) && y === -1)) continue;
            flame.push([x, y, z, 'FLAME']);
          }
        }
    return { laptop, mug, flame };
  }

  // ---------- Construcción ----------
  const DEF = (typeof CHARACTER === 'function' ? CHARACTER(H) : CHARACTER) || { parts: {} };
  function buildParts() {
    const props = defaultProps(DEF.propColors);
    const parts = [];
    for (const name of Object.keys(RIG)) {
      const vox = (DEF.parts && DEF.parts[name]) || props[name];
      if (!vox || !vox.length) continue;
      const rig = RIG[name];
      const uniq = new Map();
      for (const v of vox) uniq.set(key(v[0], v[1], v[2]), v.slice());   // si hay repetidos, gana el último
      parts.push({ name, pivot: (DEF.pivots && DEF.pivots[name]) || rig.pivot, vox: [...uniq.values()],
        fixed: rig.fixed, follow: rig.follow, show: rig.show });
    }
    // limpiar interiores + máscara de caras ocultas
    for (const part of parts) {
      const set = new Set(part.vox.map(v => key(v[0], v[1], v[2])));
      const has = (x, y, z) => set.has(key(x, y, z));
      part.vox = part.vox
        .filter(([x, y, z]) => !(has(x + 1, y, z) && has(x - 1, y, z) && has(x, y + 1, z) &&
          has(x, y - 1, z) && has(x, y, z + 1) && has(x, y, z - 1)))
        .map(([x, y, z, c]) => ({
          x: x + 0.5, y: y + 0.5, z: z + 0.5, c,
          m: [has(x + 1, y, z), has(x - 1, y, z), has(x, y + 1, z), has(x, y - 1, z), has(x, y, z + 1), has(x, y, z - 1)]
        }));
    }
    return parts;
  }

  const PARTS = buildParts();

  // ---------- Color ----------
  const shadeCache = {};
  function shade(hex, f) {
    const k = hex + f;
    if (shadeCache[k]) return shadeCache[k];
    const n = parseInt(hex.slice(1), 16);
    const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return (shadeCache[k] = 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')');
  }

  function rotFor(name, P) {
    switch (name) {
      case 'legL': return [P.legL || 0, 0, 0];
      case 'legR': return [P.legR || 0, 0, 0];
      case 'armL': return [P.armLx || 0, P.armLy || 0, 0];
      case 'armR': return [P.armRx || 0, P.armRy || 0, 0];
      case 'head': return [P.headX || 0, 0, P.headZ || 0];
      default: return [0, 0, 0];
    }
  }

  // ---------- Render a polígonos ----------
  // Devuelve [{p:[x0,y0,...x3,y3], f:color}] en coordenadas de pantalla (origen = mundo 0,0,0)
  const TH = 30 * Math.PI / 180;           // giro de cámara: el frente queda más visible
  const VX = Math.cos(TH), VY = Math.sin(TH);
  const HS = 0.5, ZS = 0.92, WZ = HS / ZS;  // proyección y vector de vista (VY, VX, WZ)
  // caras de un cubo: [normal, índices de esquinas]  esquinas: bit0=x, bit1=y, bit2=z
  const FACES = [
    [[1, 0, 0], [1, 3, 7, 5]], [[-1, 0, 0], [0, 4, 6, 2]],
    [[0, 1, 0], [2, 6, 7, 3]], [[0, -1, 0], [0, 1, 5, 4]],
    [[0, 0, 1], [4, 5, 7, 6]], [[0, 0, -1], [0, 2, 3, 1]]
  ];
  const LIGHT = [0.19, 0.72, 1.0];

  const FLAMES = ['#FFD23F', '#FF8A1F', '#FF5A1F'];
  const IDENT = (x, y, z) => [x, y, z];
  function makeRot(ax, ay, az) {
    if (!ax && !ay && !az) return IDENT;
    const sx = Math.sin(ax), cx = Math.cos(ax), sy = Math.sin(ay), cy = Math.cos(ay),
      sz = Math.sin(az), cz = Math.cos(az);
    return (x, y, z) => {
      let t;
      t = y * cx - z * sx; z = y * sx + z * cx; y = t;
      t = x * cy - z * sy; z = x * sy + z * cy; x = t;
      t = x * cz - y * sz; y = x * sz + y * cz; x = t;
      return [x, y, z];
    };
  }
  const GP = [4.5, 1, 0];   // pivote del cuerpo entero (talones)
  let GR = IDENT;

  function render(P, s) {
    GR = makeRot(P.tilt || 0, 0, P.spin || 0);
    const faces = [];
    const ws = s, hs = s * HS, zs = s * ZS;
    for (const part of PARTS) {
      if (part.show && !P[part.show]) continue;
      const R = makeRot(...rotFor(part.follow || part.name, P));
      const G = part.fixed ? IDENT : GR;
      const rot = (x, y, z) => { const r = R(x, y, z); return G(r[0], r[1], r[2]); };
      const [px0, py0, pz0] = part.pivot;
      const off = part.fixed ? 0 : (P.dz || 0);
      // pivote trasladado por el giro global del cuerpo
      const gpv = part.fixed ? [px0, py0, pz0] : (() => {
        const q = GR(px0 - GP[0], py0 - GP[1], pz0 + off - GP[2]);
        return [q[0] + GP[0], q[1] + GP[1], q[2] + GP[2]];
      })();
      const px = gpv[0], py = gpv[1], pz = gpv[2];
      const flick = Math.floor((P.flameT || 0) * 14);
      // normales rotadas y visibilidad (iguales para todos los cubos de la pieza)
      const fv = FACES.map(([n]) => {
        const r = rot(n[0], n[1], n[2]);
        const vis = r[0] * VY + r[1] * VX + r[2] * WZ > 1e-4;
        const l = r[0] * LIGHT[0] + r[1] * LIGHT[1] + r[2] * LIGHT[2];
        return { vis, f: Math.round((0.62 + 0.43 * Math.max(0, l)) * 50) / 50 };
      });
      // ejes del cubo rotados
      const ex = rot(1, 0, 0), ey = rot(0, 1, 0), ez = rot(0, 0, 1);
      for (const v of part.vox) {
        let col = v.c;
        if (col === 'FLAME') {
          if (v.z < -0.5 + ((flick * 7 + Math.floor(v.x)) % 3)) continue;
          col = FLAMES[Math.min(2, Math.max(0, Math.floor((5.5 - v.z) / 2.4) + ((flick + Math.floor(v.z)) % 2)))];
        }
        const c0 = rot(v.x - 0.5 - px0, v.y - 0.5 - py0, v.z - 0.5 - pz0);
        const ox = c0[0] + px, oy = c0[1] + py, oz = c0[2] + pz;
        let corners = null;
        for (let fi = 0; fi < 6; fi++) {
          if (!fv[fi].vis || v.m[fi]) continue;
          if (!corners) {
            corners = new Array(8);
            for (let i = 0; i < 8; i++) {
              const a = i & 1, b = (i >> 1) & 1, d = (i >> 2) & 1;
              const X = ox + ex[0] * a + ey[0] * b + ez[0] * d;
              const Y = oy + ex[1] * a + ey[1] * b + ez[1] * d;
              const Z = oz + ex[2] * a + ey[2] * b + ez[2] * d;
              corners[i] = [X, Y, Z];
            }
          }
          const idx = FACES[fi][1];
          const p = new Array(8);
          let k = 0;
          for (let j = 0; j < 4; j++) {
            const [X, Y, Z] = corners[idx[j]];
            p[j * 2] = (X * VX - Y * VY) * ws;
            p[j * 2 + 1] = (X * VY + Y * VX) * hs - Z * zs;
            k += X * VY + Y * VX + Z * WZ;
          }
          faces.push({ p, f: shade(col, fv[fi].f), k });
        }
      }
    }
    faces.sort((a, b) => a.k - b.k);
    return faces;
  }

  function bounds(polys) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of polys)
      for (let i = 0; i < 8; i += 2) {
        minX = Math.min(minX, q.p[i]); maxX = Math.max(maxX, q.p[i]);
        minY = Math.min(minY, q.p[i + 1]); maxY = Math.max(maxY, q.p[i + 1]);
      }
    return { minX, maxX, minY, maxY };
  }

  function draw(ctx, polys, ox, oy) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.9;
    for (const q of polys) {
      const p = q.p;
      ctx.beginPath();
      ctx.moveTo(p[0] + ox, p[1] + oy);
      ctx.lineTo(p[2] + ox, p[3] + oy);
      ctx.lineTo(p[4] + ox, p[5] + oy);
      ctx.lineTo(p[6] + ox, p[7] + oy);
      ctx.closePath();
      ctx.fillStyle = q.f;
      ctx.strokeStyle = q.f;
      ctx.fill();
      ctx.stroke();
    }
  }

  const POSES = {
    idle: {},
    walk: { legL: 0.6, legR: -0.6, armLx: -0.55, armRx: 0.55, dz: 0.3 },
    work: { dz: -5, legL: 1.57, legR: 1.57, armLx: 1.12, armRx: 1.2, armLy: -0.12, armRy: 0.12, headX: -0.18, laptop: true },
    sleep: { dz: -5, legL: 1.57, legR: 1.57, armLx: 0.55, armRx: 0.55, armLy: -0.15, armRy: 0.15, headX: -0.38, headZ: 0.15 },
    wave: { armRy: 2.6, headX: 0.08 },
    coffee: { mug: true, armRx: 0.95, armRy: 0.15 },
    sip: { mug: true, armRx: 2.35, armRy: 0.25, headX: 0.22 },
    jetpack: { flame: true, flameT: 0.3, armLy: -0.9, armRy: 0.9, headX: 0.15 },
    dance: { dz: 1, armLy: -2.4, armRy: 1.0, headZ: 0.3 },
    spin: { spin: 1.4 },
    slip: { tilt: 1.45, legL: 1.1, legR: 0.8, armLy: -1.2, armRy: 1.2, headX: 0.2 },
    drag: { legL: 0.4, legR: -0.3, armLy: -2.5, armRy: 2.5, headX: 0.1 }
  };

  return { render, bounds, draw, POSES, RIG, HELPERS: H, info: DEF.info || {} };
});

// Revisa que el personaje cumpla el esqueleto: piezas obligatorias, límites y colores válidos.
// Uso: node check.js <carpeta-del-proyecto>
const path = require('path');
const dir = path.resolve(process.argv[2] || '.');
const build = require(path.join(dir, 'character.js'));
const V = require(path.join(dir, 'engine.js'));
const def = typeof build === 'function' ? build(V.HELPERS) : build;
const parts = (def && def.parts) || {};
// Zonas recomendadas (las mismas de references/rig.md). Salirse un poco es un AVISO: se acepta si la
// hoja de poses se ve bien. Salirse del límite duro de la ventana (HARD) es un ERROR.
const LIMITS = {
  legL: [[0, 4], [0, 4], [0, 5]], legR: [[4, 8], [0, 4], [0, 5]],
  torso: [[-1, 9], [-4, 5], [6, 13]], armL: [[-3, 0], [0, 4], [5, 12]], armR: [[8, 11], [0, 4], [5, 12]],
  head: [[-3, 12], [-4, 7], [12, 27]]
};
const HARD = [[-5, 14], [-7, 10], [-1, 30]];
let errors = 0, warns = 0;
const err = m => { errors++; console.log('ERROR  ' + m); };
const warn = m => { warns++; console.log('AVISO  ' + m); };
for (const name of ['legL', 'legR', 'torso', 'armL', 'armR', 'head']) {
  const vox = parts[name];
  if (!vox || !vox.length) { err(`falta la pieza "${name}"`); continue; }
  const lim = LIMITS[name];
  let out = 0, hard = 0, badColor = 0;
  const seen = new Set(); let dup = 0;
  for (const v of vox) {
    if (!/^#[0-9a-fA-F]{6}$/.test(v[3]) && v[3] !== 'FLAME') badColor++;
    for (let a = 0; a < 3; a++) if (v[a] < lim[a][0] || v[a] > lim[a][1]) { out++; break; }
    for (let a = 0; a < 3; a++) if (v[a] < HARD[a][0] || v[a] > HARD[a][1]) { hard++; break; }
    const k = v[0] + ',' + v[1] + ',' + v[2];
    if (seen.has(k)) dup++; else seen.add(k);
  }
  if (badColor) err(`${name}: ${badColor} vóxeles con color que no es #RRGGBB`);
  if (hard) err(`${name}: ${hard} vóxeles fuera del límite de la ventana (x ${HARD[0]}, y ${HARD[1]}, z ${HARD[2]})`);
  if (dup) console.log(`info   ${name}: ${dup} vóxeles repetidos en la misma posición (se queda el último; no es un error)`);
  if (out) warn(`${name}: ${out} vóxeles fuera de su zona recomendada (x ${lim[0]}, y ${lim[1]}, z ${lim[2]})`);
  const ys = vox.map(v => v[2]);
  if (name.startsWith('leg') && (Math.min(...ys) !== 0 || Math.max(...ys) !== 5)) warn(`${name}: la pierna debería ir de z 0 a z 5 (se sienta y camina con esa medida)`);
  console.log(`ok     ${name}: ${vox.length} vóxeles`);
}
for (const extra of Object.keys(parts)) if (!V.RIG[extra]) warn(`pieza "${extra}" no existe en el esqueleto y se ignora`);
// frases demasiado largas para la burbuja
try {
  const cfg = require(path.join(dir, 'pet.config.js'));
  const name = cfg.name || '';
  for (const [k, list] of Object.entries(cfg.phrases || {}))
    for (const p of list || []) {
      const len = [...String(p).replace(/\{name\}/g, name)].length;
      if (len > 50) warn(`frase "${p}" (${k}) tiene ${len} caracteres; la burbuja muestra 2 líneas (unos 50) y corta el resto`);
    }
} catch (e) { warn('no se pudo leer pet.config.js: ' + e.message); }
console.log(errors ? `\n${errors} error(es), ${warns} aviso(s)` : `\nPersonaje válido (${warns} aviso(s))`);
process.exit(errors ? 1 : 0);

/* Personaje: Astro, el astronauta de Astrobrand (ejemplo de referencia).
   Para crear otra mascota se reemplaza SOLO este archivo (y pet.config.js).
   Reglas del esqueleto: ver references/rig.md de la skill. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PET_CHARACTER = factory;
})(typeof self !== 'undefined' ? self : this, function (H) {
  const { box, blob, decal, mirrorX } = H;

  const C = {
    white: '#EEF1F5', white2: '#D9DEE5', gray: '#7A838F', joint: '#4A515C',
    glove: '#3A4049', boot: '#2F343B', black: '#14171C', visorHi: '#46505F',
    visorSpec: '#8C99AB', orange: '#F28C28', cyan: '#3BE3F2', pink: '#F0679A', panel: '#C7CED7'
  };

  // Piernas: x 1..3 (izq.), y 1..3, z 0..5 — botas oscuras con punta hacia el frente
  const legL = box([], 1, 3, 1, 3, 0, 5, (x, y, z) => z <= 1 ? C.boot : z === 3 ? C.joint : C.white);
  box(legL, 1, 3, 4, 4, 0, 0, C.boot);
  const legR = mirrorX(legL, 8);

  // Torso con panel en el pecho, cuello y mochila
  const torso = box([], 0, 8, 0, 4, 6, 12, (x, y, z) => z === 6 ? C.joint : C.white);
  decal(torso, (x, z) => {
    if (x < 2 || x > 6 || z < 8 || z > 10) return null;
    if (x === 6 && z === 9) return C.cyan;
    if (x === 2 && z === 10) return C.orange;
    if (x === 5 && z === 10) return C.pink;
    if ((x === 3 || x === 4) && z === 8) return C.joint;
    return C.panel;
  });
  box(torso, 1, 7, 0, 4, 13, 13, C.joint);                                   // cuello
  box(torso, 1, 7, -2, -1, 7, 12, (x, y, z) => z === 9 ? C.gray : C.white2); // mochila

  // Brazos: guante abajo, codo gris, parche naranja en el hombro (lado de afuera)
  const armL = box([], -2, -1, 1, 3, 6, 11, (x, y, z) =>
    z <= 7 ? C.glove : z === 9 ? C.joint : (x === -2 && z >= 10 && y >= 2) ? C.orange : C.white);
  const armR = mirrorX(armL, 8);

  // Casco: cubo redondeado con visor negro al frente y orejeras naranjas
  const head = blob([], [4.5, 1.5, 19.5], [5.8, 4.4, 5.8], 4, C.white);
  decal(head, (x, z, isFront) => {
    const ex = (x + 0.5 - 4.5) / 4.3, ez = (z + 0.5 - 19.6) / 3.7;
    if (ex * ex + ez * ez > 1) return null;
    if (isFront && x === 1 && z === 21) return C.visorSpec;
    if (isFront && x >= 0 && x <= 1 && z >= 20 && z <= 21) return C.visorHi;
    return C.black;
  }, 2);
  for (const ex of [-2, 10])
    for (let y = 0; y <= 3; y++)
      for (let z = 17; z <= 20; z++) {
        if ((y === 0 || y === 3) && (z === 17 || z === 20)) continue;
        head.push([ex, y, z, (y >= 1 && y <= 2 && z >= 18 && z <= 19) ? C.white2 : C.orange]);
      }

  return {
    info: { iconBg: '#1E2430' },
    propColors: { logo: C.orange, mugBand: C.orange, nozzle: C.joint },
    parts: { legL, legR, torso, armL, armR, head }
  };
});

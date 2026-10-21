/* Personaje: Canela, una perrita salchicha café chocolate con collar rojo y placa dorada. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PET_CHARACTER = factory;
})(typeof self !== 'undefined' ? self : this, function (H) {
  const { box, blob, decal, art, paintSide, mirrorX } = H;

  const C = {
    choco: '#8A4B26', chocoDark: '#5C2F16', earDark: '#4A2311', belly: '#E9B98A', muzzle: '#B9733F',
    eye: '#141010', shine: '#FFFFFF', nose: '#1C1414', tongue: '#F27E8E', red: '#D6283C', redDark: '#A51C2D',
    gold: '#F4C430', goldDark: '#C9971C'
  };

  // Patitas cortas: café con almohadilla clara abajo
  const legL = box([], 1, 3, 1, 3, 0, 5, (x, y, z) => z === 0 ? C.belly : C.choco);
  box(legL, 1, 3, 4, 4, 0, 0, C.belly);                        // puntita de la pata hacia el frente
  const legR = mirrorX(legL, 8);

  const armL = box([], -2, -1, 1, 3, 6, 11, (x, y, z) => z <= 6 ? C.belly : C.choco);
  const armR = mirrorX(armL, 8);

  // Torso largo (salchicha) hacia atrás, panza clarita al frente y abajo
  const torso = box([], 0, 8, -3, 4, 6, 12, (x, y, z) => C.choco);
  decal(torso, (x, z) => (x >= 2 && x <= 6 && z <= 11) ? C.belly : null);
  paintSide(torso, '-y', () => C.chocoDark);
  // collar rojo en el cuello con placa dorada al frente
  box(torso, -1, 9, -3, 5, 12, 13, (x, y, z) => (x === -1 || x === 9 || y === -3 || y === 5) ? (z === 12 ? C.redDark : C.red) : null);
  box(torso, 4, 5, 6, 6, 10, 11, (x, y, z) => z === 11 ? C.gold : C.goldDark);
  torso.push([4, 6, 12, C.red], [5, 6, 12, C.red]);
  // cola levantada en la espalda
  for (let z = 10; z <= 14; z++) torso.push([4, -4, z, C.chocoDark]);
  torso.push([5, -4, 14, C.chocoDark]);

  // Cabeza: redondeada, sin escalón arriba
  const head = blob([], [4.5, 1.5, 20], [5.4, 4.4, 4.9], 4, C.choco);
  // hocico largo de salchicha (sale hacia el frente), más claro abajo
  box(head, 2, 7, 6, 8, 15, 18, (x, y, z) => z <= 15 ? C.belly : C.muzzle);
  box(head, 3, 6, 9, 9, 15, 18, (x, y, z) => z <= 15 ? C.belly : C.muzzle);
  paintSide(head, '+z', (x, y, z) => (y >= 6 && z === 18) ? C.choco : null);
  // nariz pequeña en la punta del hocico
  box(head, 4, 5, 10, 10, 17, 18, C.nose);
  // boca: línea bajo la nariz
  head.push([4, 10, 16, C.chocoDark], [5, 10, 16, C.chocoDark]);
  // ojos grandes 2x3 con brillo
  art(head, [
    '.kk....kk.',
    '.kk....kk.',
    '.kk....kk.'
  ], { k: C.eye }, 0, 22);
  art(head, ['.w......w.'], { w: C.shine }, 0, 22);
  // lengüita afuera (juguetona)
  box(head, 4, 5, 8, 9, 14, 14, C.tongue);
  head.push([4, 9, 13, C.tongue], [5, 9, 13, C.tongue]);
  // orejas largas caídas a cada lado
  for (const ex of [-2, -1, 10, 11]) {
    const outer = ex === -2 || ex === 11;
    for (let y = 0; y <= 3; y++)
      for (let z = 13; z <= 22; z++) {
        if (outer && (z > 20 || z < 14)) continue;
        if ((y === 0 || y === 3) && z <= 14) continue;
        head.push([ex, y, z, C.earDark]);
      }
  }

  return {
    info: { iconBg: '#FFE6CC', trayCrop: 0.6 },
    propColors: { logo: C.red, mug: '#FFFFFF', mugBand: C.red, nozzle: C.chocoDark },
    parts: { legL, legR, torso, armL, armR, head }
  };
});

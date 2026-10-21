/* Personaje: Cafecito, una taza de café roja (ejemplo de objeto convertido en mascota). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PET_CHARACTER = factory;
})(typeof self !== 'undefined' ? self : this, function (H) {
  const { box, blob, art, paintSide, mirrorX } = H;

  const C = {
    red: '#E5483B', redDark: '#B8322A', cream: '#FFF4E3', coffee: '#6B3F22', foam: '#D9A877',
    dark: '#3A2A26', eye: '#2A1C18', blush: '#FF8C8C', saucer: '#FFFFFF', saucerRim: '#E9DCCB'
  };

  // Piernitas y bracitos cortos, color oscuro
  const legL = box([], 1, 3, 1, 3, 0, 5, (x, y, z) => z <= 1 ? C.dark : C.redDark);
  const legR = mirrorX(legL, 8);
  const armL = box([], -2, -1, 1, 3, 6, 11, (x, y, z) => z <= 7 ? C.cream : C.red);
  const armR = mirrorX(armL, 8);

  // Torso = platito ancho y bajo con borde
  const torso = blob([], [4.5, 1.5, 9.5], [5.2, 3.8, 4.2], 6, C.redDark);
  box(torso, -1, 9, -2, 5, 12, 13, (x, y, z) => z === 13 ? C.saucer : C.saucerRim);

  // Cabeza = la taza: cilindro rojo con café arriba, asa a la derecha y carita al frente
  const head = blob([], [4.5, 1.5, 20], [5.4, 4.6, 6.2], 6, (x, y, z) => z === 25 ? C.cream : C.red);
  paintSide(head, '+z', (x, y) => (x >= 0 && x <= 9 && y >= -2 && y <= 5) ? ((x + y) % 5 === 0 ? C.foam : C.coffee) : null);
  // asa: una "C" en el lado derecho
  for (let z = 16; z <= 22; z++) head.push([12, 1, z, C.red]);
  head.push([11, 1, 16, C.red], [11, 1, 22, C.red]);
  art(head, [
    '..k....k..',
    '..k....k..',
    '..........',
    '.b..mm..b.',
    '....mm....'
  ], { k: C.eye, b: C.blush, m: C.dark }, 0, 22);

  return {
    info: { iconBg: '#FFE3C2', trayCrop: 0.6 },
    propColors: { mug: C.cream, mugBand: C.red, logo: C.red, nozzle: C.dark },
    parts: { legL, legR, torso, armL, armR, head }
  };
});

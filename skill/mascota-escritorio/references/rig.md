# Modelar el personaje (character.js)

Todo el personaje vive en `character.js`. El motor (`engine.js`) ya sabe caminar, sentarse,
bailar, saludar, volar con jetpack, caerse, dormir… siempre que el personaje respete el
esqueleto de abajo. Lo único que cambia de una mascota a otra son los vóxeles y sus colores.

## Contenido
1. Coordenadas
2. El esqueleto (zonas de cada pieza)
3. Cómo convertir una foto en personaje
4. Ayudas para modelar
5. Formato del archivo
6. Ejemplo completo: taza de café
7. Errores comunes

## 1. Coordenadas

- `x` = ancho, hacia la derecha del personaje visto de frente.
- `y` = profundidad. **+y es el FRENTE** (la cara, el visor, el logo del pecho van en el `y` más alto).
- `z` = altura. El piso es `z = 0`.
- Un vóxel `[x, y, z, '#RRGGBB']` ocupa el cubo de `x` a `x+1`, de `y` a `y+1` y de `z` a `z+1`.
- La cámara ve el frente (+y) un poco girado, el lado derecho (+x) y la parte de arriba (+z).
  El lado izquierdo (−x) y la espalda (−y) solo se ven cuando gira bailando o se cae: ponles lo
  que identifica al sujeto (cola, mochila, alas) pero sin detalle fino. La hoja de poses trae la
  vista `back` para revisarlos.

## 2. El esqueleto

Toda mascota es una versión "chibi" del sujeto: cabeza grande, cuerpo compacto, dos piernitas
y dos bracitos. Aunque el sujeto real no tenga piernas (una taza, una planta, un logo), se le
agregan, como hacen las mascotas de marca. Así funcionan todas las animaciones.

| Pieza   | Zona recomendada (x / y / z)          | Gira desde (pivote)  | Notas |
|---------|----------------------------------------|----------------------|-------|
| `legL`  | x 1..3 · y 1..3 · **z 0..5**           | (2.5, 2.5, 6)        | Altura exacta 6 (z 0 a 5): al sentarse el cuerpo baja 5. |
| `legR`  | x 5..7 · y 1..3 · **z 0..5**           | (6.5, 2.5, 6)        | Normalmente `mirrorX(legL, 8)`. |
| `torso` | x 0..8 · y 0..4 · z 6..13              | (4.5, 2.5, 6)        | Puede ensancharse un poco (x −1..9, y −3..5). Espalda en y negativo. |
| `armL`  | x −2..−1 · y 1..3 · z 6..11            | (−0.5, 2.5, 12)      | Cuelga del hombro (z 12). La mano es lo de abajo (z 6..7). |
| `armR`  | x 9..10 · y 1..3 · z 6..11             | (9.5, 2.5, 12)       | Normalmente `mirrorX(armL, 8)`. La taza de café va en esta mano. |
| `head`  | x −3..12 · y −4..7 · z 14..27          | (4.5, 1.5, 14)       | Lo más grande y expresivo. Orejas, cuernos, antenas, pelo: aquí. |

Medidas que conviene respetar:

- **Cabeza** entre 9 y 13 vóxeles de ancho y de 9 a 12 de alto: es lo que hace "tierno" al personaje y lo que se reconoce de lejos.
- **Piernas** de 3×3 y 6 de alto, **brazos** de 2×3 y 6 de largo. Pueden tener otra forma (patas, tentáculos cortos, raíces) pero dentro de esa caja.
- **Límite duro** (la ventana de la mascota): x −5..14, y −7..10, z hasta 30. `check.js` da ERROR fuera de eso.
- Salirse **un poco** de la zona recomendada de una pieza (un hocico, una oreja, una cola) da un AVISO
  de `check.js`: está bien si en la hoja de poses se ve correcto y no choca con otras piezas.

Accesorios automáticos (no hay que modelarlos): laptop cuando trabaja, taza de café en la mano
derecha y fuego del jetpack saliendo de la espalda (x 0..1 y 7..8, y −2..−1, debajo de z 6).
Sus colores se cambian con `propColors` (ver sección 5). Si el personaje tiene una mochila o
"espalda", que llegue hasta y −2 para que el fuego salga de ahí.

## 3. Cómo convertir una foto en personaje

1. **Mira la foto y anota lo que la hace reconocible**, en 3 a 6 rasgos: silueta, color principal,
   cara o "frente", un accesorio característico, un detalle de color fuerte (logo, franja,
   mancha). Eso es lo que debe sobrevivir a la versión de 10 vóxeles de ancho; lo demás se simplifica.
2. **Saca la paleta** con `python3 scripts/palette.py foto.jpg` (si no hay foto, elige tú los
   colores a partir de la descripción, en tonos de "juguete") y quédate con 5 a 9: base,
   sombra/oscuro, acento, ojos/cara y uno o dos detalles. Los colores planos y saturados se ven
   mejor que los grises sucios de una foto: redondea hacia el tono "de marca".
3. **Decide el mapeo al esqueleto:**
   - *Personaje / persona / mascota de marca*: la cabeza es su cabeza, el torso su ropa.
   - *Animal*: cabeza grande con orejas/hocico en la cabeza; patas = piernas y brazos; cola en el torso (y −4..−1).
   - *Sujetos alargados u horizontales* (perro salchicha, serpiente, auto, lápiz): el esqueleto es
     vertical, así que no se puede copiar la proporción. Expresa ese rasgo de otra forma: torso más
     profundo hacia atrás (hasta y −4) con la cola o la parte trasera saliendo por detrás, cabeza
     alargada hacia el frente (hocico hasta y 9), o el rasgo como detalle (un lápiz de "sombrero").
     Avísale al usuario en una línea cómo lo resolviste.
   - *Objeto o producto* (taza, botella, planta, celular): el objeto ES la cabeza+torso (o solo
     la cabeza grande), con una cara simple al frente, y piernitas/bracitos del color más oscuro.
   - *Logo o símbolo*: el logo como cabeza en volumen (grosor 3–5), cuerpo simple del color de la marca.
4. **Modela por piezas** con las ayudas (`box`, `blob`, `mirrorX`) y **pinta** el frente con
   `decal` o `art` (ojos, boca, visor, logos). La cara casi siempre funciona mejor con pocos
   píxeles: dos ojos de 1×2 o 2×2 y una boca de 2–3 vóxeles.
   **Orden importante:** `decal` y `art` pintan el vóxel que esté MÁS al frente en cada columna.
   Si primero agregas algo que sobresale (hocico, nariz, pico, visera), lo pintado caerá sobre eso
   y no sobre la cara. Pinta la cara primero y agrega las partes salientes después (o píntalas
   con `paint` por coordenadas).
5. **Revisa** con `node tools/check.js <proyecto>` y la hoja de poses
   `python3 tools/sheet.py <proyecto> hoja.png`. Mira la imagen: ¿se reconoce el sujeto en
   `idle`? ¿la cara se ve? ¿al sentarse (`work`) y caerse (`slip`) se ve bien? ¿la espalda
   (`back`) tiene sentido? Corrige y repite. Normalmente hacen falta 2–4 vueltas.
   Si dos vóxeles caen en la misma posición, se queda el último (no hace falta evitarlo).

## 4. Ayudas para modelar

Todas reciben y devuelven listas de vóxeles `[x, y, z, color]`. En el color puede ir un string
`'#RRGGBB'` o una función `(x, y, z) => color | null` (null = no poner vóxel).

- `box(out, x0, x1, y0, y1, z0, z1, col)` — caja llena (límites incluidos).
- `blob(out, [cx, cy, cz], [rx, ry, rz], p, col)` — volumen redondeado. `p = 2` esfera,
  `p = 3–4` cubo redondeado (cascos, cabezas), `p = 6+` caja con esquinas apenas redondas.
  El centro suele ir en `.5` (ej. `4.5`) para que quede simétrico.
- `decal(vox, (x, z, isFront) => color | null, depth = 1)` — pinta la cara frontal (+y). `depth`
  = cuántas capas hacia adentro (2 para que un visor se vea también de lado).
- `art(vox, filas, paleta, left, top, depth = 1)` — pixel art sobre el frente. La primera fila es
  `z = top` y las columnas empiezan en `x = left`. `'.'` = no pintar.
- `paintSide(vox, '+x' | '-x' | '-y' | '+z', (x, y, z) => color | null, depth = 1)` — pinta un lado.
- `mirrorX(vox, 8)` — copia espejada (izquierda → derecha) para piernas y brazos.
- `paint(vox, (x, y, z, color) => bool, color)` — recolorea donde se cumpla la condición.

## 5. Formato del archivo

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.PET_CHARACTER = factory;
})(typeof self !== 'undefined' ? self : this, function (H) {
  const { box, blob, decal, art, paintSide, mirrorX, paint } = H;
  const C = { /* paleta */ };
  // ... construir legL, legR, torso, armL, armR, head ...
  return {
    // iconBg: color del fondo (cuadrado redondeado) del ícono de la app; elige uno que contraste
    // con el personaje. trayCrop: fracción superior del personaje que se usa como ícono de la
    // bandeja (0.56 ≈ solo la cabeza; súbelo si la cabeza queda cortada, bájalo si se ve el cuerpo).
    info: { iconBg: '#1E2430', trayCrop: 0.56 },
    propColors: { logo: '#F28C28', mug: '#FFFFFF', mugBand: '#F28C28', coffee: '#5B3A21',
                  laptop: '#3B414B', laptopTop: '#4A515C', nozzle: '#4A515C' },   // todos opcionales
    parts: { legL, legR, torso, armL, armR, head }
  };
});
```

Mantén ese envoltorio tal cual: el mismo archivo lo usan la app (navegador) y los scripts (Node).

## 6. Ejemplo completo: taza de café

Un objeto sin cara convertido en mascota. Ver `examples/taza/character.js` en la skill.
Lo importante del ejemplo:

- La taza ocupa la cabeza (cilindro con `blob` p = 6, más alta que ancha) con el café arriba
  (`paintSide(head, '+z', ...)`), el asa en el lado +x y una cara de pixel art al frente.
- El torso es un platito: ancho y bajito, del color de acento.
- Piernas y brazos cortos del color oscuro de la paleta.

## 7. Errores comunes

- **Cara en la espalda**: el frente es +y (y alto). Si la cara no se ve en `idle`, está atrás.
- **Piernas más cortas o largas que 6**: al sentarse se hunde en el piso o flota.
- **Cabeza demasiado pequeña**: deja de leerse como mascota; súbela antes de agregar detalle.
- **Detalle de 1 vóxel aislado**: a tamaño real (5 px por vóxel) se pierde. Los rasgos importantes, mínimo 2 vóxeles.
- **Muchos grises parecidos**: la luz ya oscurece los lados; usa tonos con contraste claro.
- **Colores sin `#` o en formato rgb()**: el motor solo acepta `#RRGGBB`.

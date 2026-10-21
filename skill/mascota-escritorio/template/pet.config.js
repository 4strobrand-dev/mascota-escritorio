/* Configuración de la mascota: nombre, identificador y personalidad.
   {name} dentro de una frase se reemplaza por el nombre de la mascota.
   Cualquier lista que falte usa las frases genéricas de pet.js. */
(function (root, cfg) {
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else root.PET_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : this, {
  name: 'Astro',
  id: 'astro',                          // solo minúsculas, números y guiones
  appId: 'org.astrobrand.astro',        // identificador único de la app
  author: 'ASTROBRAND',
  description: 'Astro: mascota voxel que abre tu Claude desde el escritorio',

  phrases: {
    hello: ['¿Te ayudo con algo?', '¿Preguntamos algo?', 'Clic y le preguntamos a Claude', '¿Qué necesitas?'],
    greetMorning: ['¡Buenos días! ☀️'],
    greetMonday: ['¡Buen lunes! ☕'],
    greetAfternoon: ['¡Buenas tardes!'],
    greetNight: ['¡Buenas noches! 🌙'],
    quips: ['Houston, tenemos un diseño', 'Beep… boop… ¿alguna pregunta?', 'Un pequeño paso para el cursor…',
      'Modo ahorro de oxígeno activado', 'Si me arrastras, me mareo 🌀', '¿Y si le preguntamos a Claude?',
      'Revisando la órbita del escritorio…', 'Gravedad: 1. Ganas de trabajar: cargando…',
      'Tengo hambre de pixeles', 'Esta pantalla tiene buena vista 🌍'],
    lunch: ['¿Ya almorzaste? 🍽️'],
    evening: ['¡Ya casi es hora de salir!', 'Último empujón del día 💪'],
    monday: ['Lunes… ánimo ☕'],
    night: ['¿No deberías estar durmiendo? 🌙', 'Ya es tarde… a descansar 🌙'],
    music: ['Buen tema 🎧'],
    coffeeMorning: ['Primero el café ☕', 'Café de la estación espacial ☕'],
    coffee: ['Pausa para el café ☕', 'Recargando combustible ☕'],
    dance: ['¡A bailar! 🕺', 'Pasos prohibidos en la luna', 'Modo fiesta activado 🪩'],
    friday: ['¡Es viernes! 🎉'],
    stretch: ['Estirando los circuitos…', 'Aaaah… 🙆'],
    stretchNight: ['Aaaah… ya es tarde 😴', '¿Seguimos a esta hora?'],
    moonwalk: ['Moonwalk… literal 🌙'],
    jetpack: ['¡Despegue! 🚀', '3, 2, 1… 🚀'],
    slipUp: ['¡Estoy bien! 👍', 'Nadie vio eso…', 'Gravedad 1, {name} 0'],
    crashHit: ['¡Pum! 💥', '¡Auch!', 'Houston… aterricé'],
    crashUp: ['Estoy bien… creo 😵‍💫', 'Veo estrellitas ✨', 'Gravedad 1, {name} 0'],
    softLand: ['¡Uf!', 'Aterrizaje forzoso', 'Casi me caigo…'],
    floating: ['Gravedad cero 🌌', 'Me quedo flotando aquí'],
    wake: ['¡Uy! Ya desperté'],
    sleep: ['Buenas noches… 💤'],
    back: ['¡Volví! 👋', '¿Ganaste? 🎮', '¿Qué tal estuvo?', 'Te estuve esperando…']
  }
});

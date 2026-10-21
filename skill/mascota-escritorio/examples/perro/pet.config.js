/* Configuración de Canela, perrita salchicha. {name} se reemplaza por el nombre. */
(function (root, cfg) {
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else root.PET_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : this, {
  name: 'Canela',
  id: 'canela',
  description: 'Canela: una perrita salchicha que juega en tu escritorio',

  phrases: {
    hello: ['¡Guau! ¿Jugamos?', '¿Me rascas la panza?', 'Clic y le preguntamos a Claude', '¿Qué necesitas? 🐾'],
    greetMorning: ['¡Buenos días! ¿Paseo? ☀️', '¡Guau, ya amaneció!'],
    greetMonday: ['¡Buen lunes! Moví la cola 🐾'],
    greetAfternoon: ['¡Buenas tardes! 🐶'],
    greetNight: ['¡Buenas noches! 🌙'],
    quips: ['¿Alguien dijo paseo? 🐾', 'Soy larga, pero rápida', 'Escondí una media por ahí…',
      'Tus pantuflas están a salvo', '¿Me lanzas la pelotita?', 'Huelo una galleta 🍪',
      'Mis orejas barren el piso', 'Vigilando el escritorio 🐶', 'Guau. Eso es todo. Guau.',
      'Si me arrastras, me mareo 🌀'],
    lunch: ['¿Y mis croquetas? 🍽️', 'Comparte un pedacito…'],
    evening: ['¡Ya casi es hora del paseo!', '¿Ya salimos? 🐾'],
    monday: ['Lunes… pero con cola feliz'],
    fridayQuips: ['¡Viernes! Hueso doble 🦴'],
    night: ['¿No vamos a dormir? 🌙', 'Mi camita me llama 🌙'],
    music: ['¡Esta mueve mi cola! 🎧'],
    coffeeMorning: ['Café para ti, agüita pa mí ☕', 'Arrancando el día ☕'],
    coffee: ['Pausa… ¿hay galletas? ☕', 'Un sorbito y a jugar'],
    dance: ['¡Baile de la cola! 🕺', '¡Salchi-fiesta! 🪩'],
    friday: ['¡Viernes de huesito! 🎉'],
    stretch: ['Estirando la salchicha…', 'Aaaah… 🙆'],
    stretchNight: ['Aaaah… ya es tarde 😴'],
    moonwalk: ['Paso de perrito 🐾'],
    jetpack: ['¡Perrita al espacio! 🚀', '¡Atrapo esa ardilla! 🚀'],
    walk: ['Patrullando 🐾', 'Paseíto corto'],
    look: ['¿Escuché una ardilla?'],
    slipUp: ['¡Estoy bien! 👍', 'Nadie vio eso…', 'Fue culpa de la pelota'],
    crashHit: ['¡Guau! 💥', '¡Auch, mi colita!'],
    crashUp: ['Estoy bien… creo 😵‍💫', 'Veo huesitos ✨'],
    softLand: ['¡Uf! Cuatro patas al piso', 'Casi me caigo…'],
    floating: ['¡Soy un globo salchicha! 🎈', 'Floto como pelotita'],
    sleep: ['Siesta de perrita… 💤', 'Zzz… huesito… 💤'],
    wake: ['¡Ya desperté! ¿Jugamos?'],
    back: ['¡Volviste! Moví la cola 🐾', '¿Ganaste? 🎮', 'Te estuve esperando…']
  }
});

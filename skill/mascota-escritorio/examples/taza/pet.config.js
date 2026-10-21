/* Configuración de Cafecito (ejemplo). {name} se reemplaza por el nombre. */
(function (root, cfg) {
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else root.PET_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : this, {
  name: 'Cafecito',
  id: 'cafecito',
  appId: 'com.ejemplo.cafecito',
  author: 'Ejemplo',
  description: 'Cafecito: una taza de café que te acompaña en el escritorio',
  phrases: {
    hello: ['¿Un cafecito y una pregunta?', '¿Te ayudo con algo?', 'Clic y le preguntamos a Claude'],
    quips: ['Recién hecho ☕', 'No me derrames, por favor', 'Hoy vengo bien cargado', '¿Azúcar? No, gracias',
      'Si me arrastras, se me mueve el café 🌀', 'Calentito y listo para ayudar'],
    coffeeMorning: ['¿Café para un café? Clásico ☕', 'Arrancando el día ☕'],
    coffee: ['Hora de recargar ☕'],
    dance: ['¡A batir la espuma! 🕺', 'Modo capuchino 🪩'],
    jetpack: ['¡Despegue con cafeína! 🚀'],
    crashHit: ['¡Pum! Casi me derramo 💥', '¡Auch!'],
    crashUp: ['Ni una gota afuera 😅', 'Estoy bien… creo ☕'],
    softLand: ['¡Uf! Por poco', 'Casi se me cae el café'],
    night: ['A esta hora ya no tomo café 🌙', 'Ya es tarde… a descansar 🌙'],
    sleep: ['Me enfrío un ratito… 💤'],
    wake: ['¡Ya volví a calentarme!']
  }
});

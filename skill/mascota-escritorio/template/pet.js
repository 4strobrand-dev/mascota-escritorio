// Cerebro y animación de la mascota
(() => {
  const V = window.PetVoxel;
  const CFG = window.PET_CONFIG || {};
  const NAME = CFG.name || 'Mascota';
  const PH = CFG.phrases || {};
  // frases: las del pet.config.js si existen, si no las genéricas
  document.title = NAME;
  const L = (k, d) => (Array.isArray(PH[k]) && PH[k].length ? PH[k] : d).map(x => String(x).replace(/\{name\}/g, NAME));
  const PREVIEW = !window.astro;
  const qs = new URLSearchParams(location.search);
  let K = parseFloat(qs.get('k')) || (PREVIEW ? 0.8 : 0.65);   // tamaño
  let walkEnabled = qs.get('walk') !== '0';
  let gravity = qs.get('gravity') !== '0';
  const BASE = 5.2;

  const petEl = document.getElementById('pet');
  const canvas = document.getElementById('c');
  const bubble = document.getElementById('bubble');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');

  // ---------- encuadre (depende del tamaño) ----------
  const W = 230;
  let H, S, AX, AY, FLOOR, bIdle;
  function layout() {
    S = BASE * K;
    H = Math.round(70 + 185 * K);
    petEl.style.width = W + 'px'; petEl.style.height = H + 'px';
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.width = off.width = Math.round(W * dpr);
    canvas.height = off.height = Math.round(H * dpr);
    bIdle = V.bounds(V.render({}, S));
    AX = W / 2 - (bIdle.minX + bIdle.maxX) / 2;
    AY = H - Math.round(24 * K) - bIdle.maxY;
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    FLOOR = { x: AX + (4.5 * c - 2.5 * s) * S, y: AY + (4.5 * s + 2.5 * c) * S * 0.5 };
    bubble.style.top = Math.max(48, AY + bIdle.minY - 6) + 'px';   // la burbuja crece hacia arriba (hasta 2 líneas)
  }
  layout();

  const api = window.astro || makeMock();

  // ---------- utilidades ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now();
  const clock = () => { const d = new Date(); return { h: d.getHours(), m: d.getMinutes(), day: d.getDay() }; };
  const isNight = h => h >= 22 || h < 6;

  // ---------- estado ----------
  let state = 'idle', stateT = 0, stateDur = 3;
  let dir = -1;                     // -1 mira a la izquierda, 1 a la derecha
  let chatOpen = false, floating = false;
  let hovered = false, down = null, dragging = false;
  let cursor = null;                // [dx, dy] del cursor respecto a la mascota
  let music = { playing: false, title: '', artist: '' };
  let lastInteract = now();
  let hopT = 1, twirlT = 1, t = 0, lifting = false, slipSaid = false;
  let lastHour = clock().h, greeted = null;
  let quipAt = now() + rand(90, 180) * 1000;
  const zs = [], puffs = [], dust = [];
  let crashSaid = false;
  let zTimer = 0, puffTimer = 0;
  const P = { dz: 0, legL: 0, legR: 0, armLx: 0, armRx: 0, armLy: -0.08, armRy: 0.08, headX: 0, headZ: 0, tilt: 0 };

  const DUR = {
    walk: [3, 9], moonwalk: [2.5, 4], work: [8, 18], look: [3, 6], idle: [2, 5], dance: [4, 8],
    coffee: [7, 11], stretch: [3.2, 3.2], jetpack: [3.8, 3.8], slip: [3.6, 3.6], float: [4, 8]
  };

  function setState(s, dur) { state = s; stateT = 0; stateDur = dur; }

  function sleepAfter() { return isNight(clock().h) ? 90e3 : 240e3; }

  function weights() {
    const { h, day } = clock();
    const ground = !floating;
    const w = {
      walk: walkEnabled && ground ? 30 : 0, moonwalk: walkEnabled && ground ? 3 : 0,
      work: 14, look: 10, idle: 9, dance: 3, coffee: 2.5, stretch: 2,
      jetpack: ground && gravity ? 2 : 0, slip: walkEnabled && ground ? 1.5 : 0
    };
    if (h >= 6 && h < 10) { w.coffee += 10; w.stretch += 3; }
    if (h >= 12 && h < 14) { w.coffee += 3; w.idle += 4; }
    if (isNight(h)) { w.stretch += 8; w.walk *= 0.4; w.dance = 1; }
    if (day === 5 && h >= 15) w.dance += 12;
    if (music.playing) w.dance += 35;
    return w;
  }

  function pickNext() {
    if (chatOpen) return setState('work', 1e9);
    if (!floating && now() - lastInteract > sleepAfter()) return setState('sleep', 1e9);
    if (floating) {
      const r = Math.random();
      return startAction(r < 0.6 ? 'float' : r < 0.8 ? 'coffee' : music.playing ? 'dance' : 'look');
    }
    const w = weights();
    let total = 0;
    for (const k in w) total += w[k];
    let r = Math.random() * total;
    for (const k in w) { r -= w[k]; if (r <= 0) return startAction(k); }
    startAction('idle');
  }

  function startAction(s, forced) {
    if (floating && ['walk', 'moonwalk', 'slip', 'jetpack'].includes(s)) s = 'float';
    if (s === 'jetpack' && !gravity) s = 'dance';
    if ((s === 'walk' || s === 'moonwalk') && Math.random() < 0.6) dir = -dir;
    if (s === 'sleep') { setState('sleep', 1e9); if (forced) say(pick(L('sleep', ['Buenas noches… 💤'])), 2200, 1); return; }
    const d = DUR[s] || [3, 5];
    setState(s, rand(d[0], d[1]));
    if (s === 'slip') slipSaid = false;
    if (s === 'dance') twirlT = Math.random() < 0.6 ? -1.2 : 1;   // a veces da una vuelta
    onEnter(s, forced);
  }

  function say(text, ms, p) {
    if (Math.random() < (p ?? 1)) showBubble(text, ms);
  }

  function onEnter(s, forced) {
    const { h, day } = clock();
    const p = forced ? 1 : 0.55;
    switch (s) {
      case 'coffee':
        say(h >= 6 && h < 11 ? pick(L('coffeeMorning', ['Primero el café ☕', 'Un cafecito para empezar ☕']))
          : pick(L('coffee', ['Pausa para el café ☕', 'Recargando energía ☕'])), 2800, p); break;
      case 'dance':
        if (music.playing && music.title) say('🎵 ' + music.title, 3200, forced ? 1 : 0.8);
        else if (day === 5 && h >= 15) say(pick(L('friday', ['¡Es viernes! 🎉'])), 3000, forced ? 1 : 0.8);
        else say(pick(L('dance', ['¡A bailar! 🕺', 'Modo fiesta activado 🪩'])), 2600, p);
        break;
      case 'stretch':
        say(isNight(h) ? pick(L('stretchNight', ['Aaaah… ya es tarde 😴', '¿Seguimos a esta hora?']))
          : pick(L('stretch', ['Estirándome un poco…', 'Aaaah… 🙆'])), 2600, forced ? 1 : 0.7); break;
      case 'moonwalk': say(pick(L('moonwalk', ['Moonwalk 🌙'])), 2600, p); break;
      case 'jetpack': say(pick(L('jetpack', ['¡Despegue! 🚀', '3, 2, 1… 🚀'])), 2200, p); break;
      case 'look': if (forced) say(pick(L('look', ['¿Qué hay por aquí? 👀'])), 2200, 1); break;
      case 'walk': if (forced) say(pick(L('walk', ['Vamos a dar una vuelta'])), 2200, 1); break;
    }
  }

  // ---------- frases ----------
  function quips() {
    const { h, day } = clock();
    const q = L('quips', ['Beep… boop… ¿alguna pregunta?', 'Si me arrastras, me mareo 🌀', '¿Y si le preguntamos a Claude?',
      'Revisando el escritorio…', 'Esta pantalla tiene buena vista 🌍', 'Modo ahorro de energía activado']).slice();
    if (h >= 12 && h < 14) q.push(...L('lunch', ['¿Ya almorzaste? 🍽️', '¿Ya almorzaste? 🍽️']));
    if (h >= 17 && h < 19) q.push(...L('evening', ['¡Ya casi es hora de salir!', 'Último empujón del día 💪']));
    if (day === 1 && h < 12) q.push(...L('monday', ['Lunes… ánimo ☕', 'Lunes… ánimo ☕']));
    if (day === 5) q.push(...L('fridayQuips', ['¡Ya es viernes! 🎉']));
    if (isNight(h)) q.push(...L('night', ['¿No deberías estar durmiendo? 🌙', 'Ya es tarde… a descansar 🌙']));
    if (music.playing) q.push(...L('music', ['Buen tema 🎧']));
    return q;
  }

  function greeting() {
    const { h, day } = clock();
    const period = h < 12 ? 'm' : h < 19 ? 't' : 'n';
    if (greeted !== period) {
      greeted = period;
      if (period === 'm') return day === 1 ? pick(L('greetMonday', ['¡Buen lunes! ☕'])) : pick(L('greetMorning', ['¡Buenos días! ☀️']));
      return period === 't' ? pick(L('greetAfternoon', ['¡Buenas tardes!'])) : pick(L('greetNight', ['¡Buenas noches! 🌙']));
    }
    return pick(L('hello', ['¿Te ayudo con algo?', '¿Preguntamos algo?', 'Clic y le preguntamos a Claude', '¿Qué necesitas?']));
  }

  function hourText(h) {
    const h12 = h % 12 || 12;
    const part = h === 0 ? 'de la medianoche' : h < 6 ? 'de la madrugada' : h < 12 ? 'de la mañana'
      : h === 12 ? 'del mediodía' : h < 19 ? 'de la tarde' : 'de la noche';
    return `¡${h12 === 1 ? 'Es la' : 'Son las'} ${h12} ${part}!`;
  }

  // ---------- pose objetivo ----------
  function target() {
    const T = {
      dz: 0, legL: 0, legR: 0, armLx: 0, armRx: 0, armLy: -0.08, armRy: 0.08, headX: 0, headZ: 0, tilt: 0,
      laptop: false, mug: false, flame: false
    };
    let lookable = true;
    switch (state) {
      case 'idle':
        T.dz = Math.sin(t * 2.2) * 0.12;
        T.armLx = T.armRx = Math.sin(t * 2.2) * 0.05;
        T.headZ = Math.sin(t * 0.7) * 0.08;
        break;
      case 'look':
        T.headZ = Math.sin(stateT * 1.3) * 0.55;
        T.headX = -0.04 + Math.sin(stateT * 0.9) * 0.1;
        lookable = false;
        break;
      case 'walk': {
        const ph = t * 9;
        T.legL = Math.sin(ph) * 0.6; T.legR = -T.legL;
        T.armLx = -Math.sin(ph) * 0.55; T.armRx = -T.armLx;
        T.dz = Math.abs(Math.cos(ph)) * 0.45;
        T.headZ = Math.sin(ph * 0.5) * 0.05;
        lookable = false;
        break;
      }
      case 'moonwalk': {
        const ph = t * 6;
        T.legL = -Math.max(0, Math.sin(ph)) * 0.55;
        T.legR = -Math.max(0, -Math.sin(ph)) * 0.55;
        T.dz = Math.abs(Math.sin(ph)) * 0.3;
        T.armLx = Math.sin(ph) * 0.3; T.armRx = -T.armLx;
        T.headZ = Math.sin(ph * 0.5) * 0.15;
        lookable = false;
        break;
      }
      case 'work':
        T.dz = -5; T.legL = T.legR = 1.57;
        T.armLx = 1.12 + Math.max(0, Math.sin(t * 18)) * 0.13;
        T.armRx = 1.12 + Math.max(0, Math.sin(t * 18 + 1.7)) * 0.13;
        T.armLy = -0.12; T.armRy = 0.12;
        T.headX = -0.18 + Math.sin(t * 1.1) * 0.03;
        T.headZ = Math.sin(t * 0.4) * 0.1;
        T.laptop = true;
        break;
      case 'sleep':
        T.dz = -5; T.legL = T.legR = 1.57;
        T.armLx = T.armRx = 0.55; T.armLy = -0.15; T.armRy = 0.15;
        T.headX = -0.38 + Math.sin(t * 1.4) * 0.04; T.headZ = 0.15;
        lookable = false;
        break;
      case 'dance': {
        const ph = t * 8;
        T.dz = Math.abs(Math.sin(ph)) * 1.1;
        T.armLy = -1.0 - Math.max(0, Math.sin(ph)) * 1.6;
        T.armRy = 1.0 + Math.max(0, -Math.sin(ph)) * 1.6;
        T.armLx = T.armRx = 0.3;
        T.legL = Math.sin(ph) * 0.25; T.legR = -T.legL;
        T.headZ = Math.sin(ph * 0.5) * 0.35; T.headX = Math.sin(ph) * 0.08;
        lookable = false;
        break;
      }
      case 'coffee': {
        T.mug = true;
        const cyc = stateT % 4;
        const sip = cyc > 2.3 && cyc < 3.5;
        T.armRx = sip ? 2.35 : 0.95; T.armRy = sip ? 0.25 : 0.15;
        T.headX = sip ? 0.22 : 0;
        T.dz = Math.sin(t * 2) * 0.1;
        lookable = !sip;
        break;
      }
      case 'stretch': {
        const p = Math.min(1, stateT / 0.9);
        const relax = stateT > 2.2 ? 0.25 : 1;
        T.armLy = -2.9 * p * relax; T.armRy = 2.9 * p * relax;
        T.headX = 0.32 * p * relax; T.dz = 0.4 * p * relax;
        lookable = false;
        break;
      }
      case 'jetpack':
        T.flame = true;
        T.armLy = -0.9; T.armRy = 0.9;
        T.legL = 0.15 + Math.sin(t * 5) * 0.1; T.legR = 0.1 - Math.sin(t * 5) * 0.1;
        T.headX = 0.15;
        lookable = false;
        break;
      case 'slip':
        lookable = false;
        if (stateT < 0.4) {
          T.armLy = -2.2; T.armRy = 2.2; T.legL = 0.9; T.legR = 0.6; T.tilt = 1.45 * stateT / 0.4;
        } else if (stateT < 2.1) {
          T.tilt = 1.45; T.legL = 1.1 + Math.sin(t * 6) * 0.15; T.legR = 0.8 - Math.sin(t * 6) * 0.15;
          T.armLy = -1.2; T.armRy = 1.2; T.headX = 0.2;
        } else {
          T.armLy = -0.4; T.armRy = 0.4;
          if (!slipSaid) { slipSaid = true; showBubble(pick(L('slipUp', ['¡Estoy bien! 👍', 'Nadie vio eso…', 'Gravedad 1, {name} 0'])), 2600); }
        }
        break;
      case 'float': {
        const ph = t * 1.6;
        T.dz = Math.sin(ph) * 0.6;
        T.legL = 0.35 + Math.sin(ph) * 0.15; T.legR = 0.15 - Math.sin(ph) * 0.15;
        T.armLy = -0.6 + Math.sin(ph * 0.8) * 0.2; T.armRy = 0.6 - Math.sin(ph * 0.8) * 0.2;
        T.headZ = Math.sin(t * 0.5) * 0.3;
        break;
      }
      case 'land': {
        lookable = false;
        if (stateT < 0.14) {                         // golpe: se aplasta
          T.dz = -1.6; T.armLy = -1.4; T.armRy = 1.4; T.headX = -0.15;
        } else if (stateT < 1.15) {                  // tropezón: se tambalea
          const u = stateT - 0.14, w = Math.sin(u * 13) * Math.exp(-u * 2.6);
          T.tilt = w * 0.32;
          T.armLy = -1.1 - Math.max(0, w) * 1.3; T.armRy = 1.1 + Math.max(0, -w) * 1.3;
          T.armLx = -w * 0.6; T.armRx = w * 0.6;
          T.legL = Math.max(0, w) * 0.7; T.legR = Math.max(0, -w) * 0.7;
          T.headZ = w * 0.5; T.headX = w * 0.15;
        } else {
          T.armLy = -0.3; T.armRy = 0.3;
        }
        break;
      }
      case 'crash': {
        lookable = false;
        if (stateT < 0.14) {
          T.dz = -1.8; T.armLy = -1.6; T.armRy = 1.6;
        } else if (stateT < 0.5) {                   // se va de espaldas
          const p = (stateT - 0.14) / 0.36;
          T.tilt = 1.45 * p; T.legL = 1.0 * p; T.legR = 0.8 * p; T.armLy = -2.2; T.armRy = 2.2;
        } else if (stateT < 2.3) {                   // tirado y mareado
          T.tilt = 1.45 + Math.sin(stateT * 9) * 0.03 * Math.exp(-(stateT - 0.5) * 3);
          T.legL = 1.1; T.legR = 0.85; T.armLy = -1.3; T.armRy = 1.3;
          T.headZ = Math.sin(stateT * 3) * 0.25; T.headX = 0.2;
        } else {                                     // se levanta sacudiéndose
          T.tilt = 0; T.armLy = -0.5; T.armRy = 0.5;
          T.headZ = Math.sin(stateT * 7) * 0.35 * Math.max(0, 3.4 - stateT);
          if (!crashSaid) { crashSaid = true; showBubble(pick(L('crashUp', ['Estoy bien… creo 😵‍💫', 'Veo estrellitas ✨', 'Gravedad 1, {name} 0'])), 2200); }
        }
        break;
      }
      case 'drag':
        T.legL = Math.sin(t * 7) * 0.45; T.legR = Math.sin(t * 7 + 1.2) * 0.45;
        T.armLy = -2.5 + Math.sin(t * 9) * 0.2; T.armRy = 2.5 - Math.sin(t * 9) * 0.2;
        T.headX = 0.12;
        lookable = false;
        break;
      case 'fall':
        T.armLy = -2.7; T.armRy = 2.7; T.legL = -0.3; T.legR = 0.3; T.headX = 0.15;
        lookable = false;
        break;
    }
    if (floating && !['drag', 'fall', 'float'].includes(state)) {
      T.dz += Math.sin(t * 1.6) * 0.5;
      if (!T.laptop && state !== 'sleep') T.legL += 0.25;
    }
    // mira al cursor cuando está cerca
    if (cursor && lookable && !hovered) {
      T.headZ = clamp((dir > 0 ? cursor[0] : -cursor[0]) / 160, -0.75, 0.75);
      T.headX = clamp(-cursor[1] / 320, -0.18, 0.3) + (state === 'work' ? -0.1 : 0);
    }
    // saluda al pasar el mouse
    if (hovered && !down && !['sleep', 'drag', 'fall', 'slip', 'jetpack', 'land', 'crash'].includes(state)) {
      T.mug = false;
      T.armRx = 0; T.armRy = 2.55 + Math.sin(t * 11) * 0.35;
      T.headX = Math.max(T.headX, 0.06);
    }
    return T;
  }

  // ---------- aterrizaje ----------
  function impact(vy) {
    if (vy < 6) { setState('idle', 1.5); hopT = 0.5; return; }   // apenas cayó
    const hard = vy > 24;
    setState(hard ? 'crash' : 'land', hard ? 3.4 : 1.6);
    crashSaid = false;
    const n = Math.round(8 + Math.min(vy, 38) / 2.5);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      dust.push({
        x: FLOOR.x + (dir > 0 ? W - 2 * FLOOR.x : 0) + side * rand(4, 22) * K,
        y: FLOOR.y + rand(-2, 4) * K,
        vx: side * rand(40, 120) * K * (hard ? 1.3 : 1), vy: -rand(10, 55) * K,
        r: rand(3, 7) * K, age: 0, life: rand(0.5, 0.9)
      });
    }
    if (hard) showBubble(pick(L('crashHit', ['¡Pum! 💥', '¡Auch!'])), 2000);
    else if (Math.random() < 0.45) showBubble(pick(L('softLand', ['¡Uf!', 'Aterrizaje forzoso', 'Casi me caigo…'])), 1600);
  }

  // posición en pantalla del casco (para las estrellitas de mareo)
  function headScreen(pose, mirror) {
    const VX = Math.cos(Math.PI / 6), VY = Math.sin(Math.PI / 6);
    let x = 4.5, y = 1.5, z = 19.5 + pose.dz;
    const a = pose.tilt || 0;
    const yy = y - 1, zz = z;
    y = 1 + yy * Math.cos(a) - zz * Math.sin(a);
    z = yy * Math.sin(a) + zz * Math.cos(a);
    let sx = AX + (x * VX - y * VY) * S;
    const sy = AY + (x * VY + y * VX) * S * 0.5 - z * S * 0.92;
    if (mirror) sx = W - sx;
    return [sx, sy];
  }

  // ---------- burbuja ----------
  let bubbleTimer = null, bubbleOn = false;
  function showBubble(text, ms) {
    bubble.textContent = text;
    bubble.classList.add('show');
    bubbleOn = true;
    clearTimeout(bubbleTimer);
    if (ms) bubbleTimer = setTimeout(hideBubble, ms);
  }
  function hideBubble() { bubble.classList.remove('show'); bubbleOn = false; }

  // ---------- dibujo ----------
  function draw(pose, mirror) {
    const cw = canvas.width, ch = canvas.height;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, cw, ch);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mirror) { octx.translate(W, 0); octx.scale(-1, 1); }
    V.draw(octx, V.render(pose, S), AX, AY);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fx = mirror ? W - FLOOR.x : FLOOR.x;
    if (!['drag', 'fall', 'jetpack'].includes(state) && !floating) {
      const sit = clamp(-pose.dz / 5, 0, 1), lie = clamp(pose.tilt / 1.45, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(fx + (mirror ? -1 : 1) * lie * 30 * K, FLOOR.y + 4 * K + sit * 6 * K - lie * 8 * K,
        (34 + sit * 6 + lie * 22) * K, (8 + sit * 3) * K, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // humo del jetpack
    for (const p of puffs) {
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - p.age / 1.1));
      ctx.fillStyle = '#E8ECF2';
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `drop-shadow(0 ${1.5 * dpr}px ${2 * dpr}px rgba(0,0,0,0.35))`;
    ctx.drawImage(off, 0, 0);
    ctx.restore();
    // polvo del aterrizaje
    for (const d of dust) {
      ctx.globalAlpha = Math.max(0, 0.75 * (1 - d.age / d.life));
      ctx.fillStyle = '#D9DEE6';
      ctx.fillRect(d.x - d.r / 2, d.y - d.r / 2, d.r, d.r);
    }
    ctx.globalAlpha = 1;
    // estrellitas de mareo
    const dizzy = (state === 'crash' && stateT > 0.45 && stateT < 3.2) || (state === 'land' && stateT > 0.2 && stateT < 1.3);
    if (dizzy) {
      const [hx, hy] = headScreen(pose, mirror);
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * (Math.PI * 2 / 3);
        const sx = hx + Math.cos(a) * 30 * K, sy = hy - 26 * K + Math.sin(a) * 9 * K;
        const r = (Math.sin(a) > 0 ? 9 : 7) * K;
        ctx.fillStyle = i === 1 ? '#FFFFFF' : '#FFD23F';
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const rr = j % 2 ? r * 0.4 : r, aa = j * Math.PI / 4 + t * 2;
          ctx[j ? 'lineTo' : 'moveTo'](sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(20,23,28,0.55)';
    ctx.lineWidth = 3;
    for (const z of zs) {
      ctx.globalAlpha = Math.max(0, 1 - z.age / 2.6);
      ctx.font = `800 ${z.size * (0.6 + 0.4 * K)}px "Segoe UI", system-ui, sans-serif`;
      ctx.strokeText('z', z.x, z.y);
      ctx.fillText('z', z.x, z.y);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- bucle ----------
  const smooth = x => x * x * (3 - 2 * x);
  let last = now(), acc = 0, paused = false;
  function frame(nowMs) {
    if (paused) return;
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    acc += dt;
    const minStep = state === 'sleep' ? 1 / 15 : 1 / 45;
    if (acc < minStep) return requestAnimationFrame(frame);
    const step = acc; acc = 0;
    t += step; stateT += step;

    if (stateT > stateDur && !['drag', 'fall'].includes(state)) pickNext();

    // campanada de cada hora
    const ck = clock();
    if (ck.h !== lastHour) {
      lastHour = ck.h;
      if (!chatOpen && state !== 'sleep' && !down) {
        startAction(floating || !gravity ? 'dance' : 'jetpack');
        showBubble(hourText(ck.h), 3800);
      }
    }
    // frases graciosas de vez en cuando
    if (now() > quipAt) {
      quipAt = now() + rand(120, 300) * 1000;
      if (!hovered && !chatOpen && !bubbleOn && state !== 'sleep' && !down) showBubble(pick(quips()), 3200);
    }

    // caminar
    if ((state === 'walk' || state === 'moonwalk') && !hovered && !down && !floating) {
      const speed = (state === 'moonwalk' ? 0.55 : 1) * (12 + 34 * K);
      api.move((state === 'moonwalk' ? -dir : dir) * speed * step);
    }
    // vuelo con jetpack
    if (state === 'jetpack' && !down) {
      const p = clamp(stateT / stateDur, 0, 1);
      const e = p < 0.3 ? smooth(p / 0.3) : p > 0.75 ? smooth((1 - p) / 0.25) : 1 + Math.sin(t * 5) * 0.06;
      api.lift(Math.round(e * (60 + 80 * K)));
      lifting = true;
      puffTimer -= step;
      if (puffTimer <= 0) {
        puffTimer = 0.06;
        const fx = (dir > 0 ? W - FLOOR.x : FLOOR.x) + rand(-12, 12) * K;
        puffs.push({ x: fx, y: FLOOR.y - 4 * K, r: rand(4, 8) * K, age: 0, vx: rand(-20, 20) });
      }
    } else if (lifting) { lifting = false; api.lift(0); }
    for (const p of puffs) { p.age += step; p.y += 40 * step; p.x += p.vx * step; p.r += 10 * step * K; }
    while (puffs.length && puffs[0].age > 1.1) puffs.shift();
    for (const d of dust) { d.age += step; d.x += d.vx * step; d.y += d.vy * step; d.vy += 90 * K * step; d.vx *= 0.94; d.r += 6 * K * step; }
    for (let i = dust.length - 1; i >= 0; i--) if (dust[i].age > dust[i].life) dust.splice(i, 1);

    const T = target();
    const k = 1 - Math.exp(-step * (state === 'land' || state === 'crash' ? 26 : 14));
    for (const key in P) P[key] += (T[key] - P[key]) * k;
    let dz = P.dz, spin = 0;
    if (hopT < 1) { hopT = Math.min(1, hopT + step * 2.6); dz += Math.sin(hopT * Math.PI) * 2.6; }
    if (twirlT < 1) {
      twirlT = Math.min(1, twirlT + step * 0.9);
      if (twirlT > 0) spin = smooth(twirlT) * Math.PI * 2;
      if (state !== 'dance' && twirlT < 0) twirlT = 1;
    }

    if (state === 'sleep') {
      zTimer -= step;
      if (zTimer <= 0) {
        zTimer = 1.3;
        zs.push({ x: W / 2 + 20 * K, y: AY + bIdle.minY + 62 * K, age: 0, size: 13, vx: 8 + Math.random() * 6 });
      }
    }
    for (const z of zs) { z.age += step; z.y -= 16 * step; z.x += z.vx * step; z.size += 4 * step; }
    while (zs.length && zs[0].age > 2.6) zs.shift();

    const pose = { ...P, dz, spin, laptop: T.laptop && P.dz < -3.6, mug: T.mug, flame: T.flame, flameT: t };
    draw(pose, dir > 0);
    requestAnimationFrame(frame);
  }

  // ---------- interacción ----------
  function solidAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - r.left) * dpr), y = Math.floor((clientY - r.top) * dpr);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;
    return ctx.getImageData(x, y, 1, 1).data[3] > 70;
  }

  function wake() {
    lastInteract = now();
    if (state === 'sleep') { setState('stretch', 3.2); showBubble(pick(L('wake', ['¡Uy! Ya desperté'])), 1800); }
  }

  function setHover(v) {
    if (v === hovered) return;
    hovered = v;
    api.setIgnore(!v);
    if (v) {
      const wasSleeping = state === 'sleep';
      wake();
      if (!chatOpen && !wasSleeping) showBubble(greeting());
    } else if (!down) {
      hideBubble();
    }
  }

  window.addEventListener('pointermove', e => {
    if (down) {
      if (!dragging && Math.hypot(e.screenX - down.x, e.screenY - down.y) > 5) {
        dragging = true;
        hideBubble();
        api.dragStart(e.clientX, e.clientY);
        setState('drag', 1e9);
        if (lifting) { lifting = false; }
      }
      if (dragging) api.dragMove(e.clientX, e.clientY);
      return;
    }
    if (PREVIEW) {
      const r = petEl.getBoundingClientRect();
      const dx = e.clientX - (r.left + W / 2), dy = e.clientY - (r.top + H * 0.6);
      cursor = Math.hypot(dx, dy) < 500 ? [dx, dy] : null;
    }
    setHover(solidAt(e.clientX, e.clientY));
  });

  document.addEventListener('mouseleave', () => { if (!down) setHover(false); });

  window.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (!solidAt(e.clientX, e.clientY)) return;
    down = { x: e.screenX, y: e.screenY };
    try { petEl.setPointerCapture(e.pointerId); } catch (_) {}
  });

  window.addEventListener('pointerup', () => {
    if (!down) return;
    const wasDrag = dragging;
    down = null; dragging = false;
    lastInteract = now();
    if (wasDrag) {
      api.dragEnd();
      setState('fall', 1e9);
    } else {
      hopT = 0;
      hideBubble();
      wake();
      api.click();
    }
  });

  // rueda del mouse sobre la mascota = cambiar tamaño
  window.addEventListener('wheel', e => {
    if (!hovered && !PREVIEW) return;
    e.preventDefault();
    api.resize(e.deltaY < 0 ? 0.05 : -0.05);
  }, { passive: false });

  window.addEventListener('contextmenu', e => { e.preventDefault(); api.menu(); });

  // ---------- eventos de la app ----------
  api.on('pet:edge', edge => { dir = state === 'moonwalk' ? edge : -edge; });
  api.on('pet:landed', vy => { floating = false; impact(Number(vy) || 0); });
  api.on('pet:floating', f => {
    floating = f;
    if (f) { setState('float', rand(4, 8)); if (Math.random() < 0.5) showBubble(pick(L('floating', ['Gravedad cero 🌌', 'Me quedo flotando aquí'])), 2400); }
  });
  api.on('pet:chat', open => {
    chatOpen = open;
    lastInteract = now();
    if (open) { hideBubble(); setState('work', 1e9); }
    else setState('idle', 2);
  });
  api.on('pet:walk', v => { walkEnabled = v; if (!v && (state === 'walk' || state === 'moonwalk')) setState('idle', 2); });
  api.on('pet:gravity', g => { gravity = g; });
  api.on('pet:scale', k => { K = k; layout(); showBubble(Math.round(k * 100) + '%', 900); });
  api.on('pet:cursor', c => { cursor = c; });
  api.on('pet:do', action => { wake(); hideBubble(); startAction(action, true); });
  api.on('pet:pause', p => {
    if (p.paused) { paused = true; hideBubble(); return; }
    if (!paused) return;
    paused = false;
    last = now(); acc = 0;
    lastInteract = now();
    if (state === 'jetpack' || state === 'walk' || state === 'moonwalk') setState('idle', 2);
    if (p.away > 90e3) setTimeout(() => showBubble(pick(L('back', ['¡Volví! 👋', '¿Ganaste? 🎮', '¿Qué tal estuvo?', 'Te estuve esperando…'])), 3000), 600);
    requestAnimationFrame(frame);
  });
  api.on('pet:music', m => {
    const started = m.playing && !music.playing;
    const changed = m.playing && m.title && m.title !== music.title;
    music = m;
    if ((started || changed) && !chatOpen) {
      if (state !== 'sleep' && Math.random() < 0.7) startAction('dance');
      showBubble('🎵 ' + m.title + (m.artist ? ' · ' + m.artist : ''), 3500);
    }
  });

  // ---------- vista previa sin Electron ----------
  function makeMock() {
    document.body.classList.add('preview');
    const handlers = {};
    const fire = (ch, ...a) => handlers[ch] && handlers[ch](...a);
    const chatEl = document.getElementById('mockChat');
    const floorTop = () => window.innerHeight - 30 - H;
    let x = Math.max(0, window.innerWidth / 2 - W / 2), y = floorTop(), open = false;
    let grab = null, fallId = 0, mPlaying = false;
    const place = () => { petEl.style.left = Math.round(x) + 'px'; petEl.style.top = Math.round(y) + 'px'; };
    place();
    window.addEventListener('resize', () => { y = floorTop(); place(); if (open) placeChat(); });

    function placeChat() {
      const pw = Math.min(330, window.innerWidth - 24), ph = Math.min(440, window.innerHeight - 160);
      chatEl.style.width = pw + 'px'; chatEl.style.height = ph + 'px';
      const cx = x + W / 2, half = 60 * K, gap = 14;
      let left, top = y + H - Math.round(24 * K) - ph;
      if (cx + half + gap + pw <= window.innerWidth - 8) left = cx + half + gap;
      else if (cx - half - gap - pw >= 8) left = cx - half - gap - pw;
      else { left = clamp(cx - pw / 2, 8, window.innerWidth - pw - 8); top = y + AY + bIdle.minY - ph - 14; }
      chatEl.style.left = Math.round(left) + 'px';
      chatEl.style.top = Math.round(clamp(top, 8, window.innerHeight - ph - 8)) + 'px';
    }
    const toggle = () => {
      open = !open;
      if (open) placeChat();
      chatEl.classList.toggle('open', open);
      fire('pet:chat', open);
    };
    document.getElementById('mockClose').addEventListener('click', toggle);
    for (const b of document.querySelectorAll('#mockChat .tab')) {
      b.addEventListener('click', () => {
        for (const o of document.querySelectorAll('#mockChat .tab')) o.classList.toggle('on', o === b);
        for (const v of document.querySelectorAll('#mockChat .view')) v.classList.toggle('on', v.dataset.view === b.dataset.tab);
      });
    }
    const mBtn = document.getElementById('mPlay');
    mBtn.addEventListener('click', () => {
      mPlaying = !mPlaying;
      mBtn.textContent = mPlaying ? '❚❚' : '▶';
      document.getElementById('mState').textContent = mPlaying ? 'Sonando en Spotify' : 'En pausa';
      fire('pet:music', { playing: mPlaying, title: 'Canción de prueba', artist: NAME });
    });
    return {
      move(dx) {
        const min = -40, max = window.innerWidth - W + 40;
        x += dx;
        let e = 0;
        if (x < min) { x = min; e = -1; }
        if (x > max) { x = max; e = 1; }
        y = floorTop();
        place();
        if (e) fire('pet:edge', e);
      },
      lift(px) { if (!grab) { y = floorTop() - px; place(); } },
      dragStart(cx, cy) { cancelAnimationFrame(fallId); grab = { dx: cx - x, dy: cy - y }; },
      dragMove(cx, cy) { if (!grab) return; x = cx - grab.dx; y = cy - grab.dy; place(); },
      dragEnd() {
        grab = null;
        x = clamp(x, -40, window.innerWidth - W + 40);
        let vy = -2;
        const fall = () => {
          vy = Math.min(vy + 1.4, 38); y += vy;
          if (y >= floorTop()) { y = floorTop(); place(); fire('pet:landed', vy); return; }
          place(); fallId = requestAnimationFrame(fall);
        };
        fallId = requestAnimationFrame(fall);
      },
      resize(d) {
        const bottom = y + H;
        K = clamp(Math.round((K + d) * 100) / 100, 0.4, 1.2);
        fire('pet:scale', K);
        y = bottom - H; place();
      },
      setIgnore() {}, menu() {},
      click: toggle,
      on(ch, cb) { handlers[ch] = cb; }
    };
  }

  if (PREVIEW) {
    for (const b of document.querySelectorAll('#acts button')) {
      b.addEventListener('click', () => {
        if (b.dataset.k) return api.resize(parseFloat(b.dataset.k));
        wake(); hideBubble(); startAction(b.dataset.a, true);
      });
    }
  }
  setTimeout(() => showBubble(greeting(), 4500), 800);
  requestAnimationFrame(frame);
})();

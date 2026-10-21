(() => {
  const $ = id => document.getElementById(id);
  if (window.PET_CONFIG && window.PET_CONFIG.name) document.title = window.PET_CONFIG.name;
  const api = window.panel;
  let state = { running: false, playing: false, title: '', artist: '' };

  function setTab(name) {
    document.body.classList.toggle('music', name === 'music');
    $('tClaude').classList.toggle('on', name === 'claude');
    $('tMusic').classList.toggle('on', name === 'music');
    $('reload').style.display = name === 'claude' ? '' : 'none';
  }
  $('tClaude').onclick = () => { setTab('claude'); api.tab('claude'); };
  $('tMusic').onclick = () => { setTab('music'); api.tab('music'); };
  $('reload').onclick = () => api.reload();
  $('close').onclick = () => api.hide();
  $('prev').onclick = () => api.music('prev');
  $('next').onclick = () => api.music('next');
  $('play').onclick = () => {
    if (!state.running) return api.openSpotify();
    api.music('toggle');
  };
  $('openSp').onclick = () => api.openSpotify();
  api.onTab(setTab);

  const PLAY = '<path d="M7 4l14 8-14 8z"/>', PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  api.onMusic(s => {
    state = s;
    $('song').textContent = s.title || (s.running ? (s.playing ? 'Sonando' : 'En pausa') : 'Spotify está cerrado');
    $('artist').textContent = s.artist || '';
    $('status').textContent = !s.running ? 'Abre Spotify para controlarlo desde aquí'
      : s.playing ? 'Sonando en Spotify' : 'En pausa';
    $('playIcon').innerHTML = s.playing ? PAUSE : PLAY;
    $('tMusic').classList.toggle('playing', !!s.playing);
  });

  // mini mascota que baila cuando suena música
  const V = window.PetVoxel;
  const cv = $('stage'), dpr = Math.max(1, window.devicePixelRatio || 1);
  cv.width = 170 * dpr; cv.height = 170 * dpr;
  const ctx = cv.getContext('2d');
  const S = 3.6;
  const b = V.bounds(V.render({}, S));
  const ax = 85 - (b.minX + b.maxX) / 2, ay = 160 - b.maxY;
  let t = 0, last = performance.now();
  function loop(now) {
    t += Math.min(0.05, (now - last) / 1000); last = now;
    let pose;
    if (state.playing) {
      const ph = t * 8;
      pose = {
        dz: Math.abs(Math.sin(ph)) * 1.1, armLx: 0.3, armRx: 0.3,
        armLy: -1.0 - Math.max(0, Math.sin(ph)) * 1.6, armRy: 1.0 + Math.max(0, -Math.sin(ph)) * 1.6,
        legL: Math.sin(ph) * 0.25, legR: -Math.sin(ph) * 0.25, headZ: Math.sin(ph * 0.5) * 0.35
      };
    } else {
      pose = { dz: Math.sin(t * 2) * 0.12, headZ: Math.sin(t * 0.7) * 0.15 };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 170, 170);
    if (document.body.classList.contains('music')) V.draw(ctx, V.render(pose, S), ax, ay);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

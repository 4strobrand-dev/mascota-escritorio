// Mascota de escritorio que abre tu Claude (claude.ai) y controla Spotify.
const {
  app, BrowserWindow, WebContentsView, ipcMain, screen, Tray, Menu, nativeImage, shell, session, globalShortcut
} = require('electron');
const path = require('path');
const fs = require('fs');
const music = require('./music');
const CFG = require('./pet.config.js');
const NAME = CFG.name || 'Mascota';
const PET_ID = (CFG.id || 'pet').replace(/[^a-z0-9-]/gi, '');

const PET_W = 230;
const petH = k => Math.round(70 + 185 * k);       // igual que en pet.js
const sink = k => Math.round(16 * k);              // cuánto "pisa" la barra de tareas
const CHAT_W = 440, CHAT_H = 680, TAB_H = 44;
const CLAUDE_URL = 'https://claude.ai/new';
const PARTITION = 'persist:' + PET_ID + '-claude';
const HOTKEY = 'CommandOrControl+Shift+Space';
const ICON = path.join(__dirname, 'assets', 'icon.png');

const SIZES = [['Mini', 0.45], ['Pequeño', 0.6], ['Mediano', 0.8], ['Grande', 1.0]];
const ACTIONS = [
  ['Bailar', 'dance'], ['Tomar café', 'coffee'], ['Jetpack', 'jetpack'], ['Moonwalk', 'moonwalk'],
  ['Resbalarse', 'slip'], ['Estirarse', 'stretch'], ['Mirar alrededor', 'look'], ['Dar una vuelta', 'walk'],
  ['Trabajar en la laptop', 'work'], ['Dormir', 'sleep']
];

let settings = { scale: 0.6, walk: true, gravity: true, hideFullscreen: true };
let pet = null, chat = null, claudeView = null, tray = null;
let petX = 0, petY = 0, lift = 0, floating = false;
let dragTimer = null, dragOffset = null, fallTimer = null;
let musicState = { running: false, playing: false, title: '', artist: '' };
let currentTab = 'claude';
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => toggleChat(true));
}

// ---------- ajustes guardados ----------
const settingsFile = () => path.join(app.getPath('userData'), PET_ID + '-settings.json');
function loadSettings() {
  try { Object.assign(settings, JSON.parse(fs.readFileSync(settingsFile(), 'utf8'))); } catch {}
}
function saveSettings() {
  try { fs.writeFileSync(settingsFile(), JSON.stringify(settings)); } catch {}
}

function chromeUA() {
  const os = process.platform === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7'
    : process.platform === 'win32' ? 'Windows NT 10.0; Win64; x64' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const H = () => petH(settings.scale);
const workAreaAt = (x, y) => screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) }).workArea;
const petWorkArea = () => workAreaAt(petX + PET_W / 2, petY + H() / 2);
const floorY = wa => wa.y + wa.height - H() + sink(settings.scale);
const petMinX = wa => wa.x - 40;
const petMaxX = wa => wa.x + wa.width - PET_W + 40;

function placePet() {
  if (!pet || pet.isDestroyed()) return;
  pet.setBounds({ x: Math.round(petX), y: Math.round(petY), width: PET_W, height: H() });
}

function send(ch, ...args) {
  if (pet && !pet.isDestroyed()) pet.webContents.send(ch, ...args);
}

// ---------- ventana de la mascota ----------
function createPet() {
  const wa = screen.getPrimaryDisplay().workArea;
  petX = wa.x + wa.width - PET_W - 120;
  petY = floorY(wa);
  pet = new BrowserWindow({
    x: petX, y: petY, width: PET_W, height: H(),
    show: false, frame: false, transparent: true, resizable: false, movable: false,
    hasShadow: false, alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    minimizable: false, maximizable: false, backgroundColor: '#00000000',
    type: process.platform === 'darwin' ? 'panel' : (process.platform === 'win32' ? 'toolbar' : undefined),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  pet.setAlwaysOnTop(true, 'screen-saver');
  pet.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  pet.setIgnoreMouseEvents(true, { forward: true });
  pet.loadFile(path.join(__dirname, 'pet.html'), {
    query: { k: String(settings.scale), walk: settings.walk ? '1' : '0', gravity: settings.gravity ? '1' : '0' }
  });
  pet.once('ready-to-show', () => pet.showInactive());
  pet.webContents.on('did-finish-load', () => send('pet:music', musicState));
}

const busy = () => dragTimer || fallTimer;

ipcMain.on('pet:move', (_e, dx) => {
  if (busy() || floating) return;
  const wa = petWorkArea();
  petX += dx;
  let edge = 0;
  if (petX < petMinX(wa)) { petX = petMinX(wa); edge = -1; }
  if (petX > petMaxX(wa)) { petX = petMaxX(wa); edge = 1; }
  petY = floorY(wa) - lift;
  placePet();
  if (edge) send('pet:edge', edge);
});

ipcMain.on('pet:lift', (_e, px) => {
  if (busy() || floating) return;
  lift = Math.max(0, Number(px) || 0);
  petY = floorY(petWorkArea()) - lift;
  placePet();
});

ipcMain.on('pet:ignore', (_e, ignore) => {
  if (pet && !pet.isDestroyed()) pet.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.on('pet:drag-start', () => {
  stopFall();
  lift = 0;
  if (floating) { floating = false; }
  const c = screen.getCursorScreenPoint();
  dragOffset = { x: c.x - petX, y: c.y - petY };
  clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    petX = p.x - dragOffset.x;
    petY = p.y - dragOffset.y;
    placePet();
  }, 16);
});

ipcMain.on('pet:drag-end', () => {
  clearInterval(dragTimer);
  dragTimer = null;
  if (settings.gravity) {
    startFall();
  } else {
    const wa = petWorkArea();
    petX = clamp(petX, petMinX(wa), petMaxX(wa));
    petY = clamp(petY, wa.y - 40, floorY(wa));
    placePet();
    floating = petY < floorY(wa) - 4;
    if (floating) send('pet:floating', true);
    else send('pet:landed', 0);
  }
});

function stopFall() { clearInterval(fallTimer); fallTimer = null; }

function startFall() {
  stopFall();
  floating = false;
  lift = 0;
  const wa = petWorkArea();
  petX = clamp(petX, petMinX(wa), petMaxX(wa));
  const fy = floorY(wa);
  let vy = -2;
  fallTimer = setInterval(() => {
    vy = Math.min(vy + 1.4, 38);
    petY += vy;
    if (petY >= fy) {
      petY = fy;
      placePet();
      stopFall();
      send('pet:landed', vy);
    } else {
      placePet();
    }
  }, 16);
}

function setScale(k) {
  k = clamp(Math.round(k * 100) / 100, 0.4, 1.2);
  if (k === settings.scale) return;
  const bottom = petY + H();
  settings.scale = k;
  const wa = petWorkArea();
  petY = floating ? bottom - H() : floorY(wa) - lift;
  placePet();
  send('pet:scale', k);
  saveSettings();
  refreshTray();
}

ipcMain.on('pet:resize', (_e, d) => setScale(settings.scale + Number(d || 0)));
ipcMain.on('pet:click', () => toggleChat());
ipcMain.on('pet:menu', () => buildMenu().popup({ window: pet }));

// mirar al cursor
let lastCursor = '';
setInterval(() => {
  if (!pet || pet.isDestroyed() || !pet.isVisible()) return;
  const c = screen.getCursorScreenPoint();
  const dx = c.x - (petX + PET_W / 2), dy = c.y - (petY + H() * 0.6);
  const msg = Math.hypot(dx, dy) < 500 ? [Math.round(dx / 4) * 4, Math.round(dy / 4) * 4] : null;
  const key = JSON.stringify(msg);
  if (key !== lastCursor) { lastCursor = key; send('pet:cursor', msg); }
}, 120);

// ---------- esconderse en pantalla completa ----------
let fsHidden = false, fsHits = 0, fsMiss = 0, fsHiddenAt = 0, fsBusy = false;

function fullscreenOnPetDisplay(rect) {
  let cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2;
  if (process.platform === 'win32' && screen.screenToDipPoint) {
    const p = screen.screenToDipPoint({ x: cx, y: cy });
    cx = p.x; cy = p.y;
  }
  const fsDisplay = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) });
  const petDisplay = screen.getDisplayNearestPoint({ x: Math.round(petX + PET_W / 2), y: Math.round(petY + H() / 2) });
  return fsDisplay.id === petDisplay.id;
}

function setFsHidden(hide) {
  if (hide === fsHidden || !pet || pet.isDestroyed()) return;
  fsHidden = hide;
  if (hide) {
    fsHiddenAt = Date.now();
    pet.hide();
    send('pet:pause', { paused: true });
  } else {
    send('pet:pause', { paused: false, away: Date.now() - fsHiddenAt });
    pet.showInactive();
  }
  refreshTray();
}

async function checkFullscreen() {
  if (fsBusy || !pet || pet.isDestroyed()) return;
  if (!settings.hideFullscreen || dragTimer) { fsHits = 0; setFsHidden(false); return; }
  fsBusy = true;
  try {
    const r = await music.fullscreen();
    const full = r.full && fullscreenOnPetDisplay(r.rect);
    if (full) { fsHits++; fsMiss = 0; } else { fsMiss++; fsHits = 0; }
    if (fsHits >= 2) setFsHidden(true);
    if (fsMiss >= 2) setFsHidden(false);
  } finally { fsBusy = false; }
}
setInterval(checkFullscreen, 1500);

// ---------- música ----------
async function pollMusic() {
  const s = await music.getState();
  const changed = JSON.stringify(s) !== JSON.stringify(musicState);
  musicState = s;
  if (changed) {
    send('pet:music', s);
    if (chat && !chat.isDestroyed()) chat.webContents.send('panel:music-state', s);
    refreshTray();
  }
}
setInterval(pollMusic, 3000);

async function musicAction(a) {
  await music.control(a);
  setTimeout(pollMusic, 600);
  setTimeout(pollMusic, 1600);
}

ipcMain.on('panel:music', (_e, a) => musicAction(a));
ipcMain.on('panel:open-spotify', () => { music.openSpotify(); setTimeout(pollMusic, 2500); });
ipcMain.on('panel:reload', () => { if (claudeView) claudeView.webContents.loadURL(CLAUDE_URL); });
ipcMain.on('panel:hide', () => { if (chat && !chat.isDestroyed()) chat.hide(); });
ipcMain.on('panel:tab', (_e, tab) => setTab(tab));

// ---------- panel: Claude + Música ----------
const ALLOWED_HOSTS = /(^|\.)claude\.ai$|(^|\.)claude\.com$|^accounts\.google\.com$|^appleid\.apple\.com$/;
const hostOf = u => { try { return new URL(u).hostname; } catch { return ''; } };

function layoutViews() {
  if (!chat || chat.isDestroyed() || !claudeView) return;
  const b = chat.getContentBounds();
  claudeView.setBounds({ x: 0, y: TAB_H, width: b.width, height: Math.max(0, b.height - TAB_H) });
}

function setTab(tab) {
  currentTab = tab === 'music' ? 'music' : 'claude';
  if (claudeView) claudeView.setVisible(currentTab === 'claude');
  if (chat && !chat.isDestroyed()) chat.webContents.send('panel:tab-state', currentTab);
  if (currentTab === 'claude' && claudeView) claudeView.webContents.focus();
  if (currentTab === 'music') pollMusic();
}

function ensureChat() {
  if (chat && !chat.isDestroyed()) return chat;
  chat = new BrowserWindow({
    width: CHAT_W, height: CHAT_H, minWidth: 360, minHeight: 460,
    show: false, title: NAME, icon: ICON,
    autoHideMenuBar: true, alwaysOnTop: true, fullscreenable: false,
    backgroundColor: '#262624',
    webPreferences: { preload: path.join(__dirname, 'panel-preload.js') }
  });
  chat.setMenuBarVisibility(false);
  chat.loadFile(path.join(__dirname, 'panel.html'));
  chat.webContents.on('did-finish-load', () => {
    chat.webContents.send('panel:music-state', musicState);
    chat.webContents.send('panel:tab-state', currentTab);
  });

  claudeView = new WebContentsView({ webPreferences: { partition: PARTITION, spellcheck: true } });
  chat.contentView.addChildView(claudeView);
  layoutViews();
  chat.on('resize', layoutViews);
  claudeView.webContents.setUserAgent(chromeUA());
  claudeView.webContents.loadURL(CLAUDE_URL);

  // ventanas de inicio de sesión se quedan en la app; el resto va al navegador
  claudeView.webContents.setWindowOpenHandler(({ url }) => {
    if (ALLOWED_HOSTS.test(hostOf(url))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true, alwaysOnTop: true, width: 520, height: 720,
          webPreferences: { partition: PARTITION }
        }
      };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
  claudeView.webContents.on('will-navigate', (e, url) => {
    if (!ALLOWED_HOSTS.test(hostOf(url))) { e.preventDefault(); shell.openExternal(url); }
  });

  chat.on('close', e => { if (!quitting) { e.preventDefault(); chat.hide(); } });
  chat.on('show', () => { send('pet:chat', true); refreshTray(); });
  chat.on('hide', () => { send('pet:chat', false); refreshTray(); });
  return chat;
}

// Coloca el panel junto a la mascota, sin taparla
function positionChat() {
  const wa = petWorkArea();
  const [w, h] = chat.getSize();
  const k = settings.scale;
  const cx = petX + PET_W / 2;
  const half = 60 * k, gap = 16;
  const feet = petY + H() - Math.round(24 * k);
  let x, y = clamp(feet - h, wa.y + 8, wa.y + wa.height - h - 8);
  if (cx + half + gap + w <= wa.x + wa.width - 8) x = cx + half + gap;          // a la derecha
  else if (cx - half - gap - w >= wa.x + 8) x = cx - half - gap - w;          // a la izquierda
  else {                                                                       // encima
    x = clamp(cx - w / 2, wa.x + 8, wa.x + wa.width - w - 8);
    y = clamp(feet - 200 * k - h - 12, wa.y + 8, wa.y + wa.height - h - 8);
  }
  chat.setPosition(Math.round(x), Math.round(y));
}

function toggleChat(forceShow, tab) {
  const c = ensureChat();
  if (c.isVisible() && !forceShow && !tab) { c.hide(); return; }
  if (tab) setTab(tab);
  positionChat();
  c.show();
  c.focus();
  if (currentTab === 'claude' && claudeView) claudeView.webContents.focus();
  if (process.platform === 'darwin') app.focus({ steal: true });
}

// ---------- menú (clic derecho y bandeja) ----------
function buildMenu() {
  const open = chat && !chat.isDestroyed() && chat.isVisible();
  const m = musicState;
  const song = m.playing && m.title ? `♫ ${m.title}${m.artist ? ' · ' + m.artist : ''}` : null;
  return Menu.buildFromTemplate([
    { label: open ? 'Ocultar panel' : 'Preguntarle a Claude', accelerator: HOTKEY, click: () => toggleChat() },
    {
      label: 'Música', submenu: [
        ...(song ? [{ label: song.length > 48 ? song.slice(0, 47) + '…' : song, enabled: false }, { type: 'separator' }] : []),
        { label: m.playing ? 'Pausar' : 'Reproducir', click: () => musicAction('toggle') },
        { label: 'Siguiente', click: () => musicAction('next') },
        { label: 'Anterior', click: () => musicAction('prev') },
        { type: 'separator' },
        { label: 'Abrir pestaña de música', click: () => toggleChat(true, 'music') },
        { label: 'Abrir Spotify', click: () => music.openSpotify() }
      ]
    },
    { label: 'Acciones', submenu: ACTIONS.map(([label, a]) => ({ label, click: () => send('pet:do', a) })) },
    { type: 'separator' },
    {
      label: 'Tamaño', submenu: SIZES.map(([label, k]) => ({
        label, type: 'radio', checked: Math.abs(settings.scale - k) < 0.03, click: () => setScale(k)
      }))
    },
    {
      label: 'Pasear por el escritorio', type: 'checkbox', checked: settings.walk,
      click: mi => { settings.walk = mi.checked; saveSettings(); send('pet:walk', settings.walk); }
    },
    {
      label: 'Gravedad (si la apagas, flota donde lo sueltes)', type: 'checkbox', checked: settings.gravity,
      click: mi => {
        settings.gravity = mi.checked; saveSettings(); send('pet:gravity', settings.gravity);
        if (settings.gravity && floating) startFall();
      }
    },
    {
      label: 'Esconderse en juegos y videos a pantalla completa', type: 'checkbox', checked: settings.hideFullscreen,
      click: mi => { settings.hideFullscreen = mi.checked; saveSettings(); if (!mi.checked) setFsHidden(false); }
    },
    {
      label: 'Traer a ' + NAME + ' aquí', click: () => {
        setFsHidden(false);
        const c = screen.getCursorScreenPoint();
        const wa = workAreaAt(c.x, c.y);
        petX = clamp(c.x - PET_W / 2, petMinX(wa), petMaxX(wa));
        petY = wa.y + 40;
        placePet();
        startFall();
      }
    },
    {
      label: 'Iniciar con el sistema', type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: mi => app.setLoginItemSettings({ openAtLogin: mi.checked })
    },
    { type: 'separator' },
    {
      label: 'Cerrar sesión de Claude en ' + NAME, click: async () => {
        await session.fromPartition(PARTITION).clearStorageData();
        if (claudeView) claudeView.webContents.loadURL(CLAUDE_URL);
      }
    },
    { label: 'Salir', click: () => { quitting = true; app.quit(); } }
  ]);
}

function refreshTray() { if (tray) tray.setContextMenu(buildMenu()); }

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  tray.setToolTip(NAME + ' — clic para preguntarle a Claude');
  tray.on('click', () => toggleChat());
  refreshTray();
}

// ---------- arranque ----------
app.whenReady().then(() => {
  loadSettings();
  app.userAgentFallback = chromeUA();
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createPet();
  createTray();
  globalShortcut.register(HOTKEY, () => toggleChat());
  setTimeout(ensureChat, 1500);   // precarga claude.ai para que el primer clic sea instantáneo
  pollMusic();

  const relocate = () => {
    const wa = petWorkArea();
    petX = clamp(petX, petMinX(wa), petMaxX(wa));
    if (!floating) petY = floorY(wa);
    placePet();
  };
  screen.on('display-metrics-changed', relocate);
  screen.on('display-removed', relocate);
});

app.on('before-quit', () => { quitting = true; music.dispose(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* la mascota vive en la bandeja */ });

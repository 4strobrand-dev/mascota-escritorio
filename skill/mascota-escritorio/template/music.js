// Control de la app de Spotify instalada en la computadora.
// Windows: lee el título de la ventana de Spotify y envía teclas multimedia.
// macOS: AppleScript sobre Spotify.  Linux: playerctl (si está instalado).
const { spawn, execFile } = require('child_process');
const { shell } = require('electron');
const PET_ID = (require('./pet.config.js').id || 'pet').replace(/[^a-z0-9-]/gi, '');

const run = (cmd, args) => new Promise(res => {
  execFile(cmd, args, { timeout: 4000, windowsHide: true }, (err, out) => res(err ? null : String(out).trim()));
});

// ---------- Windows: control multimedia del sistema (SMTC) ----------
// Un script de PowerShell queda abierto y responde comandos por stdin:
// lee canción/artista/estado desde los controles multimedia de Windows y,
// para los botones, usa la sesión de Spotify o teclas multimedia reales.
const os = require('os');
const fs = require('fs');
const path = require('path');

const PS_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -Name K -Namespace PetKeys -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
function Key([byte]$vk) {
  [PetKeys.K]::keybd_event($vk, 0, 1, [UIntPtr]::Zero)
  [PetKeys.K]::keybd_event($vk, 0, 3, [UIntPtr]::Zero)
}
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class PetFs {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
  [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO mi);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("shell32.dll")] static extern int SHQueryUserNotificationState(out int state);
  static bool dpi = false;
  public static string Check(uint selfPid) {
    if (!dpi) { try { SetProcessDPIAware(); } catch { } dpi = true; }
    IntPtr h = GetForegroundWindow();
    if (h == IntPtr.Zero) return "0";
    uint pid; GetWindowThreadProcessId(h, out pid);
    if (pid == selfPid) return "0";
    StringBuilder sb = new StringBuilder(256);
    GetClassName(h, sb, 256);
    string c = sb.ToString();
    if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd") return "0";
    MONITORINFO mi = new MONITORINFO();
    mi.cbSize = Marshal.SizeOf(typeof(MONITORINFO));
    if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref mi)) return "0";
    string mon = mi.rcMonitor.Left + "|" + mi.rcMonitor.Top + "|" + mi.rcMonitor.Right + "|" + mi.rcMonitor.Bottom;
    int q;
    if (SHQueryUserNotificationState(out q) == 0 && (q == 3 || q == 4)) return "1|" + mon;   // juego exclusivo / presentación
    RECT r;
    if (!GetWindowRect(h, out r)) return "0";
    if (r.Left <= mi.rcMonitor.Left && r.Top <= mi.rcMonitor.Top && r.Right >= mi.rcMonitor.Right && r.Bottom >= mi.rcMonitor.Bottom)
      return "1|" + mon;
    return "0";
  }
}
'@
} catch {}
$script:smtc = $false
$script:mgr = $null
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $script:asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + `1'
  })[0]
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
  $script:smtc = $true
} catch { $script:smtc = $false }

function Await($op, [Type]$type) {
  $t = $script:asTaskGeneric.MakeGenericMethod($type).Invoke($null, @($op))
  $null = $t.Wait(3000)
  return $t.Result
}

function Get-SpotifySession {
  if (-not $script:smtc) { return $null }
  try {
    if (-not $script:mgr) {
      $script:mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
    }
    return $script:mgr.GetSessions() | Where-Object { $_.SourceAppUserModelId -like '*spotify*' } | Select-Object -First 1
  } catch { return $null }
}

function Get-State {
  $r = [ordered]@{ running = $false; playing = $false; title = ''; artist = ''; src = '' }
  $procs = Get-Process -Name Spotify -ErrorAction SilentlyContinue
  $s = Get-SpotifySession
  if (-not $procs -and -not $s) { return $r }
  $r.running = $true
  if ($s) {
    try {
      $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
      $r.title = [string]$p.Title
      $r.artist = [string]$p.Artist
      $r.playing = ($s.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing')
      $r.src = 'smtc'
      if ($r.title) { return $r }
    } catch {}
  }
  $w = $procs | Where-Object { $_.MainWindowTitle } | Select-Object -First 1
  if ($w) {
    $t = [string]$w.MainWindowTitle
    if ($t -notmatch '^Spotify( Free| Premium)?$') {
      $i = $t.IndexOf(' - ')
      if ($i -gt 0) { $r.artist = $t.Substring(0, $i); $r.title = $t.Substring($i + 3) } else { $r.title = $t }
      $r.playing = $true
    }
    $r.src = 'title'
  }
  return $r
}

function Send-Media([string]$action) {
  $s = Get-SpotifySession
  if ($s) {
    try {
      switch ($action) {
        'toggle' { $null = $s.TryTogglePlayPauseAsync() }
        'next'   { $null = $s.TrySkipNextAsync() }
        'prev'   { $null = $s.TrySkipPreviousAsync() }
      }
      return
    } catch {}
  }
  switch ($action) {
    'toggle' { Key 0xB3 }
    'next'   { Key 0xB0 }
    'prev'   { Key 0xB1 }
  }
}

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $cmd = $line.Trim()
  try {
    if ($cmd -eq 'state') { Get-State | ConvertTo-Json -Compress }
    elseif ($cmd -in @('toggle', 'next', 'prev')) { Send-Media $cmd; 'ok' }
    elseif ($cmd.StartsWith('fs ')) { [PetFs]::Check([uint32]$cmd.Substring(3)) }
  } catch { '{}' }
  '@@END@@'
}
`;

let ps = null, buf = '';
const queue = [];
function psCall(cmd) {
  return new Promise(resolve => {
    if (!ps) {
      try {
        const file = path.join(os.tmpdir(), PET_ID + '-media.ps1');
        fs.writeFileSync(file, '﻿' + PS_SCRIPT, 'utf8');
        ps = spawn('powershell.exe', ['-NoProfile', '-NoLogo', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file],
          { windowsHide: true });
      } catch { ps = null; return resolve(''); }
      ps.stdout.setEncoding('utf8');
      ps.stdout.on('data', d => {
        buf += d;
        let i;
        while ((i = buf.indexOf('@@END@@')) >= 0) {
          const out = buf.slice(0, i).trim();
          buf = buf.slice(i + 7);
          const q = queue.shift();
          if (q) { clearTimeout(q.timer); q.resolve(out); }
        }
      });
      ps.on('exit', () => { ps = null; buf = ''; queue.splice(0).forEach(q => q.resolve('')); });
      ps.on('error', () => { ps = null; queue.splice(0).forEach(q => q.resolve('')); });
    }
    const q = { resolve, timer: null };
    q.timer = setTimeout(() => {          // si se cuelga, se reinicia
      const idx = queue.indexOf(q);
      if (idx >= 0) queue.splice(idx, 1);
      resolve('');
      dispose();
    }, 8000);
    queue.push(q);
    ps.stdin.write(cmd + '\n');
  });
}

async function stateWindows() {
  const out = await psCall('state');
  try {
    const j = JSON.parse(out.split('\n').filter(l => l.trim().startsWith('{')).pop() || '{}');
    return { running: !!j.running, playing: !!j.playing, title: j.title || '', artist: j.artist || '' };
  } catch {
    return { running: false, playing: false, title: '', artist: '' };
  }
}

// ---------- macOS ----------
const MAC_STATE = 'tell application "Spotify"\n try\n return (player state as string) & "|||" & (name of current track) & "|||" & (artist of current track)\n on error\n return "stopped|||"\n end try\nend tell';
async function stateMac() {
  const pid = await run('pgrep', ['-x', 'Spotify']);
  if (!pid) return { running: false, playing: false, title: '', artist: '' };
  const out = await run('osascript', ['-e', MAC_STATE]);
  if (!out) return { running: true, playing: false, title: '', artist: '' };
  const [st, title = '', artist = ''] = out.split('|||');
  return { running: true, playing: st === 'playing', title, artist };
}
const MAC_CMD = { toggle: 'playpause', next: 'next track', prev: 'previous track' };

// ---------- Linux ----------
async function stateLinux() {
  const st = await run('playerctl', ['-p', 'spotify', 'status']);
  if (!st) return { running: false, playing: false, title: '', artist: '' };
  const meta = await run('playerctl', ['-p', 'spotify', 'metadata', '--format', '{{title}}|||{{artist}}']) || '';
  const [title = '', artist = ''] = meta.split('|||');
  return { running: true, playing: st === 'Playing', title, artist };
}
const LINUX_CMD = { toggle: 'play-pause', next: 'next', prev: 'previous' };

// ---------- pantalla completa ----------
// Devuelve { full, rect: [left, top, right, bottom] } en píxeles reales de pantalla.
const MAC_FS = `
ObjC.import('AppKit');
ObjC.import('CoreGraphics');
function run(argv) {
  const self = parseInt(argv[0], 10);
  const app = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  if (!app || app.isNil()) return '0';
  const pid = app.processIdentifier;
  if (pid === self) return '0';
  const wins = ObjC.deepUnwrap(ObjC.castRefToObject($.CGWindowListCopyWindowInfo(17, 0))) || [];
  const screens = $.NSScreen.screens.js.map(s => s.frame);
  for (const w of wins) {
    if (w.kCGWindowOwnerPID !== pid || w.kCGWindowLayer !== 0 || !w.kCGWindowBounds) continue;
    const b = w.kCGWindowBounds;
    for (const f of screens) {
      if (b.Width >= f.size.width && b.Height >= f.size.height)
        return '1|' + b.X + '|' + b.Y + '|' + (b.X + b.Width) + '|' + (b.Y + b.Height);
    }
  }
  return '0';
}`;
let macFsFile = null;
async function fullscreen() {
  let out = null;
  try {
    if (process.platform === 'win32') {
      out = await psCall('fs ' + process.pid);
    } else if (process.platform === 'darwin') {
      if (!macFsFile) {
        macFsFile = path.join(os.tmpdir(), PET_ID + '-fs.js');
        fs.writeFileSync(macFsFile, MAC_FS, 'utf8');
      }
      out = await run('osascript', ['-l', 'JavaScript', macFsFile, String(process.pid)]);
    }
  } catch { out = null; }
  const line = (out || '').split('\n').map(l => l.trim()).filter(Boolean).pop() || '0';
  if (!line.startsWith('1|')) return { full: false };
  const r = line.split('|').slice(1).map(Number);
  return r.length === 4 && r.every(Number.isFinite) ? { full: true, rect: r } : { full: false };
}

async function getState() {
  try {
    if (process.platform === 'win32') return await stateWindows();
    if (process.platform === 'darwin') return await stateMac();
    return await stateLinux();
  } catch {
    return { running: false, playing: false, title: '', artist: '' };
  }
}

async function control(action) {
  if (process.platform === 'win32') {
    if (['toggle', 'next', 'prev'].includes(action)) await psCall(action);
  } else if (process.platform === 'darwin') {
    const c = MAC_CMD[action];
    if (c) await run('osascript', ['-e', `tell application "Spotify" to ${c}`]);
  } else {
    const c = LINUX_CMD[action];
    if (c) await run('playerctl', ['-p', 'spotify', c]);
  }
}

async function openSpotify() {
  try { await shell.openExternal('spotify:'); }
  catch { await shell.openExternal('https://open.spotify.com'); }
}

function dispose() { if (ps) { try { ps.kill(); } catch {} ps = null; } }

module.exports = { getState, control, openSpotify, fullscreen, dispose };

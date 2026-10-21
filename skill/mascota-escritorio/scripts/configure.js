// Sincroniza package.json con pet.config.js (nombre, id, appId, autor, descripción).
// Uso: node configure.js <carpeta-del-proyecto>
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || '.');
const cfg = require(path.join(dir, 'pet.config.js'));
const pkgFile = path.join(dir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
const id = String(cfg.id || 'mascota').toLowerCase().replace(/[^a-z0-9-]/g, '-');
const product = String(cfg.name || 'Mascota').replace(/[\\/:*?"<>|]/g, '').trim() || 'Mascota';
pkg.name = id;
pkg.productName = product;
pkg.description = cfg.description || `${product}: mascota de escritorio`;
pkg.author = cfg.author || product;
pkg.version = cfg.version || pkg.version || '1.0.0';
pkg.build.appId = cfg.appId || `com.mascota.${id}`;
pkg.build.productName = product;
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
console.log(`package.json listo: ${product} (${pkg.build.appId}) v${pkg.version}`);

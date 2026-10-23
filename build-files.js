// Membuat files.json otomatis dari isi folder "files/".
// Cara pakai: taruh file di files/<Nama Kategori>/ lalu jalankan:  node build-files.js
// Nama folder = nama tab. Nama file = judul (bisa diubah di files/keterangan.json).
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'files');
let meta = {};
try { meta = JSON.parse(fs.readFileSync(path.join(dir, 'keterangan.json'), 'utf8')); } catch (e) {}
const pretty = n => n.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const out = [];
function add(cat, file) {
  const key = cat === 'Lainnya' ? file : cat + '/' + file;
  const m = meta[key] || {};
  out.push({
    category: cat,
    title: m.title || pretty(file),
    desc: m.desc || '',
    src: 'files/' + (cat === 'Lainnya' ? '' : cat + '/') + file
  });
}
for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (e.name.startsWith('.') || e.name === 'keterangan.json') continue;
  if (e.isDirectory()) fs.readdirSync(path.join(dir, e.name)).filter(f => !f.startsWith('.')).sort().forEach(f => add(e.name, f));
  else add('Lainnya', e.name);
}
fs.writeFileSync(path.join(__dirname, 'files.json'), JSON.stringify(out, null, 2));
console.log(out.length + ' file ditulis ke files.json');

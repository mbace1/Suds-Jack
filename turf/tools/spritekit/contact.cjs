// Lay keyed assets out on MAGENTA, the way the owner's own sheets arrive.
//   node contact.cjs <out.png> <cols> <cellW> <cellH> <dir-or-file>... [--scale props.json]
//
// --scale draws every asset at its TRUE RELATIVE SIZE instead of filling its
// cell. It matters more than it sounds: fitclip normalises each asset to its
// own 192x288 cell for fidelity, so a fire hydrant and a burnt-out car are
// identical pixel sizes on disk and a sheet without this makes them look it.
// props.json carries heightM per object and the renderer scales from it.
//
// The shipped asset is keyed to transparency, because that is what a game
// needs. The sheet is magenta, because that is the working format this project
// hands art around in — every reference the owner has sent is a magenta sheet,
// and a set shown on some other background cannot be compared with them.
// Both, therefore: transparent PNGs beside a magenta contact sheet.
const fs = require('fs'); const path = require('path');
const { load, blank, save } = require(path.join(__dirname, 'img.cjs'));

const MAGENTA = '#ff00ff';
const PAD = 24;

(async () => {
  const si = process.argv.indexOf('--scale');
  const scaleFile = si > -1 ? process.argv[si + 1] : null;
  const meta = scaleFile ? JSON.parse(fs.readFileSync(scaleFile, 'utf8')) : null;
  const argv = process.argv.slice(2).filter((a, i, arr) => a !== '--scale' && arr[i - 1] !== '--scale');
  const [out, colsArg, cwArg, chArg, ...args] = argv;
  if (!args.length) { console.log('usage: node contact.cjs <out.png> <cols> <cellW> <cellH> <dir-or-file>...'); process.exit(1); }
  const cols = Number(colsArg) || 4, CW = Number(cwArg) || 320, CH = Number(chArg) || 320;
  const files = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) for (const f of fs.readdirSync(a).sort())
      { if (f.endsWith('.png') && !f.startsWith('_')) files.push(path.join(a, f)); }
    else files.push(a);
  }
  const rows = Math.ceil(files.length / cols);
  const sheet = blank(cols * CW + PAD * 2, rows * CH + PAD * 2);
  sheet.ctx.fillStyle = MAGENTA;
  sheet.ctx.fillRect(0, 0, sheet.W, sheet.H);

  for (let i = 0; i < files.length; i++) {
    const o = await load(files[i]);
    const name = path.basename(files[i]).replace(/\.png$/, '');
    // contain, never crop: an asset that does not fit is shrunk, not cut
    let s = Math.min((CW - 16) / o.W, (CH - 16) / o.H, 1);
    if (meta && meta.props[name]) {
      // true relative size: the tallest object in the set fills the cell and
      // everything else is drawn in proportion to its real height
      const hs = files.map(f => (meta.props[path.basename(f).replace(/\.png$/, '')] || {}).heightM || 1);
      const tallest = Math.max(...hs);
      s = ((CH - 16) / o.H) * (meta.props[name].heightM / tallest);
    }
    const w = Math.round(o.W * s), h = Math.round(o.H * s);
    const cx = PAD + (i % cols) * CW + (CW - w) / 2;
    // bottom-aligned, so the set reads as objects standing on one floor
    const cy = PAD + Math.floor(i / cols) * CH + (CH - h) - 8;
    sheet.ctx.drawImage(o.canvas, cx, cy, w, h);
  }
  save(sheet, out);
  console.log(`→ ${out}  ${sheet.W}x${sheet.H}  ${files.length} assets on magenta`);
})();

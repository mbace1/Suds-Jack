// The glyph atlas: every character the city can be drawn in, rasterised once at exactly the cell size so a glyph lands
// on the screen pixel for pixel (no resampling: nearest filtering, no mipmaps). ASCII for the city itself, half-width
// katakana for the signs (the narrow ones, made for a monospace cell), and the block shades for big lettering.

import * as THREE from 'three';

export const RAMP = ' .:-=+*#%@';                                   // dark → bright
export const EDGES = '_/|\\';                                         // a line's angle in 45° buckets from horizontal
const KANA = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝﾞﾟ';
const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');
// the ramp first and the edge strokes next, so the shader picks either by arithmetic, then everything else once
export const CHARS = [...new Set([...RAMP, ...EDGES, ...ASCII, ...KANA, '█', '▓', '▒', '░', '·', '¦'])];
const INDEX = new Map(CHARS.map((c, i) => [c, i]));
export const glyph = (c) => INDEX.get(c) ?? INDEX.get('?');

/** draw the atlas: COLS glyphs a row, each cw × ch px, white on black (the shader reads coverage from red) */
export function atlas(cw, ch, family = "'GC Mono', 'DejaVu Sans Mono', monospace", kanaFamily = "'IPAGothic', 'IPAPGothic', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif") {
  const COLS = 16, ROWS = Math.ceil(CHARS.length / COLS);
  const c = document.createElement('canvas'); c.width = COLS * cw; c.height = ROWS * ch;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  CHARS.forEach((ch0, i) => {
    const x = (i % COLS) * cw, y = Math.floor(i / COLS) * ch;
    if ('█▓▒░'.includes(ch0)) {                                       // the shades are drawn, not typeset: they must tile edge to edge
      const k = { '█': 1, '▓': 0.75, '▒': 0.5, '░': 0.25 }[ch0];
      for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
        const keep = k === 1 || (k === 0.75 ? (px + py) % 4 !== 0 : k === 0.5 ? (px + py) % 2 === 0 : (px % 2 === 0 && py % 2 === 0));
        if (keep) g.fillRect(x + px, y + py, 1, 1);
      }
      return;
    }
    const kana = ch0.charCodeAt(0) >= 0xff00;
    g.font = `bold ${Math.round(ch * (kana ? 0.78 : 0.86))}px ${kana ? kanaFamily : family}`;
    const w = g.measureText(ch0).width, sx = w > cw * 0.98 ? cw * 0.98 / w : 1;
    g.save(); g.translate(x + cw / 2, y + ch / 2 + ch * 0.04); g.scale(sx, 1); g.fillText(ch0, 0, 0); g.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.flipY = false; tex.colorSpace = THREE.NoColorSpace;
  return { tex, canvas: c, cols: COLS, rows: ROWS };
}

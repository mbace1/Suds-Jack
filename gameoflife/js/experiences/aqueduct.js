// The Stone River — a visual story about Roman aqueducts, then a rotate-the-
// stones channel puzzle. Water flows by connectivity from spring to fountain;
// partial flow is shown live so every turn of a stone gives feedback.

import { PixelScreen } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

// dirs: 0=N 1=E 2=S 3=W
const OPP = d => (d + 2) % 4;
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

// base connection sets, rotated by tile.rot
const CONNS = { S: [1, 3], C: [0, 1] };

// levels use solved orientations; rotatable tiles get scrambled on entry.
// cell codes: 'S<rot>' straight, 'C<rot>' corner, 'X<dir>' spring (emits dir),
// 'F<dir>' fountain (accepts dir), '..' empty air between arches.
const LEVELS = [
  [
    ['X1', 'S0', 'S0', 'C2', '..'],
    ['..', '..', '..', 'S1', '..'],
    ['..', '..', '..', 'C0', 'F3'],
  ],
  [
    ['X1', 'C2', '..', '..', '..', '..'],
    ['..', 'S1', '..', '..', '..', '..'],
    ['..', 'C0', 'S0', 'C2', '..', '..'],
    ['..', '..', '..', 'C0', 'S0', 'F3'],
  ],
  [
    ['..', '..', '..', 'S0', '..', '..', '..'],
    ['X1', 'S0', 'C2', '..', '..', 'C1', '..'],
    ['..', '..', 'S1', '..', '..', '..', '..'],
    ['..', 'C3', 'C0', 'S0', 'C2', '..', '..'],
    ['..', '..', '..', '..', 'C0', 'S0', 'F3'],
  ],
];

const TILE = 20;

export const aqueduct = {
  id: 'aqueduct',
  kind: 'game',   // 70/20/10 offering mix: story / game / wisdom

  start(host, ctx) {
    const { t, audio, onComplete } = ctx;
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'screen-wrap';
    host.appendChild(wrap);
    const textEl = document.createElement('div');
    textEl.className = 'exp-text';
    host.appendChild(textEl);
    const btnRow = document.createElement('div');
    btnRow.className = 'exp-buttons';
    host.appendChild(btnRow);

    const scr = new PixelScreen(wrap, 192, 128);
    let phase = 0;              // 0..2 story, 3 puzzle, 4 outro
    let level = 0;
    let grid = null, gw = 0, gh = 0, ox = 0, oy = 0;
    let flow = new Map();       // "x,y" -> depth of water
    let solved = false;
    let fillT = 0;              // fill animation clock after solve
    let raf = 0, dead = false;

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
      return b;
    }

    // ── story panels ─────────────────────────────────────────────
    function showStory() {
      drawStory(scr, phase);
      textEl.textContent = t(`aq.p${phase + 1}`);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase++;
        if (phase < 3) showStory();
        else beginLevel(0);
      });
    }

    // ── puzzle ───────────────────────────────────────────────────
    function parse(rows) {
      gh = rows.length; gw = rows[0].length;
      grid = rows.map(r => r.map(code => {
        if (code === '..') return null;
        const k = code[0], n = +code[1];
        if (k === 'X') return { k, dir: n };
        if (k === 'F') return { k, dir: n };
        return { k, rot: n };
      }));
      // scramble rotatable tiles, then make sure it isn't accidentally solved
      for (const row of grid) for (const c of row)
        if (c && (c.k === 'S' || c.k === 'C')) c.rot = Math.floor(Math.random() * 4);
      computeFlow();
      if (solved) {
        outer: for (const row of grid) for (const c of row)
          if (c && (c.k === 'S' || c.k === 'C')) { c.rot = (c.rot + 1) % 4; break outer; }
        computeFlow();
      }
      ox = Math.floor((scr.w - gw * TILE) / 2);
      oy = Math.floor((scr.h - 14 - gh * TILE) / 2);
    }

    function connsOf(c) {
      if (!c) return [];
      if (c.k === 'X' || c.k === 'F') return [c.dir];
      return CONNS[c.k].map(d => (d + c.rot) % 4);
    }

    function computeFlow() {
      flow = new Map();
      solved = false;
      let sx = -1, sy = -1;
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++)
        if (grid[y][x]?.k === 'X') { sx = x; sy = y; }
      const q = [[sx, sy, 0]];
      flow.set(`${sx},${sy}`, 0);
      while (q.length) {
        const [x, y, d] = q.shift();
        for (const dir of connsOf(grid[y][x])) {
          const nx = x + DX[dir], ny = y + DY[dir];
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const n = grid[ny][nx];
          if (!n || flow.has(`${nx},${ny}`)) continue;
          if (!connsOf(n).includes(OPP(dir))) continue;
          flow.set(`${nx},${ny}`, d + 1);
          if (n.k === 'F') solved = true;
          q.push([nx, ny, d + 1]);
        }
      }
    }

    function beginLevel(i) {
      level = i;
      phase = 3;
      fillT = 0;
      parse(LEVELS[i]);
      textEl.textContent = `${t('aq.level')} ${i + 1} / ${LEVELS.length} — ${t('aq.puzzle.hint')}`;
      btnRow.innerHTML = '';
    }

    function onTap(e) {
      if (dead || phase !== 3 || solved) return;
      const p = scr.toPixel(e);
      const x = Math.floor((p.x - ox) / TILE), y = Math.floor((p.y - oy) / TILE);
      if (x < 0 || y < 0 || x >= gw || y >= gh) return;
      const c = grid[y][x];
      if (!c || c.k === 'X' || c.k === 'F') return;
      c.rot = (c.rot + 1) % 4;
      audio.plink();
      computeFlow();
      if (solved) {
        audio.water();
        textEl.textContent = t('aq.flow');
        setTimeout(() => {
          if (dead) return;
          audio.chime();
          if (level + 1 < LEVELS.length) beginLevel(level + 1);
          else showOutro();
        }, 1600);
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    // ── outro ────────────────────────────────────────────────────
    function showOutro() {
      phase = 4;
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('aq.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('aq.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    function drawPuzzle(dt) {
      if (solved) fillT += dt * 6;   // tiles-per-second fill speed
      scr.bands(0, 0, scr.w, 60, [PAL.SKY_DAY_TOP, '#93bfdd', '#a9cde2', PAL.SKY_DAY_LOW]);
      scr.disc(168, 17, 9, PAL.EMBER);                 // warm halo
      scr.disc(168, 16, 8, PAL.SUN, PAL.EMBER);
      scr.px(0, 60, scr.w, scr.h - 60, PAL.MOSS);      // valley floor under the arches
      scr.px(0, 104, scr.w, 24, PAL.MOSS_DEEP);
      // distant hills, spring side higher than city side: water walks downhill
      scr.px(0, 44, 80, 20, PAL.MOSS_DEEP);
      scr.px(60, 52, 132, 14, PAL.MOSS);
      // arches under the channel row
      const base = oy + gh * TILE;
      scr.px(ox - 4, base, gw * TILE + 8, 4, PAL.STONE_DARK);
      for (let i = 0; i < gw; i++) {
        scr.px(ox + i * TILE + 2, base + 4, 4, scr.h - base - 4, PAL.STONE);
        scr.px(ox + i * TILE + 14, base + 4, 4, scr.h - base - 4, PAL.STONE_DARK);
      }
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) drawTile(x, y);
      // fountain sparkle once the water arrives
      if (solved && fillT > maxDepth()) {
        for (let i = 0; i < 6; i++) {
          const fx = ox + gw * TILE - TILE / 2 + Math.sin(fillT * 3 + i) * 6;
          const fy = oy + (gh - 1) * TILE - 2 - ((fillT * 10 + i * 4) % 14);
          scr.px(fx, fy, 2, 2, PAL.FOAM);
        }
      }
    }

    function maxDepth() {
      let m = 0; for (const d of flow.values()) m = Math.max(m, d); return m;
    }

    function drawTile(x, y) {
      const c = grid[y][x];
      if (!c) return;
      const px0 = ox + x * TILE, py0 = oy + y * TILE;
      scr.px(px0, py0, TILE, TILE, PAL.STONE);
      scr.px(px0, py0, TILE, 1, '#c4b69c');
      scr.px(px0, py0 + TILE - 1, TILE, 1, PAL.STONE_LINE);
      scr.px(px0, py0, 1, TILE, '#c4b69c');
      scr.px(px0 + TILE - 1, py0, 1, TILE, PAL.STONE_LINE);
      // partial flow shows live while turning stones; on solve the water
      // re-surges from the spring, filling tiles in BFS order via fillT
      const wet = flow.has(`${x},${y}`) && (!solved || flow.get(`${x},${y}`) <= fillT);
      const grooveCol = wet ? PAL.WATER : PAL.GROOVE;
      const mid = TILE / 2, gwid = 6;
      for (const d of connsOf(c)) {
        if (d === 0) scr.px(px0 + mid - gwid / 2, py0, gwid, mid, grooveCol);
        if (d === 2) scr.px(px0 + mid - gwid / 2, py0 + mid, gwid, mid, grooveCol);
        if (d === 3) scr.px(px0, py0 + mid - gwid / 2, mid, gwid, grooveCol);
        if (d === 1) scr.px(px0 + mid, py0 + mid - gwid / 2, mid, gwid, grooveCol);
      }
      scr.px(px0 + mid - gwid / 2, py0 + mid - gwid / 2, gwid, gwid, grooveCol);
      if (c.k === 'X') { // spring: mossy block
        scr.px(px0 + 2, py0 + 2, 6, 6, PAL.MOSS);
        scr.px(px0 + 3, py0 + TILE - 8, 5, 5, PAL.MOSS_DEEP);
      }
      if (c.k === 'F') { // fountain: gold basin marker
        scr.px(px0 + TILE - 8, py0 + 2, 6, 6, PAL.GOLD);
        scr.px(px0 + TILE - 7, py0 + TILE - 7, 5, 5, PAL.GOLD);
      }
    }

    let last = performance.now();
    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase === 3) drawPuzzle(dt);
      else if (phase < 3) drawStory(scr, phase);
      else drawStory(scr, 2); // outro keeps the arches on screen
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    showStory();

    return {
      destroy() {
        dead = true;
        cancelAnimationFrame(raf);
        scr.destroy();
        host.innerHTML = '';
      },
    };
  },
};

// three static illustrations for the story panels
function drawStory(scr, panel) {
  if (panel === 0) {
    // thirsty city under a warm sky, springs in the far hills
    scr.bands(0, 0, scr.w, 70, [PAL.SKY_DAWN_TOP, '#6b5a78', '#b07a70', PAL.SKY_DAWN_LOW]);
    scr.disc(30, 22, 10, PAL.EMBER); scr.disc(30, 22, 9, PAL.SUN, PAL.EMBER);
    scr.px(0, 58, 90, 14, PAL.MOSS_DEEP);
    scr.px(20, 52, 40, 8, PAL.MOSS);
    scr.px(34, 50, 4, 6, PAL.FOAM);           // the spring, small and far
    scr.px(0, 70, scr.w, 58, PAL.EARTH);
    for (let i = 0; i < 9; i++) {              // the city, close and crowded
      const h = 18 + ((i * 37) % 26);
      scr.px(96 + i * 10, 128 - h, 9, h, i % 2 ? PAL.STONE : PAL.STONE_DARK);
      scr.px(98 + i * 10, 128 - h + 4, 2, 2, PAL.SUN);
    }
  } else if (panel === 1) {
    // a surveyor reading the slope
    scr.bands(0, 0, scr.w, 64, [PAL.SKY_DAY_TOP, '#93bfdd', PAL.SKY_DAY_LOW]);
    scr.px(0, 40, scr.w, 88, PAL.MOSS_DEEP);
    for (let x = 0; x < scr.w; x += 2) {       // one long descending slope
      const y = 44 + x * 0.32;
      scr.px(x, y, 2, scr.h - y, PAL.MOSS);
    }
    scr.px(38, 42, 4, 12, PAL.BARK);           // groma staff
    scr.px(34, 40, 12, 2, PAL.BARK);
    scr.px(30, 54, 6, 10, PAL.INK);            // the surveyor, small on the land
    scr.px(31, 50, 4, 4, '#d8b48f');
    scr.px(120, 84, 6, 10, PAL.INK);           // assistant downslope
    scr.px(121, 80, 4, 4, '#d8b48f');
  } else {
    // the finished aqueduct striding across a valley
    scr.bands(0, 0, scr.w, 78, [PAL.SKY_DAY_TOP, '#93bfdd', '#a9cde2', PAL.SKY_DAY_LOW]);
    scr.disc(160, 18, 9, PAL.EMBER); scr.disc(160, 18, 8, PAL.SUN, PAL.EMBER);
    scr.px(0, 66, scr.w, 62, PAL.MOSS);
    scr.px(0, 100, scr.w, 28, PAL.MOSS_DEEP);
    scr.px(0, 44, scr.w, 6, PAL.STONE_DARK);   // channel
    scr.px(0, 42, scr.w, 2, PAL.WATER);        // water riding the top
    for (let i = 0; i < 8; i++) {              // arch piers
      scr.px(6 + i * 24, 50, 8, 78, PAL.STONE);
      scr.px(12 + i * 24, 50, 2, 78, PAL.STONE_DARK);
      scr.disc(19 + i * 24, 62, 3, PAL.SKY_DAY_LOW); // arch openings (suggested)
    }
    scr.px(80, 108, 3, 8, PAL.WATER);          // a leak feeding a small stream
    scr.px(76, 116, 40, 3, PAL.WATER);
  }
}

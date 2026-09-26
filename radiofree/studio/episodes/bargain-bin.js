// THE BARGAIN BIN — tech desk, 26.09.2026.
//
// The event is real: a Chinese AI lab known for the cheapest models on the
// market raised its API prices by 2.3 to 4.5 times last month, demand held,
// its annualised revenue run rate went from under $500 million to about
// $1 billion with an 82.9% gross margin on the API, and it now plans to raise
// about $7.5 billion. The company is invented and audibly so, per EDITORIAL.md:
// real events, invented names, nobody real quoted.
//
// A shot is { dur, cap, capAt, draw(ctx, lt, dur), sfx: [[lt, name]], shake }.
// `cap` marks emphasis with *asterisks*; the film draws the caption card, the
// wipes between shots and the camera, so a shot only builds its set.

import { W, H, PAL, TAU, sheet, wavy, round, rays, eob, eout, ease, spring, clamp, lerp, rng } from '../paper.js';
import { jar, tag, stampMark, stamp, person, door, tumbleweed, coins, pie, balloon, chain, padlock, toko, awning } from '../props.js';

export const meta = {
  id: 'bargain-bin',
  title: 'The Bargain Bin',
  desk: 'TECH DESK · 26.09.2026',
  sources: [
    'https://thenextweb.com/news/deepseek-revenue-run-rate-1bn',
    'https://www.pymnts.com/news/artificial-intelligence/2026/deepseek-doubles-annual-revenue-run-rate-to-1-billion-ahead-of-ipo/',
  ],
};

// ── sets shared between shots ────────────────────────────────────────────
function shopWall(ctx, t) {
  sheet(ctx, (g) => {
    g.fillStyle = PAL.wall; g.fillRect(0, 0, W, H);
    g.fillStyle = PAL.wallD; for (let x = 0; x < W; x += 90) g.fillRect(x, 0, 45, H);   // wallpaper
  }, { lift: 0, tex: 0.6 });
}
function shelfSet(ctx, t, tags, marks = []) {
  shopWall(ctx, t);
  // the banner: bunting and a clearance sign, swinging on two strings
  sheet(ctx, (g) => {
    g.strokeStyle = PAL.inkSoft; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-20, 150); g.quadraticCurveTo(540, 250, 1100, 150); g.stroke();
    for (let i = 0; i < 12; i++) {
      const x = 20 + i * 92, y = 150 + Math.sin((x / 1080) * Math.PI) * 50;
      g.fillStyle = [PAL.toko, PAL.sun, PAL.mint, PAL.sky][i % 4];
      g.beginPath(); g.moveTo(x - 34, y); g.lineTo(x + 34, y); g.lineTo(x, y + 70 + Math.sin(t * 3 + i) * 6); g.fill();
    }
    const a = Math.sin(t * 1.6) * 0.03;
    g.save(); g.translate(540, 360); g.rotate(a);
    g.fillStyle = PAL.red; round(g, -420, 0, 840, 250, 26); g.fill();
    g.fillStyle = PAL.card; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '112px Anton'; g.fillText('CLEARANCE!', 0, 92);
    g.font = '44px "Archivo Black"'; g.fillText('ALL THINKING MUST GO', 0, 190);
    g.restore();
  }, { lift: 20 });
  // the shelf board and its brackets
  sheet(ctx, (g) => {
    g.fillStyle = PAL.woodD; g.fillRect(140, 1130, 40, 90); g.fillRect(900, 1130, 40, 90);
    g.fillStyle = PAL.wood; g.fillRect(40, 1100, 1000, 44);
  }, { lift: 18 });
  // three jars and their tags
  const xs = [220, 540, 860];
  sheet(ctx, (g) => xs.forEach((x, i) => jar(g, x, 1100, 1.25, t + i, { glow: 0.3 })), { lift: 14 });
  sheet(ctx, (g) => xs.forEach((x, i) => {
    const a = tag(g, x, 840, 1.15, t, tags[i], { color: i === 1 ? PAL.sun : PAL.card });
    // a stamp lands on the tag's face, so it swings with it
    if (marks[i] > 0) {
      g.save(); g.translate(x, 840); g.rotate(a); stampMark(g, 0, 46 * 1.15 + 54 * 1.15, 0.72, marks.text[i], marks[i]); g.restore();
    }
  }), { lift: 10 });
}
function shopFloor(ctx, t) {
  shopWall(ctx, t);
  sheet(ctx, (g) => {
    g.fillStyle = '#c98f63'; g.fillRect(0, 1420, W, H - 1420);
    g.fillStyle = '#b77e55'; for (let i = 0; i < 12; i++) g.fillRect(0, 1440 + i * 44, W, 6);
  }, { lift: 8 });
}
const CUSTOMERS = [
  { x: 110, body: PAL.blue, hair: PAL.ink, skin: '#f2c3a0' },
  { x: 280, body: PAL.violet, hair: '#7a3b1e', skin: '#c98a62' },
  { x: 450, body: PAL.mint, hair: PAL.gold, skin: '#f7d2b5' },
  { x: 620, body: PAL.coral, hair: PAL.ink, skin: '#8d5a3b' },
];

// ── the shots ─────────────────────────────────────────────────────────────
export const shots = [
  { // 1 — title
    dur: 3.4,
    sfx: [[0.05, 'ding'], [0.9, 'pop']],
    draw(ctx, t) {
      shopWall(ctx, t);
      sheet(ctx, (g) => { g.fillStyle = PAL.deep; round(g, 80, 700, 920, 780, 40); g.fill(); }, { lift: 22 });  // the window
      sheet(ctx, (g) => { [260, 540, 820].forEach((x, i) => jar(g, x, 1400, 1.0, t + i)); }, { lift: 12 });
      sheet(ctx, (g) => { ['CHEAP', '¢¢¢', 'SALE!'].forEach((s, i) => tag(g, 260 + i * 280, 1020, 1, t, s, { color: i === 1 ? PAL.sun : PAL.card })); }, { lift: 8 });
      const k = spring(t / 1.2);
      sheet(ctx, (g) => { g.save(); g.translate(0, (1 - k) * -400); awning(g, 360, t, 'BARGAIN BIN INTELLIGENCE CO.'); g.restore(); }, { lift: 24 });
      // the title, stacked card letters
      const p = eob((t - 0.8) / 0.7);
      if (p > 0) sheet(ctx, (g) => {
        g.save(); g.translate(540, 1700); g.rotate(-0.04); g.scale(p, p);
        g.fillStyle = PAL.toko; round(g, -470, -150, 940, 250, 26); g.fill();
        g.fillStyle = PAL.card; g.font = '150px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('THE BARGAIN BIN', 0, -22);
        g.restore();
      }, { lift: 28 });
    },
  },
  { // 2 — what it sold
    dur: 5.2,
    cap: 'Bargain Bin Intelligence Co. sold the *cheapest* thinking on the market.',
    sfx: [[0.3, 'whoosh']],
    draw(ctx, t) { shelfSet(ctx, t, ['CHEAP', 'CHEAPER', 'CHEAPEST'], Object.assign([0, 0, 0], { text: [] })); },
  },
  { // 3 — the stamps
    dur: 5.6,
    cap: 'Then it raised its prices *2.3 to 4.5 times.*',
    sfx: [[1.25, 'stamp'], [2.95, 'stamp'], [3.3, 'ding']],
    shake: (t) => Math.max(0, 1 - Math.abs(t - 1.25) * 6) + Math.max(0, 1 - Math.abs(t - 2.95) * 6),
    draw(ctx, t) {
      const m1 = clamp((t - 1.25) * 6), m3 = clamp((t - 2.95) * 6);
      shelfSet(ctx, t, ['CHEAP', 'CHEAPER', 'CHEAPEST'], Object.assign([m1, 0, m3], { text: ['×2.3', '', '×4.5'] }));
      // the stamp: down on the left tag, up, across, down on the right one
      const d1 = t < 1.25 ? ein2((t - 0.6) / 0.65) : 1 - eout((t - 1.35) / 0.5);
      const d2 = t < 2.95 ? ein2((t - 2.3) / 0.65) : 1 - eout((t - 3.05) / 0.6);
      const x = t < 2 ? 220 : 860;
      sheet(ctx, (g) => stamp(g, x, 880, 1.1, t < 2 ? clamp(d1) : clamp(d2)), { lift: 40 });
    },
  },
  { // 4 — the exit
    dur: 5.2,
    cap: 'Customers were expected to *leave.*',
    capAt: 'top',
    sfx: [[0.9, 'creak'], [0.2, 'whoosh']],
    draw(ctx, t) {
      shopFloor(ctx, t);
      const open = ease((t - 0.9) / 1.4);
      sheet(ctx, (g) => door(g, 900, 1440, 1.25, open, t), { lift: 10 });
      const look = ease((t - 1.6) / 0.6);
      sheet(ctx, (g) => CUSTOMERS.forEach((p, i) => person(g, p.x + 20, 1700 + (i % 2) * 30, 1.3, t, { ...p, look, screen: 0.8 })), { lift: 18 });
    },
  },
  { // 5 — nobody
    dur: 4.6,
    cap: '*Nobody* left.',
    capAt: 'top',
    sfx: [[0.3, 'wind'], [2.8, 'sip']],
    draw(ctx, t) {
      shopFloor(ctx, t);
      sheet(ctx, (g) => {
        door(g, 900, 1440, 1.25, 1, t);
        // the tumbleweed crosses the doorway, outside
        g.save(); g.beginPath(); g.rect(900 - 125, 1440 - 625, 250, 625); g.clip();
        tumbleweed(g, lerp(1100, 700, (t - 0.3) / 2.6), 1440, 1, t);
        g.restore();
      }, { lift: 10 });
      sheet(ctx, (g) => CUSTOMERS.forEach((p, i) => person(g, p.x + 20, 1700 + (i % 2) * 30, 1.3, t,
        { ...p, look: lerp(1, 0, ease(t / 0.5)), screen: 0.85, sip: i === 2 ? (t - 2.6) / 1.2 : 0 })), { lift: 18 });
    },
  },
  { // 6 — the money
    dur: 6.2,
    cap: 'Revenue went from under *$500 million* to *$1 billion* a year.',
    sfx: [[0.2, 'whoosh'], ...Array.from({ length: 8 }, (_, i) => [1.4 + i * 0.16, 'clink']), [3.8, 'ding']],
    draw(ctx, t) {
      sheet(ctx, (g) => { g.fillStyle = PAL.sun; g.fillRect(0, 0, W, H); rays(g, 540, 900, 28, t * 0.08, PAL.sun, '#ffe08f'); }, { lift: 0, tex: 0.5 });
      // the floor they stand on
      sheet(ctx, (g) => { g.fillStyle = PAL.deep; g.fillRect(0, 1320, W, H); }, { lift: 10 });
      const before = 8, after = Math.round(lerp(8, 16, clamp((t - 1.4) / 1.3)));
      sheet(ctx, (g) => { coins(g, 300, 1320, 1.25, before); coins(g, 760, 1320, 1.25, after); }, { lift: 16 });
      sheet(ctx, (g) => {
        g.textAlign = 'center'; g.fillStyle = PAL.card; g.font = '56px Anton';
        g.fillText('BEFORE', 300, 1410); g.fillText('NOW', 760, 1410);
        const v = lerp(0.5, 1.0, ease((t - 1.4) / 1.3));
        const label = (txt, x, y, bg) => {
          g.font = '64px "Archivo Black"'; const w = g.measureText(txt).width + 50;
          g.fillStyle = bg; round(g, x - w / 2, y - 62, w, 84, 16); g.fill();
          g.fillStyle = PAL.card; g.fillText(txt, x, y);
        };
        label('<$500M', 300, 1320 - before * 27.5 - 70, PAL.deep);
        label('$' + (v >= 0.995 ? '1B' : Math.round(v * 1000) + 'M'), 760, 1320 - after * 27.5 - 70, PAL.toko);
      }, { lift: 6, tex: 0.2 });
      // the margin
      const k = ease((t - 2.4) / 1.2) * 0.829;
      sheet(ctx, (g) => { pie(g, 800, 420, 170, k, PAL.mint, PAL.card); }, { lift: 20 });
      sheet(ctx, (g) => {
        g.fillStyle = PAL.deep; g.textAlign = 'center'; g.font = '72px Anton';
        g.fillText((k * 100).toFixed(1) + '%', 800, 680);
        g.font = '36px "Space Grotesk"'; g.fillText('GROSS MARGIN', 800, 725);
        const x2 = eob((t - 3.6) / 0.5);
        if (x2 > 0) { g.save(); g.translate(270, 420); g.rotate(-0.12); g.scale(x2, x2);
          g.fillStyle = PAL.toko; g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.fill();
          g.fillStyle = PAL.card; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '170px Anton'; g.fillText('×2', 0, 8);
          g.restore(); }
      }, { lift: 4, tex: 0.2, alpha: 1 });
    },
  },
  { // 7 — the balloon
    dur: 5.6,
    cap: 'Next it wants *$7.5 billion.* The valuation is *also up.*',
    sfx: [[0.2, 'whoosh'], [0.6, 'inflate']],
    draw(ctx, t) {
      sheet(ctx, (g) => { g.fillStyle = '#bfe6ff'; g.fillRect(0, 0, W, H); }, { lift: 0 });
      sheet(ctx, (g) => { wavy(g, 1020, 26, 180, 0.4, '#8fd0a8'); }, { lift: 10 });
      sheet(ctx, (g) => { wavy(g, 1130, 30, 220, 2.1, '#5fb784'); }, { lift: 12 });
      // clouds
      sheet(ctx, (g) => {
        g.fillStyle = '#ffffff';
        for (const [x, y, s] of [[200, 330, 1], [820, 250, 0.8], [620, 560, 0.6]]) {
          const dx = ((t * 20 * s) % 200);
          for (const [a, b, r] of [[0, 0, 60], [60, -20, 70], [120, 0, 55]]) { g.beginPath(); g.arc(x + a * s + dx, y + b * s, r * s, 0, TAU); g.fill(); }
        }
      }, { lift: 10 });
      const r = lerp(70, 290, eout((t - 0.6) / 3.6)) + Math.sin(t * 8) * 4 * clamp((t - 0.6) * 2);
      sheet(ctx, (g) => {
        // the pump
        const pump = Math.abs(Math.sin(t * 7)) * clamp((4.2 - t) * 2);
        g.fillStyle = PAL.blue; round(g, 460, 1140, 160, 170, 20); g.fill();
        g.fillStyle = PAL.inkSoft; g.fillRect(534, 1060 + pump * 60, 12, 90); g.fillRect(470, 1050 + pump * 60, 140, 20);
        const { cx, cy } = balloon(g, 540, 1140, r, t, PAL.coral);
        g.fillStyle = PAL.card; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `${Math.round(r * 0.26)}px Anton`; g.fillText('VALUATION', cx, cy - r * 0.05);
        g.font = `${Math.round(r * 0.36)}px Anton`; g.fillText('↑', cx, cy + r * 0.34);
      }, { lift: 20 });
      sheet(ctx, (g) => tag(g, 700, 1080, 1.2, t, '$7.5B', { color: PAL.sun, swing: 0.5 }), { lift: 8 });
    },
  },
  { // 8 — the lock-in
    dur: 6.6,
    cap: 'Analysts call it *demand.* Customers call it *“we built everything on your API.”*',
    capAt: 'top',
    sfx: [[0.2, 'whoosh'], [0.7, 'chain'], [2.7, 'click']],
    draw(ctx, t) {
      shopFloor(ctx, t);
      sheet(ctx, (g) => { g.fillStyle = PAL.wood; g.fillRect(340, 1150, 400, 40); }, { lift: 14 });
      sheet(ctx, (g) => jar(g, 540, 1150, 1.3, t, { glow: 0.6 }), { lift: 18 });
      const xs = [150, 400, 680, 930];
      const k = ease((t - 0.7) / 1.6);
      sheet(ctx, (g) => xs.forEach((x, i) => chain(g, x, 1560, (x + 540) / 2, 1560 + 60, 540, 1030, k, 1)), { lift: 6, tex: 0.2 });
      sheet(ctx, (g) => padlock(g, 540, 1030 - (1 - eout((t - 2.3) / 0.4)) * 900, 1.1, clamp((t - 2.7) * 8)), { lift: 20 });
      sheet(ctx, (g) => xs.forEach((x, i) => person(g, x, 1820, 1.15, t, { ...CUSTOMERS[i], look: 0, screen: 0.9 })), { lift: 18 });
    },
    shake: (t) => Math.max(0, 1 - Math.abs(t - 2.7) * 8) * 0.6,
  },
  { // 9 — the station
    dur: 4.6,
    sfx: [[0.1, 'sting']],
    end: true,
    draw(ctx, t) {
      sheet(ctx, (g) => { g.fillStyle = PAL.toko; g.fillRect(0, 0, W, H); rays(g, 540, 820, 24, t * 0.15, PAL.toko, '#ff3a9d'); }, { lift: 0, tex: 0.4 });
      toko(ctx, 540, 820, 250, t, { rod: false, pop: eob(t / 0.6) });
      const k = eob((t - 0.5) / 0.6);
      sheet(ctx, (g) => {
        g.save(); g.translate(0, (1 - k) * 300);
        g.fillStyle = PAL.card; round(g, 110, 1200, 860, 330, 28); g.fill();
        g.fillStyle = PAL.ink; g.textAlign = 'center'; g.font = '104px Anton'; g.fillText('RADIO FREE HELSINKI', 540, 1340);
        g.fillStyle = PAL.toko; g.font = '64px "Archivo Black"'; g.fillText('TECH DESK', 540, 1440);
        g.restore();
      }, { lift: 24 });
      sheet(ctx, (g) => {
        g.fillStyle = PAL.card; g.globalAlpha = clamp((t - 1.2) * 2); g.textAlign = 'center';
        g.font = '38px "Space Grotesk"'; g.fillText('Real events · invented names · nobody real quoted', 540, 1700);
      }, { lift: 0, tex: 0 });
    },
  },
];

function ein2(k) { k = clamp(k); return k * k * k; }

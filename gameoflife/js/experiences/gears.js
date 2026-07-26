// The Bronze Gears — the Antikythera mechanism. A shoebox of corroded bronze
// from a shipwreck turned out to be a hand-cranked computer for the sky, cut
// two thousand years ago. Turn the crank; the meshed gears run the months, the
// Sun and Moon hands close on the lunar node, and the machine predicts an
// eclipse — a gold corona breaking the frame. Void-vignette bronze build.
// Revert: watch a real second hand make one full circle.

import { PixelScreen, rampDither } from '../pixel.js?v=39';
import { PAL } from '../palette.js?v=39';

const DCX = 96, DCY = 60, DR = 40;   // the front dial
const TARGET = 12;                    // cranks (lunations) until the alignment
const SUN_STEP = 20, MOON_STEP = 57;  // deg/month; both reach the node (up) at TARGET

const BRONZE = ['#3a2c14', '#6a5024', '#9a7b3e', '#c6a55e', '#e6cf94'];
const VERD = '#3f7d6e';               // verdigris patina
const SUN = PAL.GOLD_LUX, SUN_CORE = '#fff2c0';
const MOON = '#cfd8e0';

export const gears = {
  id: 'gears',
  kind: 'game',

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
    let phase = 'intro';   // intro → turn → eclipse → outro
    let turns = 0;         // completed cranks
    let spin = 0;          // eased drive angle (rad), toward turns
    let glowT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('ge.s1');
    button(t('ge.begin'), () => { phase = 'turn'; crank(); });

    function crank() {
      if (phase !== 'turn') return;
      turns++;
      audio.plink();
      btnRow.innerHTML = '';
      if (turns >= TARGET) { eclipse(); return; }
      const near = turns >= TARGET - 3;
      textEl.textContent = `${t('ge.month')} ${turns} — ${t(near ? 'ge.near' : 'ge.gain')}`;
      button(t('ge.turn'), crank);
    }

    function eclipse() {
      phase = 'eclipse';
      glowT = 0;
      audio.water();
      textEl.textContent = t('ge.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('ge.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('ge.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // hand angle in degrees; 0 = up, clockwise. Both reach 0 (the node) at TARGET
    const sunDeg = (tt) => -(TARGET - tt) * SUN_STEP;
    const moonDeg = (tt) => -(TARGET - tt) * MOON_STEP;
    const polar = (cx, cy, deg, len) => [cx + Math.sin(deg * Math.PI / 180) * len, cy - Math.cos(deg * Math.PI / 180) * len];

    // ── rendering ────────────────────────────────────────────────
    // a gear body: dithered bronze. The shading is keyed to absolute position,
    // and a disc is radially symmetric, so a spinning gear's BODY never actually
    // changes on screen — only its teeth and spokes do. So the bodies live in the
    // cached layer and only the moving parts are redrawn.
    function gearBody(cx, cy, r) {
      for (let dy = -r; dy <= r; dy++) {
        const dxm = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
        for (let dx = -dxm; dx <= dxm; dx++) {
          const d = Math.hypot(dx, dy);
          scr.px(cx + dx, cy + dy, 1, 1, rampDither(BRONZE, 0.7 - d / r * 0.5 - dx / r * 0.15, cx + dx, cy + dy));
        }
      }
      scr.disc(cx, cy, Math.max(2, r * 0.28), BRONZE[1]);   // hub
    }

    // the parts that genuinely turn
    function gear(cx, cy, r, teeth, ang, dir) {
      for (let k = 0; k < teeth; k++) {
        const a = ang * dir + k / teeth * Math.PI * 2;
        const tx = cx + Math.cos(a) * (r + 1), ty = cy + Math.sin(a) * (r + 1);
        scr.px(tx - 1, ty - 1, 2, 2, BRONZE[3]);
      }
      for (let k = 0; k < 4; k++) {                          // spokes
        const a = ang * dir + k / 4 * Math.PI * 2;
        scr.px(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, 1, 1, VERD);
      }
    }

    // the front dial ring with month ticks, and the node glyph at the top
    function dial() {
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2;
        const x = DCX + Math.cos(a) * DR, y = DCY + Math.sin(a) * DR;
        scr.px(x, y, 1, 1, i % 4 === 0 ? BRONZE[4] : BRONZE[2]);
      }
      // the dragon's node — where an eclipse can happen — marked at the top
      scr.px(DCX - 2, DCY - DR - 4, 4, 2, VERD);
      scr.px(DCX - 1, DCY - DR - 6, 2, 2, VERD);
    }

    function hand(deg, len, col, wide) {
      const [ex, ey] = polar(DCX, DCY, deg, len);
      const n = Math.max(1, Math.round(len));
      for (let i = 0; i <= n; i++) {
        const x = DCX + (ex - DCX) * i / n, y = DCY + (ey - DCY) * i / n;
        scr.px(x, y, wide ? 2 : 1, wide ? 2 : 1, col);
      }
      return [ex, ey];
    }

    function draw(now, dt) {
      const target = turns * 0.9;
      spin += (target - spin) * Math.min(1, dt * 3);
      if (phase === 'eclipse' || phase === 'outro') glowT += dt;

      // everything that does not turn: the cabinet glow, the gear bodies, the dial
      scr.cached('base', () => {
        scr.clear(PAL.VOID);
        scr.softDisc(DCX, DCY, DR + 22, '#1a1206', 22);   // warm cabinet glow
        gearBody(48, 96, 16);
        gearBody(78, 104, 11);
        gearBody(140, 98, 18);
        gearBody(150, 66, 10);
        dial();
      });

      // and the parts that do: teeth and spokes, meshing in alternate directions
      gear(48, 96, 16, 12, spin, 1);
      gear(78, 104, 11, 9, spin, -1);
      gear(140, 98, 18, 14, spin, 1);
      gear(150, 66, 10, 8, spin, -1);

      // interpolated hand positions for smooth travel between cranks
      const tt = Math.min(TARGET, spin / 0.9);
      const sd = sunDeg(tt), md = moonDeg(tt);
      const [sx, sy] = hand(sd, DR - 4, SUN, false);
      const [mx, my] = hand(md, DR - 8, MOON, false);
      scr.disc(sx, sy, 3, SUN); scr.px(sx, sy, 1, 1, SUN_CORE);   // sun marker
      scr.disc(mx, my, 2, MOON);                                  // moon marker

      // the alignment: Sun and Moon meet at the node (top) and the eclipse fires
      if (phase === 'eclipse' || phase === 'outro') {
        const [nx, ny] = polar(DCX, DCY, 0, DR - 6);
        const grow = Math.min(1, glowT * 0.7);
        scr.softDisc(nx, ny, 8 + grow * 26, '#3a2c08', 16);       // corona glow, breaks frame
        for (let i = 0; i < 40; i++) {                            // the gold corona ring
          const a = i / 40 * Math.PI * 2, rr = 6 + grow * 8 + (i % 3);
          scr.px(nx + Math.cos(a) * rr, ny + Math.sin(a) * rr, 1, 1, i % 2 ? SUN : SUN_CORE);
        }
        scr.disc(nx, ny, 4, PAL.VOID);                            // the moon's disc over the sun
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

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

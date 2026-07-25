// The Living Wall — an English lane, and a hedge that is older than the church
// behind it. Hooper's rule: count the woody SPECIES in thirty paces and each one
// is roughly a century. So the hedge is a clock you can read by looking at it.
// The player taps the shrubs; repeats of one already counted teach the method
// (it is species you count, not plants). Revert: read the oldest living boundary
// near you. Full-scene build (the English-lane family, not the void vignette).

import { PixelScreen, bayer, rampDither } from '../pixel.js?v=35';
import { PAL } from '../palette.js?v=35';

const HEDGE_Y = 66, LANE_Y = 92;

// seven woody species, each with its own green and its own fruit
const SPECIES = [
  { key: 'hw.sp.0', leaf: ['#2b4526', '#3d5f33', '#527a44'], fruit: '#a8302a' },  // hawthorn
  { key: 'hw.sp.1', leaf: ['#22331f', '#33482b', '#455f3a'], fruit: '#2e2a52' },  // blackthorn
  { key: 'hw.sp.2', leaf: ['#39501f', '#4d6a2c', '#65853c'], fruit: '#8a6a34' },  // hazel
  { key: 'hw.sp.3', leaf: ['#12301c', '#1c4527', '#265a33'], fruit: '#c0342c' },  // holly
  { key: 'hw.sp.4', leaf: ['#2e4a2a', '#42633a', '#587c4c'], fruit: '#1e1a24' },  // elder
  { key: 'hw.sp.5', leaf: ['#3a4426', '#505c33', '#697543'], fruit: '#7a2038' },  // dogwood
  { key: 'hw.sp.6', leaf: ['#334a2e', '#48633f', '#5f7d52'], fruit: '#6a7a4a' },  // ash
];

// eleven clumps along the thirty paces — some species appear twice, which is
// exactly the trap Hooper's rule sets: you are counting kinds, not bushes
const CLUMPS = [
  { x: 14, sp: 0, r: 13 }, { x: 38, sp: 2, r: 12 }, { x: 58, sp: 0, r: 11 },
  { x: 76, sp: 5, r: 12 }, { x: 96, sp: 3, r: 13 }, { x: 114, sp: 1, r: 11 },
  { x: 132, sp: 4, r: 14 }, { x: 150, sp: 2, r: 11 }, { x: 166, sp: 6, r: 13 },
  { x: 180, sp: 1, r: 11 }, { x: 26, sp: 4, r: 11 },
];
const TAP_R = 13;

export const hedge = {
  id: 'hedge',
  kind: 'story',

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
    let phase = 'intro';        // intro → count → truth → outro
    const found = new Set();    // species indices identified so far
    let lastTapped = -1;        // clump index, for the little marker
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

    textEl.textContent = t('hw.s1');
    button(t('hw.begin'), () => {
      phase = 'count';
      textEl.textContent = t('hw.hint');
      btnRow.innerHTML = '';
    });

    function onTap(e) {
      if (dead || phase !== 'count') return;
      const p = scr.toPixel(e);
      for (let i = 0; i < CLUMPS.length; i++) {
        const c = CLUMPS[i];
        if (Math.hypot(p.x - c.x, p.y - (HEDGE_Y - c.r * 0.3)) > TAP_R) continue;
        lastTapped = i;
        const name = t(SPECIES[c.sp].key);
        if (found.has(c.sp)) {
          audio.step();                       // the lesson: kinds, not bushes
          textEl.textContent = `${name} — ${t('hw.again')}`;
        } else {
          found.add(c.sp);
          audio.plink();
          const n = found.size;
          textEl.textContent = `${name}. ${n}/${SPECIES.length} — ${t('hw.hint')}`;
          if (n >= SPECIES.length) setTimeout(() => { if (!dead) truth(); }, 600);
        }
        return;
      }
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function truth() {
      phase = 'truth';
      glowT = 0;
      audio.water();
      textEl.textContent = t('hw.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        audio.chime();
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('hw.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('hw.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── drawing ──────────────────────────────────────────────────
    function lane(now) {
      // an overcast English afternoon
      scr.bands(0, 0, scr.w, 46, ['#8fa4b4', '#a3b6c4', '#b9c9d4', '#cdd9e0']);
      // the field beyond, and a church tower behind the hedge — the hedge is older
      scr.px(0, 44, scr.w, 14, '#7d8a52');
      scr.px(0, 44, scr.w, 1, '#93a066');
      scr.px(150, 26, 9, 20, '#8a8578');           // the tower
      scr.px(149, 24, 11, 3, '#9a9588');
      scr.px(153, 31, 3, 5, '#5a5a54');            // its lancet window
      // the bank the hedge grows out of
      scr.px(0, HEDGE_Y + 12, scr.w, LANE_Y - HEDGE_Y - 12, '#5a4a34');
      for (let x = 0; x < scr.w; x += 3) {         // old stones in the bank
        if ((x * 7) % 5 === 0) scr.px(x, HEDGE_Y + 14 + ((x * 11) % 6), 3, 2, '#6e6455');
      }
      // the lane, pale chalk with two wheel ruts
      scr.px(0, LANE_Y, scr.w, 128 - LANE_Y, '#a89a80');
      scr.px(0, LANE_Y, scr.w, 1, '#bcae94');
      scr.px(0, LANE_Y + 8, scr.w, 3, '#94866e');
      scr.px(0, LANE_Y + 18, scr.w, 3, '#94866e');
      for (let x = 0; x < scr.w; x += 7) scr.px(x, LANE_Y + 14, 4, 1, '#8a9a5e');  // grass down the middle
    }

    // one clump of foliage: dithered leaves in its species' green, plus fruit
    function clump(c, isFound) {
      const sp = SPECIES[c.sp];
      const cy = HEDGE_Y - Math.round(c.r * 0.3);
      for (let dy = -c.r; dy <= c.r + 6; dy++) {
        for (let dx = -c.r; dx <= c.r; dx++) {
          const d = Math.hypot(dx, dy * (dy < 0 ? 1 : 0.7));
          if (d > c.r) continue;
          if (d > c.r - 2 && bayer(c.x + dx, cy + dy) > (c.r - d) / 2) continue;  // ragged edge
          scr.px(c.x + dx, cy + dy, 1, 1, rampDither(sp.leaf, 0.75 - d / c.r * 0.5 - dy / c.r * 0.2, c.x + dx, cy + dy));
        }
      }
      // its fruit — the thing that actually tells the species apart
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + c.sp;
        scr.px(c.x + Math.cos(a) * c.r * 0.55, cy + Math.sin(a) * c.r * 0.42, 2, 2, sp.fruit);
      }
      // a counted clump gets a small pale tick
      if (isFound) scr.px(c.x - 1, cy - c.r - 3, 3, 1, '#e8e0cc');
    }

    // the ring round the clump you just tapped blinks, so it stays live on top
    function marker(now) {
      if (lastTapped < 0 || phase !== 'count') return;
      if (Math.floor(now / 300) % 2 !== 0) return;
      const c = CLUMPS[lastTapped], cy = HEDGE_Y - Math.round(c.r * 0.3);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        scr.px(c.x + Math.cos(a) * (c.r + 3), cy + Math.sin(a) * (c.r + 3) * 0.8, 1, 1, '#e8e0cc');
      }
    }

    // the tally: a botanist's strip along the lane, one leaf dab per species
    function tally() {
      if (!found.size) return;
      const x0 = 8, w = SPECIES.length * 16 + 8;
      scr.px(x0, 108, w, 14, '#d8ccae');
      scr.px(x0, 108, w, 1, '#efe6d0');
      SPECIES.forEach((sp, i) => {
        const x = x0 + 6 + i * 16;
        if (found.has(i)) {
          scr.disc(x + 2, 115, 4, sp.leaf[1]);
          scr.px(x + 2, 115, 2, 2, sp.fruit);
        } else {
          scr.px(x, 118, 6, 1, '#a89a7e');          // a blank waiting to be filled
        }
      });
    }

    function draw(now, dt) {
      if (phase === 'truth' || phase === 'outro') glowT += dt;
      // the lane, the hedge and the tally only change when a species is counted
      scr.cached(`base:${found.size}`, () => {
        lane(now);
        // draw back-to-front by radius so the hedge reads as one continuous wall
        [...CLUMPS].sort((a, b) => a.r - b.r).forEach(c => clump(c, found.has(c.sp)));
        tally();
      });
      marker(now);
      // the reveal: eight centuries of quiet standing, lit along the hedge top
      if (phase === 'truth' || phase === 'outro') {
        const k = Math.min(1, glowT * 0.8);
        for (let x = 0; x < scr.w * k; x += 2) {
          const y = HEDGE_Y - 16 + Math.round(Math.sin(x * 0.08) * 3);
          scr.px(x, y, 2, 1, PAL.GOLD_LUX);
          if ((x + Math.floor(now / 90)) % 8 === 0) scr.px(x, y - 2, 1, 1, '#fff2c0');
        }
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

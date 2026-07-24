// The Lichen — a wisdom kernel whose interaction is the refusal to interact.
// A bare stone sits in the void. Leave it alone and lichen blooms across it
// over ~14 s; touch it, and it recoils and begins again. "Growth happens when
// you stop forcing it." Dithered crustose bloom in muted sage, a few spots
// glowing luminescent green and lifting spores into the void (the breakout).

import { PixelScreen, shade, bayer, rampDither } from '../pixel.js?v=18';
import { PAL } from '../palette.js?v=18';

const BLOOM_SEC = 14;               // untouched time to fully colonise the stone
const SCX = 96, SCY = 82, SRX = 46, SRY = 30;   // the stone

// tonal ramps (dark → light), stippled between steps by rampDither
const STONE  = ['#33322f', '#4c4a45', '#67635a', '#847e72', '#a49c8c'];
const LICHEN = ['#3e4a2c', '#61743f', '#8a9c5c', '#b6c488'];
const GLOW = PAL.LEAF_LUX, GLOW_CORE = '#eaffc0';

// deterministic lichen seeds on the stone surface {lx, ly (from centre), maxR}
const SEEDS = [
  [-30, -6, 15], [-14, 8, 18], [2, -10, 16], [16, 6, 17],
  [30, -4, 14], [-22, 12, 12], [10, 14, 13], [24, 14, 11], [-4, 2, 19],
];

export const lichen = {
  id: 'lichen',
  kind: 'wisdom',

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
    let phase = 'intro';       // intro → grow → bloomed → outro
    let bloomT = 0, bloom = 0; // 0 bare → 1 fully colonised
    let recoilT = 0;           // ms of the "recoils" note left
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('li.s1');
    button(t('li.begin'), startGrow);

    function startGrow() {
      phase = 'grow';
      bloomT = 0;
      textEl.textContent = t('li.hint');
      btnRow.innerHTML = '';
    }

    // the whole point: touching it sets the growth back — you cannot force it
    function onTap() {
      if (phase !== 'grow') return;
      bloomT = Math.max(0, bloomT - BLOOM_SEC * 0.4);   // recoil, don't fully wipe
      recoilT = 1800;
      audio.plink();
      textEl.textContent = t('li.disturb');
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function bloomed() {
      phase = 'bloomed';
      audio.chime();
      textEl.textContent = t('li.wisdom');
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p'); a.textContent = t('li.outro');
      const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('li.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── rendering ────────────────────────────────────────────────
    // the bare stone: a dithered boulder lit from the upper-left, darker base
    function stone() {
      for (let dy = -SRY; dy <= SRY; dy++) {
        const s = 1 - (dy / SRY) ** 2;
        if (s <= 0) continue;
        const half = SRX * Math.sqrt(s);
        for (let dx = -half; dx <= half; dx++) {
          let u = 0.55 - (dx / SRX) * 0.4 - (dy / SRY) * 0.33;   // top-left lit
          u += 0.1 * Math.sin(dx * 0.4 + dy * 0.5);              // mineral mottle
          scr.px(SCX + dx, SCY + dy, 1, 1, rampDither(STONE, u, SCX + dx, SCY + dy));
        }
        // a crisp shaded base rim
        scr.px(SCX - Math.round(half), SCY + dy, 1, 1, shade('#33322f', 0.8));
        scr.px(SCX + Math.round(half), SCY + dy, 1, 1, shade('#33322f', 0.8));
      }
    }

    // lichen patches expanding from each seed as bloom climbs 0→1
    function crust(now) {
      SEEDS.forEach(([lx, ly, maxR], si) => {
        const gr = bloom * maxR;
        if (gr < 1) return;
        for (let dy = -gr; dy <= gr; dy++) {
          for (let dx = -gr; dx <= gr; dx++) {
            const d = Math.hypot(dx, dy);
            if (d > gr) continue;
            const x = SCX + lx + dx, y = SCY + ly + dy;
            // stay on the stone's face
            if (((x - SCX) / SRX) ** 2 + ((y - SCY) / SRY) ** 2 > 1) continue;
            // stippled organic edge: dense core, ragged rim
            if (d < gr - 3 || bayer(x, y) < (gr - d) / 4) {
              scr.px(x, y, 1, 1, rampDither(LICHEN, 1 - d / (maxR + 1), x, y));
            }
          }
        }
        // a luminescent apothecium at each mature patch (the breakout accent)
        if (bloom > 0.75) {
          const x = SCX + lx, y = SCY + ly, pulse = 0.5 + 0.5 * Math.sin(now / 500 + si);
          scr.softDisc(x, y, 3, '#2e5a1e', 3);
          scr.px(x, y, 1, 1, GLOW);
          if (pulse > 0.6) scr.px(x, y, 1, 1, GLOW_CORE);
        }
      });
    }

    // spores lifting off into the void once it has taken — quiet breakout
    function spores(now) {
      const n = Math.floor(Math.max(0, bloom - 0.6) * 12);
      for (let i = 0; i < n; i++) {
        const x = SCX + ((i * 37) % (SRX * 2)) - SRX + Math.sin(now / 700 + i) * 4;
        const rise = ((now / 40 + i * 53) % 70);
        const y = SCY - 24 - rise;
        if ((Math.floor(now / 200) + i) % 3 === 0) scr.px(x, y, 1, 1, i % 4 ? GLOW : GLOW_CORE);
      }
    }

    function draw(now, dt) {
      if (phase === 'grow') {
        bloomT += dt;
        bloom = Math.min(1, bloomT / BLOOM_SEC);
        if (recoilT > 0) { recoilT -= dt * 1000; if (recoilT <= 0) textEl.textContent = t('li.hint'); }
        if (bloomT >= BLOOM_SEC) bloomed();
      } else if (phase !== 'intro') {
        bloom = 1;
      }

      scr.clear(PAL.VOID);
      scr.softDisc(SCX, SCY, SRX + 16, '#141a10', 20);   // earthy halo in the void
      scr.px(SCX - SRX - 6, SCY + SRY - 4, (SRX + 6) * 2, 10, PAL.MOSS_DEEP);  // moss it rests on
      stone();
      crust(now);
      if (bloom > 0.6) spores(now);
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

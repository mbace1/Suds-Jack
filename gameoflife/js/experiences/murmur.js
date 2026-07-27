// The Murmuration — a winter dusk over a reedbed, and forty thousand starlings
// deciding, together, without anybody deciding. The player picks one bird out
// of the crowd and follows it while the shape turns itself inside out; the
// reveal is that there is no leader and never was. Each starling tracks about
// seven neighbours — not the nearest by distance, the nearest SEVEN — and the
// whole cathedral of it falls out of three small rules obeyed locally.
//
// The flock is an actual boids simulation rather than a canned animation,
// because the point of the story is that the shape is emergent: if it were
// scripted the scene would be lying about its own subject.
// Revert: find a flock at dusk and watch it instead of filming it.

import { PixelScreen } from '../pixel.js?v=40';
import { PAL } from '../palette.js?v=40';

const N = 110;                      // starlings
const SKY = ['#2b2440', '#4a3a58', '#8a5d6d', '#c98f7a'];
const BIRD = '#1d1826', BIRD_FAR = '#3a3348';
const MINE = PAL.GOLD_LUX, MINE_CORE = '#fff2c0';
const HAWK = '#0d0a12';

export const murmur = {
  id: 'murmur',
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
    let phase = 'intro';    // intro → pick → hawk → truth → outro
    let mine = -1;          // the bird the player chose to follow
    let hawk = null;        // { x, y, vx, vy } when the peregrine comes through
    let glowT = 0;
    let raf = 0, dead = false;
    let last = performance.now();

    // ── the flock ────────────────────────────────────────────────
    // classic three rules, with the one detail that makes real starlings work:
    // each bird attends to its nearest SEVEN, not to everything within a radius.
    // That is what keeps the flock coherent however dense or sparse it gets.
    const K = 7;
    const birds = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      birds.push({
        x: 96 + Math.cos(a) * (18 + (i % 11) * 2),
        y: 54 + Math.sin(a) * (10 + (i % 7)),
        vx: Math.cos(a + 1.6) * 22, vy: Math.sin(a + 1.6) * 14,
      });
    }
    const near = [];        // scratch, reused so the loop allocates nothing

    function flock(dt, now) {
      const cxAll = 96 + Math.sin(now / 3700) * 34;      // the roost drifts
      const cyAll = 50 + Math.sin(now / 2600) * 12;
      for (let i = 0; i < N; i++) {
        const b = birds[i];
        near.length = 0;
        for (let j = 0; j < N; j++) {
          if (j === i) continue;
          const o = birds[j];
          const d = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
          if (near.length < K) { near.push([d, o]); near.sort((p, q) => p[0] - q[0]); }
          else if (d < near[K - 1][0]) { near[K - 1] = [d, o]; near.sort((p, q) => p[0] - q[0]); }
        }
        let ax = 0, ay = 0, sx = 0, sy = 0, gx = 0, gy = 0;
        for (const [d, o] of near) {
          ax += o.vx; ay += o.vy;                        // 1. align
          gx += o.x; gy += o.y;                          // 3. attract
          if (d < 40) { sx -= (o.x - b.x); sy -= (o.y - b.y); }   // 2. avoid (~6px of personal space)
        }
        const k = near.length || 1;
        b.vx += ((ax / k) - b.vx) * dt * 1.7;
        b.vy += ((ay / k) - b.vy) * dt * 1.7;
        b.vx += ((gx / k) - b.x) * dt * 2.0 + sx * dt * 2.6;
        b.vy += ((gy / k) - b.y) * dt * 2.0 + sy * dt * 2.6;
        b.vx += (cxAll - b.x) * dt * 1.1;                // and the roost pulls
        b.vy += (cyAll - b.y) * dt * 1.5;
        // a soft wall: the crowd stays over the reedbed rather than leaking off
        if (b.x < 14) b.vx += (14 - b.x) * dt * 9;
        if (b.x > 178) b.vx -= (b.x - 178) * dt * 9;
        if (b.y < 8) b.vy += (8 - b.y) * dt * 9;
        if (b.y > 86) b.vy -= (b.y - 86) * dt * 9;
        if (hawk) {                                       // everybody hates the hawk
          const dx = b.x - hawk.x, dy = b.y - hawk.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 900) { b.vx += dx / (d2 + 1) * 900 * dt; b.vy += dy / (d2 + 1) * 700 * dt; }
        }
        const sp = Math.hypot(b.vx, b.vy) || 1;          // starlings hold their speed
        const want = 17;   // slow enough to read as a crowd, not tracer fire
        b.vx = b.vx / sp * want; b.vy = b.vy / sp * want;
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      if (hawk) {
        hawk.x += hawk.vx * dt; hawk.y += hawk.vy * dt;
        if (hawk.x > 230 || hawk.x < -40) hawk = null;
      }
    }

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    textEl.textContent = t('mu.s1');
    button(t('mu.begin'), () => {
      phase = 'pick';
      textEl.textContent = t('mu.hint');
      btnRow.innerHTML = '';
    });

    // pick a bird by tapping near it — the flock will not hold still for you,
    // which is part of the point
    function onTap(e) {
      if (dead || phase !== 'pick') return;
      const p = scr.toPixel(e);
      let best = -1, bd = 64;
      birds.forEach((b, i) => {
        const d = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0) { textEl.textContent = t('mu.miss'); return; }
      mine = best;
      audio.plink();
      phase = 'hawk';
      textEl.textContent = t('mu.followed');
      setTimeout(() => {
        if (dead) return;
        hawk = { x: -30, y: 44, vx: 96, vy: 6 };          // the peregrine arrives
        audio.water();
        textEl.textContent = t('mu.hawk');
        setTimeout(() => { if (!dead) truth(); }, 3400);
      }, 2200);
    }
    scr.canvas.addEventListener('pointerdown', onTap);

    function truth() {
      phase = 'truth';
      glowT = 0;
      audio.chime();
      textEl.textContent = t('mu.truth');
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => {
        phase = 'outro';
        textEl.innerHTML = '';
        const a = document.createElement('p'); a.textContent = t('mu.outro');
        const b = document.createElement('p'); b.className = 'nature-note'; b.textContent = t('mu.nature');
        textEl.append(a, b);
        btnRow.innerHTML = '';
        button(t('ui.continue'), () => onComplete());
      });
    }

    // ── drawing ──────────────────────────────────────────────────
    function dusk(now) {
      scr.bands(0, 0, scr.w, 96, SKY);
      scr.disc(30, 88, 9, PAL.EMBER);                     // the sun already down
      scr.disc(30, 90, 7, '#e8a86c', PAL.DANGER);
      // the reedbed the whole crowd is trying to land in
      scr.px(0, 96, scr.w, 32, '#241f2c');
      // reeds, not a picket fence: varied heights, some leaning, doubled up
      for (let x = -2; x < scr.w; x += 1) {
        if ((x * 13) % 3 === 0) continue;
        const h = 5 + ((x * 7) % 11) + ((x * 3) % 5);
        const lean = Math.sin(now / 1100 + x * 0.09) * (1 + h * 0.05);
        scr.px(x + lean, 96 - h, 1, h, (x * 5) % 4 ? '#312a3a' : '#3d3448');
        if (h > 12) scr.px(x + lean * 1.4, 96 - h - 2, 1, 3, '#4a4056');   // the seed head
      }
      scr.px(0, 112, scr.w, 16, '#171320');               // water below the reeds
      for (let i = 0; i < 12; i++) {                      // its slow shine
        scr.px((i * 19 + Math.floor(now / 60)) % 200 - 8, 116 + (i % 3) * 4, 7, 1, '#26203040');
      }
    }

    function draw(now, dt) {
      if (phase !== 'intro') flock(dt, now);
      if (phase === 'truth' || phase === 'outro') glowT += dt;
      dusk(now);

      // every starling: a 1px body with a 1px wing that beats. At this scale
      // that is all a bird is, and 110 of them is a murmuration.
      birds.forEach((b, i) => {
        if (i === mine) return;
        const flap = Math.sin(now / 90 + i) > 0 ? 1 : 2;
        scr.px(b.x, b.y, 2, flap, i % 5 ? BIRD : BIRD_FAR);
      });
      if (hawk) {                                          // the peregrine, bigger
        scr.px(hawk.x, hawk.y, 5, 2, HAWK);
        scr.px(hawk.x + 1, hawk.y - 2, 2, 5, HAWK);
      }
      if (mine >= 0) {
        const b = birds[mine];
        scr.px(b.x - 2, b.y - 2, 5, 1, MINE);              // a ring so you can hold it
        scr.px(b.x - 2, b.y + 2, 5, 1, MINE);
        scr.px(b.x - 2, b.y - 1, 1, 3, MINE);
        scr.px(b.x + 2, b.y - 1, 1, 3, MINE);
        scr.px(b.x, b.y, 2, 2, MINE_CORE);
      }
      // the truth lifts the whole shape past the frame: the flock is bigger
      // than the picture of it
      if (phase === 'truth' || phase === 'outro') {
        const k = Math.min(1, glowT * 0.5);
        for (let i = 0; i < 22; i++) {
          const a = now / 1200 + i * 0.29;
          const r = 40 + k * 70;
          scr.px(96 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.6, 2, 1,
            i % 4 ? BIRD : MINE);
        }
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
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

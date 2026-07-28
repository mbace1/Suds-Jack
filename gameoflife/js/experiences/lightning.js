// First Lightning — Philadelphia, 1882. William N. Jennings waits on a rooftop
// with a dry-plate camera through a summer storm. The exposure that finally
// catches a bolt becomes one of the earliest clear photographs of lightning.
// A quiet story about waiting for the uncatchable and freezing what the eye
// cannot hold.

import { PixelScreen } from '../pixel.js?v=41';
import { PAL } from '../palette.js?v=41';

export const lightning = {
  id: 'lightning',
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
    let phase = 'intro'; // intro → wait → flash → plate → outro
    let waitT = 0;
    let flashT = 0;
    let bolt = null; // {x0,y0, segs: [[x,y], ...]}
    let raf = 0, dead = false;
    let last = performance.now();

    function button(label, fn) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { audio.step(); fn(); };
      btnRow.appendChild(b);
    }

    // simple branching bolt generator
    function makeBolt() {
      const segs = [];
      let x = 110 + Math.random() * 40;
      let y = 8;
      segs.push([x, y]);
      while (y < 78) {
        x += (Math.random() - 0.5) * 18;
        y += 6 + Math.random() * 8;
        segs.push([x, y]);
        // occasional side branch
        if (Math.random() < 0.35 && y > 20) {
          let bx = x, by = y;
          for (let i = 0; i < 3; i++) {
            bx += (Math.random() - 0.5) * 14;
            by += 5 + Math.random() * 4;
            segs.push([bx, by]);
          }
          segs.push([x, y]); // return to main
        }
      }
      return { segs };
    }

    textEl.textContent = t('lt.s1');
    button(t('lt.wait'), startWait);

    function startWait() {
      phase = 'wait';
      waitT = 0;
      textEl.textContent = t('lt.waiting');
      btnRow.innerHTML = '';
      // after a short real wait the storm delivers
      setTimeout(() => {
        if (phase === 'wait' && !dead) doFlash();
      }, 3200 + Math.random() * 1800);
    }

    function doFlash() {
      phase = 'flash';
      flashT = 0;
      bolt = makeBolt();
      audio.chime();
      textEl.textContent = t('lt.flash');
      btnRow.innerHTML = '';
      setTimeout(() => {
        if (!dead) showPlate();
      }, 900);
    }

    function showPlate() {
      phase = 'plate';
      textEl.textContent = t('lt.plate');
      btnRow.innerHTML = '';
      button(t('ui.continue'), showOutro);
    }

    function showOutro() {
      phase = 'outro';
      textEl.innerHTML = '';
      const a = document.createElement('p');
      a.textContent = t('lt.outro');
      const b = document.createElement('p');
      b.className = 'nature-note';
      b.textContent = t('lt.nature');
      textEl.append(a, b);
      btnRow.innerHTML = '';
      button(t('ui.continue'), () => onComplete());
    }

    // ── drawing ──────────────────────────────────────────────────
    let _t = 0;   // wall clock for the ambient storm, set each frame in draw()
    function drawSky(stormy) {
      if (stormy) {
        scr.bands(0, 0, 192, 90, ['#0c1018', '#121820', '#1a2230']);
      } else {
        scr.bands(0, 0, 192, 90, ['#0a0c14', '#0e121c', '#141a28']);
      }
      // distant city / roofs silhouette
      for (let i = 0; i < 14; i++) {
        const x = 6 + i * 14;
        const h = 6 + (i % 5) * 3;
        scr.px(x, 90 - h, 10, h, '#06080e');
      }
      // a few window lights, one of them guttering
      scr.px(28, 78, 2, 2, '#3a3428');
      scr.px(72, 74, 2, 2, Math.floor(_t / 900) % 4 ? '#3a3428' : '#221e18');
      scr.px(118, 80, 2, 2, '#3a3428');
      // the storm is working before it strikes: cloud crossing, rain slanting,
      // and a far-off flicker over the roofs
      scr.px((_t / 130) % 260 - 60, 14, 52, 6, stormy ? '#1c2432' : '#161c28');
      scr.px((_t / 95) % 250 - 50, 26, 34, 4, stormy ? '#222c3c' : '#1a2130');
      for (let i = 0; i < 14; i++) {
        const rx = (i * 29 + _t / 5) % 200;
        const ry = ((_t / 3 + i * 23) % 92);
        scr.px(rx, ry, 1, 3, '#2e3a4c');
      }
      if (Math.floor(_t / 1700) % 5 === 0 && (_t % 1700) < 90) {
        scr.px(0, 60, 192, 30, '#1e2836');        // sheet lightning, far away
      }
    }

    function drawBolt(alpha) {
      if (!bolt) return;
      const segs = bolt.segs;
      for (let i = 1; i < segs.length; i++) {
        const [x0, y0] = segs[i - 1];
        const [x1, y1] = segs[i];
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = x0 + (x1 - x0) * t;
          const y = y0 + (y1 - y0) * t;
          // core
          scr.px(x, y, 2, 1, alpha > 0.6 ? '#e8f4ff' : '#8ab0d0');
          // soft glow
          if (alpha > 0.4) scr.px(x - 1, y, 1, 1, '#4a7090');
        }
      }
    }

    function drawPlate() {
      // a tilted "photograph" rectangle holding the captured bolt
      scr.rect(40, 28, 112, 64, '#c8b898', '#8a7a5a');
      scr.rect(44, 32, 104, 56, '#1a1e28');
      // tiny city silhouette inside the plate
      for (let i = 0; i < 10; i++) {
        const x = 50 + i * 10;
        const h = 4 + (i % 4) * 2;
        scr.px(x, 80 - h, 8, h, '#0c1018');
      }
      // the frozen bolt, slightly cyan for the "developed" feel
      if (bolt) {
        const segs = bolt.segs;
        for (let i = 1; i < segs.length; i++) {
          const [x0, y0] = segs[i - 1];
          const [x1, y1] = segs[i];
          // map into the plate area
          const mx0 = 44 + (x0 / 192) * 104;
          const my0 = 32 + (y0 / 90) * 48;
          const mx1 = 44 + (x1 / 192) * 104;
          const my1 = 32 + (y1 / 90) * 48;
          const steps = Math.max(Math.abs(mx1 - mx0), Math.abs(my1 - my0), 1);
          for (let s = 0; s <= steps; s++) {
            const tt = s / steps;
            scr.px(mx0 + (mx1 - mx0) * tt, my0 + (my1 - my0) * tt, 1, 1, PAL.CYAN_LUX);
          }
        }
      }
    }

    function draw(now) {
      _t = now;
      scr.clear(PAL.VOID);

      if (phase === 'intro' || phase === 'wait') {
        drawSky(phase === 'wait');
        // soft rain streaks while waiting
        if (phase === 'wait') {
          for (let i = 0; i < 18; i++) {
            const x = (i * 37 + Math.floor(now / 40)) % 192;
            const y = (i * 23 + Math.floor(now / 30)) % 90;
            scr.px(x, y, 1, 3, '#1a2438');
          }
        }
      } else if (phase === 'flash') {
        // bright flash frame
        const a = Math.max(0, 1 - flashT * 2.2);
        scr.bands(0, 0, 192, 90, ['#e8f0ff', '#c0d8f0', '#8098b8']);
        drawBolt(a);
        // after-image glow
        if (a > 0.2) {
          scr.px(0, 0, 192, 4, '#a0c0e0');
        }
      } else if (phase === 'plate' || phase === 'outro') {
        drawSky(false);
        drawPlate();
      }
    }

    function loop(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phase === 'wait') waitT += dt;
      if (phase === 'flash') flashT += dt;

      draw(now);
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

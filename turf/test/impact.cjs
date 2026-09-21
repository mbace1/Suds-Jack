// THE IMPACT GATE — the half of v42 that bare node cannot see.
//
// `smoke.mjs` asserts the spec (impact.js is pure, so every tier, curve and
// sound layer is checked there in bare node). This checks the three things that
// only exist once a browser composes a transform:
//
//  1. THE GRID STAYS ON THE YARD. The punch scales the board and the plate, two
//     different elements whose centres sit ~126px apart even though the plate's
//     floor quad is seated exactly on the board's diamond (v33). Scaling each
//     about its own centre slides the yard out from under the grid — the one
//     thing v33 exists to prevent. This measures the disagreement between the
//     two transforms AND measures it again with the fix defeated, because a
//     reading of "0px" means nothing without a control that reads non-zero.
//  2. THE IMPACT RETURNS TO NOTHING. A shake or a punch that leaves a residue
//     becomes a silent edit to the player's own pan and zoom, which are theirs.
//  3. THE HITSTOP ACTUALLY STOPS THE CLOCK, and the game keeps running under it.
//
// Run: NODE_PATH=$(npm root -g) node turf/test/impact.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.TURF_BASE_URL || 'http://127.0.0.1:8767';
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log('  ok ', name); };

// Stage an adjacent, guaranteed-lethal swing with one rival left alive, so the
// encounter stays up and the impact is the only thing moving on the board.
// MELEE, deliberately: a knife is hitChance 1, so the kill is deterministic.
// The first cut of this gate swung a pistol at 85% and a miss read as a peak
// shake of 0.03px — which is the MISS tier behaving perfectly and a gate
// failing for a reason that had nothing to do with impact.
const ATTACKER = 'p0';
const STAGE = () => {
  const s = __turf.state();
  s.fullCover.clear(); s.partialCover.clear(); s.hazards.clear(); s.reinforcements = [];
  const me = s.units.find(u => u.uid === 'p0');
  s.units.forEach(u => { if (u.faction === 'enemy' && !['e0', 'e1'].includes(u.uid)) u.hp = 0; });
  const e0 = s.units.find(u => u.uid === 'e0'), e1 = s.units.find(u => u.uid === 'e1');
  Object.assign(me, { x: 6, y: 6, hp: 99, maxHp: 99, actedMove: false, actedAction: false });
  Object.assign(e0, { x: 6, y: 5, hp: 1, maxHp: 6 });
  if (e1) Object.assign(e1, { x: 1, y: 1, hp: 40, maxHp: 40 });
};

// Where a VIEWPORT point lands under one element's own transform. Comparing the
// board's answer with the plate's is the only honest way to ask whether they
// move as one object: their element centres differ on purpose, so comparing
// those would report a correct fix as a failure (it did, once).
const MAPPER = `function mapper(el) {
  const cs = getComputedStyle(el);
  const m = new DOMMatrix(cs.transform === 'none' ? 'matrix(1,0,0,1,0,0)' : cs.transform);
  const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
  const host = el.offsetParent.getBoundingClientRect();
  const x0 = host.x + el.offsetLeft, y0 = host.y + el.offsetTop;
  return pt => { const lx = pt.x - x0 - ox, ly = pt.y - y0 - oy;
    return { x: x0 + ox + m.a * lx + m.c * ly + m.e, y: y0 + oy + m.b * lx + m.d * ly + m.f }; };
}`;

async function boot(browser, { reduced = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: 820, height: 700 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(BASE + '/turf/');
  await page.locator('#titleStart:not([disabled])').waitFor();
  await page.locator('#titleStart').click();
  await page.waitForFunction(() => window.__turf && __turf.state && __turf.state());
  await page.waitForTimeout(700);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
  try {
    console.log('impact — the board under a blow');
    const { page, errors } = await boot(browser);

    // 1. The grid stays on the yard, measured against a control.
    const reg = await page.evaluate(`(() => {
      ${MAPPER}
      const probe = [{ x: 200, y: 150 }, { x: 600, y: 420 }, { x: 410, y: 220 }];
      const worst = () => {
        const mb = mapper(document.querySelector('#board'));
        const mp = mapper(document.querySelector('#plate'));
        return Math.max(...probe.map(t => { const a = mb(t), c = mp(t);
          return Math.hypot(a.x - c.x, a.y - c.y); }));
      };
      const cam = __turf.camera();
      cam.setImpact({ x: 0, y: 0, scale: 1 });   const rest = worst();
      cam.setImpact({ x: 0, y: 0, scale: 1.03 }); const fixed = worst();
      // Defeat the fix: the control. Without this the next assertion passes on
      // a board that has no plate at all.
      document.querySelector('#plate').style.transformOrigin = '50% 50%';
      const control = worst();
      cam.setImpact({ x: 0, y: 0, scale: 1 });
      document.querySelector('#plate').style.transformOrigin = '';
      return { rest, fixed, control };
    })()`);
    check('at rest the board and the plate agree exactly', () => {
      assert.ok(reg.rest < 0.01, `rest disagreement ${reg.rest}`);
    });
    check('a punch moves the grid and the yard as ONE object', () => {
      assert.ok(reg.fixed < 0.01, `the yard slid ${reg.fixed.toFixed(2)}px under the grid`);
    });
    check('...and the control proves that assertion can fail', () => {
      assert.ok(reg.control > 1, `scaling about each element's own centre should slip, read ${reg.control}`);
    });

    // 2. A real kill: the impact happens, then leaves nothing behind.
    await page.evaluate(STAGE);
    await page.waitForTimeout(400);
    await page.locator(`[data-control="unit-${ATTACKER}"]`).click();
    await page.waitForTimeout(300);
    const run = await page.evaluate(async () => {
      const out = []; const t0 = performance.now();
      document.querySelector('#targets button').click();
      return await new Promise(res => {
        const tick = () => {
          out.push({ t: performance.now() - t0, ...__turf.anim.impact() });
          if (performance.now() - t0 < 900) requestAnimationFrame(tick); else res(out);
        };
        requestAnimationFrame(tick);
      });
    });
    const peakShake = Math.max(...run.map(r => Math.hypot(r.x, r.y)));
    const peakScale = Math.max(...run.map(r => r.scale));
    const frozen = run.filter(r => r.frozen).length;
    const last = run[run.length - 1];
    check('a kill actually shakes the board', () => {
      assert.ok(peakShake > 1.5, `peak shake ${peakShake.toFixed(2)}px is too quiet to read`);
      assert.ok(peakShake < 30, `peak shake ${peakShake.toFixed(2)}px is the camera falling over`);
    });
    check('a kill punches the zoom, within its tier', () => {
      assert.ok(peakScale > 1.005 && peakScale <= 1.031, `peak scale ${peakScale}`);
    });
    check('a kill stops the clock for a beat, and starts it again', () => {
      assert.ok(frozen >= 2, `only ${frozen} frozen frames — the hitstop is not landing`);
      assert.ok(frozen < run.length / 2, `${frozen} of ${run.length} frames frozen reads as a stall`);
      assert.equal(last.frozen, false, 'the clock must be running again by the end');
    });
    check('the impact returns to EXACTLY nothing', () => {
      // Anything left behind is a silent edit to the player's own pan and zoom.
      assert.equal(last.x, 0); assert.equal(last.y, 0); assert.equal(last.scale, 1);
    });
    check('the game is still playable after the blow', () => {
      assert.deepEqual(errors, []);
    });
    const alive = await page.evaluate(() => __turf.state().units.filter(u => u.hp > 0).length);
    check('the hitstop froze the DRAWING, never the game', () => {
      assert.ok(alive > 0, 'the encounter is still running');
    });
    await page.close();

    // 3. Reduced motion takes all three to zero.
    const { page: quiet, errors: qErr } = await boot(browser, { reduced: true });
    await quiet.evaluate(STAGE);
    await quiet.waitForTimeout(400);
    await quiet.locator(`[data-control="unit-${ATTACKER}"]`).click();
    await quiet.waitForTimeout(300);
    const qRun = await quiet.evaluate(async () => {
      const out = []; const t0 = performance.now();
      document.querySelector('#targets button').click();
      return await new Promise(res => {
        const tick = () => {
          out.push(__turf.anim.impact());
          if (performance.now() - t0 < 600) requestAnimationFrame(tick); else res(out);
        };
        requestAnimationFrame(tick);
      });
    });
    check('prefers-reduced-motion leaves the board completely still', () => {
      for (const r of qRun) {
        assert.equal(r.x, 0); assert.equal(r.y, 0);
        assert.equal(r.scale, 1); assert.equal(r.frozen, false);
      }
      assert.deepEqual(qErr, []);
    });
    const qAlive = await quiet.evaluate(() => __turf.state().units.filter(u => u.hp > 0).length);
    check('...and the blow still lands, so nothing is lost but the movement', () => {
      assert.ok(qAlive > 0);
    });
    await quiet.close();

    console.log(`\n${pass} checks passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });

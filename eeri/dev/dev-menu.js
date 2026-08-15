// EERI — the dev menu.
//
// A controls-and-inspector panel for iterating on **feel, visual feedback,
// audio feedback and debugging** without touching the shipping game.
//
// CLAUDE_HANDOFF.md's hard rule: *"Do not rewrite working EERI systems to
// integrate this pack. The pack is deliberately peripheral."* So this file
// only ever READS `window.__eeri` and calls the debug hooks that already
// exist for the test gates. It adds nothing to `main.js`, and if the game's
// API moves, this adapts — never the other way round.
//
// It runs against the **real build**: `dev.html` puts `index.html` in a
// same-origin iframe rather than copying it, so the thing being inspected
// is byte-for-byte the thing the player gets. A dev harness that is a copy
// is a harness that silently drifts, and this project has already paid for
// that class of bug three times over in other files.
//
// The FX are driven by POLLING (`fx.js` → `sample`/`detect`), which is what
// makes the pack zero-touch. That is a prototyping device and it is honest
// about being one: two pickups in one frame read as one event. When a look
// is approved it moves to an explicit call at the source, per the handoff's
// integration order.

import { FXPool, FX_SPEC, sample, detect, attach } from '../js/fx.js?v=15';
import { AudioFX, SFX_SPEC, VOICES, validateSpec } from '../js/audio-fx.js?v=15';

const KEY = 'eeriDevMenu';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export class DevMenu {
  /**
   * @param {Window} target  the window the game is running in — the iframe's
   *                         contentWindow under dev.html, or `window` itself
   *                         when the shim mounts it on the normal page.
   */
  constructor(target = window) {
    this.target = target;
    this.pool = new FXPool({ cap: 500 });
    this.audio = new AudioFX();
    this.bound = null;        // the THREE binding, once a scene is found
    this.prev = null;
    this.on = { fx: true, sfx: true, poll: true };
    this.events = [];
    this.raf = 0;
    this.lastT = 0;
    this.root = null;
  }

  get E() { try { return this.target.__eeri || null; } catch { return null; } }

  mount(host = document.body) {
    const root = el('div', '', '');
    root.id = 'devmenu';
    root.innerHTML = `
      <h1>eeri dev <button type="button" id="dvMin">—</button></h1>
      <section>
        <h2>level</h2>
        <div class="row" id="dvSites"></div>
        <div class="row" style="margin-top:4px">
          <button class="act" data-act="lab">gizmo lab</button>
          <button class="act" data-act="reload">reload</button>
        </div>
      </section>
      <section>
        <h2>fire an effect</h2>
        <div class="row" id="dvFire"></div>
        <p class="note">fires FX and SFX together, at the player</p>
      </section>
      <section>
        <h2>switches</h2>
        <label class="sw"><input type="checkbox" id="dvFx" checked> visual fx</label>
        <label class="sw"><input type="checkbox" id="dvSfx" checked> sound fx</label>
        <label class="sw"><input type="checkbox" id="dvPoll" checked> infer from state</label>
        <div class="sl"><span>volume</span><input type="range" id="dvVol" min="0" max="100" value="80"><b id="dvVolV">80</b></div>
      </section>
      <section>
        <h2>state</h2>
        <table id="dvState"></table>
      </section>
      <section>
        <h2>events seen</h2>
        <pre class="log" id="dvLog">—</pre>
      </section>
      <section>
        <h2>spec check</h2>
        <pre class="log" id="dvSpec">—</pre>
      </section>`;
    host.appendChild(root);
    this.root = root;

    const toggle = el('button', '', 'dev');
    toggle.id = 'devtoggle';
    toggle.type = 'button';
    toggle.addEventListener('click', () => this.setHidden(!root.hidden));
    host.appendChild(toggle);
    this.toggle = toggle;

    root.querySelector('#dvMin').addEventListener('click', () => root.classList.toggle('min'));

    // level jumps, built from the game's own room count so this never goes
    // stale against a level being added
    const sites = root.querySelector('#dvSites');
    const n = (() => { try { return this.E?.debug?.rooms?.() ?? 3; } catch { return 3; } })();
    for (let i = 0; i < n; i++) {
      const b = el('button', 'act', `L${i + 1}`);
      b.type = 'button';
      b.addEventListener('click', () => this.call((d) => d.goSite(i)));
      sites.appendChild(b);
    }

    // one button per effect, so a look can be judged on demand instead of
    // by hunting for the situation that produces it
    const fire = root.querySelector('#dvFire');
    for (const k of Object.keys(FX_SPEC)) {
      const b = el('button', 'act', k);
      b.type = 'button';
      b.addEventListener('click', () => { this.audio.start(); this.fire(k); });
      fire.appendChild(b);
    }

    root.querySelector('[data-act="lab"]').addEventListener('click', () => this.call((d) => d.goLab()));
    root.querySelector('[data-act="reload"]').addEventListener('click', () => {
      try { this.target.location.reload(); } catch { /* cross-origin */ }
    });

    const sw = (id, key) => root.querySelector(id).addEventListener('change', (e) => {
      this.on[key] = e.target.checked;
    });
    sw('#dvFx', 'fx'); sw('#dvSfx', 'sfx'); sw('#dvPoll', 'poll');
    root.querySelector('#dvVol').addEventListener('input', (e) => {
      const v = Number(e.target.value);
      root.querySelector('#dvVolV').textContent = String(v);
      this.audio.setVolume(v / 100);
    });

    // the spec check runs at mount, because a table that cannot play is the
    // one thing you want to know before you start listening for a difference
    const bad = validateSpec();
    root.querySelector('#dvSpec').textContent = bad.length
      ? bad.join('\n')
      : `${VOICES.length} voices, all playable`;
    root.querySelector('#dvSpec').className = bad.length ? 'log bad' : 'log good';

    // start audio on the first gesture anywhere — iOS will not build a
    // context without one, and a dev tool that is silently muted wastes an
    // afternoon before anyone checks why
    const kick = () => { this.audio.start(); removeEventListener('pointerdown', kick); };
    addEventListener('pointerdown', kick);

    this.setHidden(localStorage.getItem(KEY) === 'off');
    this.loop();
    return this;
  }

  setHidden(hidden) {
    if (this.root) this.root.hidden = hidden;
    if (this.toggle) this.toggle.hidden = !hidden;
    try { localStorage.setItem(KEY, hidden ? 'off' : 'on'); } catch { /* private */ }
  }

  /** Run something against the game's debug API, swallowing a missing hook. */
  call(fn) {
    const E = this.E;
    if (!E?.debug) return null;
    try { return fn(E.debug, E); } catch (err) { this.log(`! ${err.message}`); return null; }
  }

  /** Fire one effect by name, both halves of it. */
  fire(kind, x = null, y = null, scale = 1) {
    const E = this.E;
    const px = x ?? E?.player?.x ?? 0;
    const py = (y ?? E?.player?.y ?? 0) + 0.6;
    if (this.on.fx) this.pool.burst(kind, px, py, scale);
    if (this.on.sfx) this.audio.play(kind === 'clear' ? 'clear' : kind);
    this.log(`${kind} @ ${px.toFixed(1)},${py.toFixed(1)}`);
  }

  log(line) {
    this.events.push(line);
    if (this.events.length > 40) this.events.shift();
    const p = this.root?.querySelector('#dvLog');
    if (p) { p.textContent = this.events.slice(-8).reverse().join('\n'); }
  }

  /**
   * Find the game's scene and bind the pool to it. Deferred until the game
   * has actually booted, and retried each frame until it works — the iframe
   * loads on its own schedule and there is no event for "three is ready".
   */
  bind() {
    if (this.bound) return true;
    const E = this.E;
    const THREE = this.target.THREE || E?.THREE;
    const scene = E?.scene;
    if (!THREE || !scene) return false;
    const PAL = E?.PAL || {};
    const palette = {
      MACHINE: PAL.MACHINE ?? 0xffb01f, MACHINE_DK: PAL.MACHINE_DK ?? 0xc07f10,
      STEEL1: PAL.STEEL?.[1] ?? 0x8fa3b0, STEEL2: PAL.STEEL?.[2] ?? 0x6d7f8b,
      EARTH1: PAL.EARTH?.[1] ?? 0x8a6242, EARTH2: PAL.EARTH?.[2] ?? 0x6d4a30,
    };
    try { this.bound = attach(this.pool, THREE, scene, palette); } catch { return false; }
    this.log('fx bound to the scene');
    return true;
  }

  loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000 || 0);
    this.lastT = now;

    this.bind();

    const E = this.E;
    if (E && this.on.poll) {
      const s = sample(E);
      for (const ev of detect(this.prev, s)) {
        this.fire(ev.kind, ev.x, ev.y, ev.scale ?? 1);
      }
      this.prev = s;
    }

    this.pool.update(dt);
    this.bound?.sync();
    this.paint(E);
  };

  paint(E) {
    const t = this.root?.querySelector('#dvState');
    if (!t) return;
    const g = (fn, fb = '—') => { try { const v = fn(); return v == null ? fb : v; } catch { return fb; } };
    const rows = E ? [
      ['level', g(() => (E.site() + 1) + ' / ' + E.debug.rooms())],
      ['mode', g(() => E.mode())],
      ['x, y', g(() => `${E.player.x.toFixed(1)}, ${E.player.y.toFixed(1)}`)],
      // counts() is {bolts, ofBolts, golden, ofGolden} — `bolts` is how many
      // you HAVE, not how many there are, which read as "0 / 0" until it
      // was checked against main.js rather than guessed
      ['bolts', g(() => { const c = E.debug.counts(); return `${c.bolts} / ${c.ofBolts}`; })],
      ['golden', g(() => { const c = E.debug.counts(); return `${c.golden} / ${c.ofGolden}`; })],
      ['stomps', g(() => E.debug.stomps())],
      ['machine', g(() => { const m = E.debug.machine(); return m ? `${m.kind} @${m.x.toFixed(1)}${m.tamed ? ' (ridden)' : ''}` : 'none'; })],
      ['bank', g(() => { const b = E.debug.bank(); return b ? `${b.remaining} left` : '—'; })],
      ['wall', g(() => { const w = E.debug.wall(); return w ? `${w.hits} hits` : '—'; })],
      ['tris', g(() => E.debug.tris())],
      ['particles', String(this.pool.live) + (this.pool.dropped ? ` (+${this.pool.dropped} dropped)` : '')],
      ['sfx', this.audio.ctx ? this.audio.recent(3).join(' ') || 'ready' : 'not started'],
    ] : [['game', 'waiting for __eeri…']];
    t.innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td class="v">${v}</td></tr>`).join('');
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.bound?.dispose();
    this.audio.dispose();
    this.root?.remove();
    this.toggle?.remove();
  }
}

/** Convenience for `dev.html`. */
export function mountDevMenu(target, host) {
  return new DevMenu(target).mount(host);
}

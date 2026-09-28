// The HUD: the debt at the top, the handle at the bottom, and a panel for
// whichever station you have turned to. DOM over the canvas — text is text.
//
// It reads the engine and calls the actions it was handed; it never touches
// the engine's state itself, so a button and a key and a pad press all take
// exactly the same path.

import { CHARMS, DEALS, LOCKS, SHIFTS_PER_DEADLINE } from './data.js?v=7';
import { FAMILY, GLYPH } from './view/room.js?v=7';

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
const charm = id => CHARMS.find(c => c.id === id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor(actions) {
    this.a = actions;
    this.sig = {};
    this.sel = 0;
    this.toastT = 0;
    this.lastStation = null;
    // the lock pips
    const locks = $('locks');
    for (let i = 0; i < LOCKS; i++) locks.appendChild(el('i'));
    // tabs
    for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => actions.turn(t.dataset.st));
    $('lever').addEventListener('click', () => actions.startShift());
    $('mute').addEventListener('click', () => actions.mute());
    $('pause').addEventListener('click', () => actions.pause());
    // the power slider: drag anywhere on it
    const pw = $('power');
    const setFrom = ev => {
      const r = pw.getBoundingClientRect();
      actions.setPower(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)));
    };
    pw.addEventListener('pointerdown', ev => { pw.setPointerCapture(ev.pointerId); setFrom(ev); ev.preventDefault(); });
    pw.addEventListener('pointermove', ev => { if (pw.hasPointerCapture(ev.pointerId)) setFrom(ev); });
    pw.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowLeft') { actions.nudgePower(-0.02); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { actions.nudgePower(0.02); ev.preventDefault(); }
    });
    // FIRE: hold to stream, the way a real handle is held
    // The press is taken FIRST and the capture second: a capture can throw (a
    // pointer the browser has already let go of), and when it threw first the
    // handle never turned — the gate found it with a synthetic thumb.
    const fire = $('fire');
    let fireId = null;
    const down = ev => {
      ev.preventDefault();
      fireId = ev.pointerId;
      actions.fireDown(); fire.classList.add('held');
      try { fire.setPointerCapture(ev.pointerId); } catch { /* the release listeners below still hear it */ }
    };
    const up = ev => { if (ev && fireId !== null && ev.pointerId !== undefined && ev.pointerId !== fireId) return; fireId = null; actions.fireUp(); fire.classList.remove('held'); };
    fire.addEventListener('pointerdown', down);
    fire.addEventListener('pointerup', up);
    fire.addEventListener('pointercancel', up);
    fire.addEventListener('lostpointercapture', up);
    // belt and braces for a thumb: a touch that ends anywhere lets go
    addEventListener('touchend', ev => { if (fireId !== null && ![...ev.touches].some(t => t.target === fire)) up(); }, { passive: true });
    fire.addEventListener('contextmenu', ev => ev.preventDefault());
    fire.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); } });
    this.touch = matchMedia('(pointer: coarse)').matches;
    if (this.touch) $('keys').textContent = 'drag the power bar · hold FIRE · swipe or use the tabs to turn round';
  }

  // ── every frame ─────────────────────────────────────────────────────
  update(e, station, dt = 1 / 60) {
    // the top bar
    const due = e.phase === 'due';
    this.set('deadline', `${e.deadline}/${LOCKS}${e.deadline > LOCKS ? '+' : ''}`, () => {
      $('deadline').firstElementChild.textContent = `${Math.min(e.deadline, 99)}/${LOCKS}`;
      [...$('locks').children].forEach((n, i) => n.classList.toggle('open', i < e.deadline - 1 || e.phase === 'won'));
    });
    this.set('debt', `${e.atm}/${e.debt}/${due}/${e.shift}`, () => {
      const d = $('debt');
      d.firstChild.textContent = due ? 'DUE NOW' : `In the ATM · shift ${Math.min(e.shift, SHIFTS_PER_DEADLINE)}/${SHIFTS_PER_DEADLINE}`;
      d.querySelector('b').textContent = `${e.atm} / ${e.debt}`;
      d.classList.toggle('due', due);
      $('debtbar').firstElementChild.style.width = `${Math.min(100, 100 * e.atm / Math.max(1, e.debt))}%`;
    });
    this.set('wallet', `${e.wallet}`, () => { $('wallet').querySelector('b').textContent = `${e.wallet}¢`; });
    // the rack
    this.set('rack', `${e.charms.map(c => c.id).join(',')}/${e.slots}`, () => {
      const r = $('rack'); r.innerHTML = '';
      for (const c of e.charms) {
        const ch = charm(c.id);
        const n = el('button', 'chip', `<span class="g">${GLYPH[ch.family]}</span>${esc(ch.name)}`);
        n.style.setProperty('--c', FAMILY[ch.family]);
        n.title = ch.text;
        n.addEventListener('click', () => this.toast(ch.name.toUpperCase(), ch.text, '', 2600, true));
        r.appendChild(n);
      }
      for (let i = e.charms.length; i < e.slots; i++) r.appendChild(el('div', 'chip empty', '<span class="g">·</span>empty'));
    });

    // the bottom: what the handle shows depends on the phase
    const atMachine = station === 'machine';
    const shift = e.phase === 'shift';
    $('controls').hidden = !(atMachine && shift);
    const lever = $('lever');
    lever.hidden = !(atMachine && (e.phase === 'idle' || due));
    if (!lever.hidden) this.set('lever', `${e.phase}/${e.shift}/${Math.round(e.rules.drops)}`, () => {
      lever.textContent = due ? 'THE DEBT IS DUE — TO THE ATM ◂' : `PULL THE LEVER · SHIFT ${e.shift}/${SHIFTS_PER_DEADLINE}`;
      lever.className = due ? 'big red' : 'big';
    });
    if (shift) {
      $('powerPct').textContent = `${Math.round(e.power * 100)}%`;
      $('power').querySelector('.knob').style.left = `${e.power * 100}%`;
      $('power').setAttribute('aria-valuenow', Math.round(e.power * 100));
      const fever = e.fever.left > 0;
      this.set('drops', `${e.drops}/${e.fever.left}`, () => {
        $('dropsLabel').innerHTML = fever ? `Fever <b style="color:var(--gold)">${e.fever.left}</b>` : `Drops <b>${e.drops}</b>`;
        const d = $('drops'); d.innerHTML = '';
        for (let i = 0; i < e.fever.left; i++) d.appendChild(el('i', 'fever'));
        for (let i = 0; i < e.drops; i++) d.appendChild(el('i'));
      });
      const f = $('fire');
      f.classList.toggle('fever', fever);
      f.disabled = e.drops <= 0 && !fever;
      f.textContent = fever ? 'FEVER' : e.drops <= 0 ? '···' : 'FIRE';
    }
    // hint line
    let hint = '';
    if (atMachine && shift) hint = e.fever.left > 0 ? 'FEVER — the gate on the right is open: crank the power, SHOOT RIGHT ▸'
      : e.drops <= 0 ? 'the machine is winding down…' : this.touch ? '' : '← → power · hold SPACE to fire · Q / E turn';
    if (atMachine && e.phase === 'idle' && this.touch === false) hint = 'ENTER pulls the lever · Q / E to turn to the ATM or the vendor';
    this.set('hint', hint, () => { $('hint').textContent = hint; });
    // tabs
    this.set('tabs', `${station}/${e.phase}`, () => {
      for (const t of document.querySelectorAll('.tab')) {
        t.classList.toggle('on', t.dataset.st === station);
        t.querySelector('.dot')?.remove();
        const alert = (t.dataset.st === 'atm' && due) || (t.dataset.st === 'door' && e.phase === 'phone');
        if (alert) t.appendChild(el('span', 'dot'));
      }
    });
    $('tabs').hidden = e.phase === 'shift' && !atMachine ? false : false;

    // the panels
    if (station !== this.lastStation) { this.sel = 0; this.lastStation = station; }
    $('p-atm').hidden = station !== 'atm';
    $('p-vendor').hidden = station !== 'vendor';
    $('p-door').hidden = station !== 'door';
    if (station === 'atm') this.atm(e);
    if (station === 'vendor') this.vendor(e);
    if (station === 'door') this.door(e);

    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').classList.remove('show'); }
  }

  set(key, sig, fn) { if (this.sig[key] !== sig) { this.sig[key] = sig; fn(); } }

  // ── the ATM ─────────────────────────────────────────────────────────
  atm(e) {
    const due = e.phase === 'due', shift = e.phase === 'shift';
    this.set('p-atm', `${e.atm}/${e.debt}/${e.wallet}/${e.phase}/${e.rules.interest}/${this.sel}`, () => {
      const short = Math.max(0, e.debt - e.atm);
      const p = $('p-atm');
      p.innerHTML = `<h2>PIT SAVINGS &amp; LOAN</h2>
        <p>${due ? `The deadline is here. Whatever is short comes out of your wallet first; if that is not enough, the floor opens.`
          : shift ? 'The ATM takes nothing while the machine is running. Finish the shift.'
          : `Deposited coins pay the debt, are safe from the paw, and earn ${Math.round(e.rules.interest * 100)}% at the end of every shift. They do not come back out.`}</p>
        <div class="num"><span>DEBT, DEADLINE ${e.deadline}</span><b>${e.debt}</b></div>
        <div class="num"><span>IN THE ATM</span><b>${e.atm}</b></div>
        <div class="num"><span>IN YOUR WALLET</span><b>${e.wallet}¢</b></div>
        <div class="num"><span>${due ? 'SHORT' : 'STILL TO FIND'}</span><b style="color:${short ? 'var(--red)' : 'var(--green)'}">${short}</b></div>`;
      const btns = el('div', 'btns');
      const b = (label, cls, fn, off) => { const x = el('button', `big ${cls}`, label); x.disabled = !!off; x.addEventListener('click', fn); btns.appendChild(x); return x; };
      const cant = shift || e.wallet <= 0;
      b('DEPOSIT ALL', 'green', () => this.a.deposit(Infinity), cant);
      b('+10', '', () => this.a.deposit(10), cant);
      if (due) b(short > e.wallet ? `SETTLE — ${short - e.wallet} SHORT` : 'SETTLE THE DEBT', short > e.wallet ? 'red' : '', () => this.a.settle());
      p.appendChild(btns);
      this.mark(p);
    });
  }

  // ── the vendor ──────────────────────────────────────────────────────
  vendor(e) {
    const open = e.canShop();
    this.set('p-vendor', `${JSON.stringify(e.shop)}/${e.wallet}/${e.charms.map(c => c.id)}/${e.slots}/${open}/${this.sel}/${e.deadline}`, () => {
      const p = $('p-vendor');
      p.innerHTML = `<h2>CHARMS</h2><p>${open ? `Charms bend numbers the machine already has. ${e.charms.length}/${e.slots} on your rack.` : 'The vendor is shuttered while the machine runs.'}</p>`;
      const cards = el('div', 'cards');
      e.shop.items.forEach((it, i) => {
        const ch = charm(it.id), price = e.priceOf(it.id);
        const c = el('div', `card${it.sold ? ' sold' : ''}`);
        c.style.setProperty('--c', FAMILY[ch.family]);
        c.innerHTML = `<div class="fam">${GLYPH[ch.family]} ${ch.family}${ch.rarity === 3 ? ' · rare' : ch.rarity === 2 ? ' · uncommon' : ''}</div><h3>${esc(ch.name)}</h3><div class="txt">${esc(ch.text)}</div>`;
        const buy = el('button', 'buy', it.sold ? 'SOLD' : `${i + 1} · BUY ${price}¢`);
        buy.disabled = it.sold || !open || e.wallet < price || e.charms.length >= e.slots;
        if (!it.sold && e.charms.length >= e.slots) buy.textContent = 'RACK FULL';
        buy.addEventListener('click', () => this.a.buy(i));
        c.appendChild(buy);
        cards.appendChild(c);
      });
      p.appendChild(cards);
      const btns = el('div', 'btns');
      const rr = el('button', 'big', `REROLL · ${e.rerollCost()}¢`);
      rr.disabled = !open || e.wallet < e.rerollCost();
      rr.addEventListener('click', () => this.a.reroll());
      btns.appendChild(rr);
      p.appendChild(btns);
      if (e.charms.length) {
        const mine = el('div', 'mine');
        e.charms.forEach((c, i) => {
          const ch = charm(c.id);
          const n = el('button', 'chip', `<span class="g">${GLYPH[ch.family]}</span>${esc(ch.name)}<span class="sell">SELL +${Math.floor(c.paid / 2)}</span>`);
          n.style.setProperty('--c', FAMILY[ch.family]);
          n.disabled = !open;
          n.addEventListener('click', () => this.a.sell(i));
          mine.appendChild(n);
        });
        p.appendChild(el('p', '', 'Your rack — tap to sell for half what you paid:'));
        p.appendChild(mine);
      }
      this.mark(p);
    });
  }

  // ── the door and the phone ──────────────────────────────────────────
  door(e) {
    const ringing = e.phase === 'phone';
    this.set('p-door', `${e.phase}/${e.deadline}/${ringing ? e.phone.deals.join() : ''}/${this.sel}`, () => {
      const p = $('p-door');
      const left = Math.max(0, LOCKS - (e.deadline - 1));
      if (!ringing) {
        p.innerHTML = `<h2>THE DOOR</h2><p>${e.phase === 'won' ? 'The last padlock is on the floor. The door is open.'
          : `${left} padlock${left === 1 ? '' : 's'} left. One comes off for every debt you pay. The red phone only rings when you have paid.`}</p>`;
        return;
      }
      p.innerHTML = `<h2>THE PHONE IS RINGING</h2><div class="line" id="callLine"></div><p>Toko has three deals. Take one.</p>`;
      const cards = el('div', 'cards');
      e.phone.deals.forEach((id, i) => {
        const d = DEALS.find(x => x.id === id);
        const c = el('div', 'card');
        c.style.setProperty('--c', '#ff4d6d');
        c.innerHTML = `<div class="fam">☎ deal</div><h3>${esc(d.name)}</h3><div class="txt">${esc(d.text)}</div>`;
        const pick = el('button', 'buy', `${i + 1} · TAKE IT`);
        pick.addEventListener('click', () => this.a.pick(i));
        c.appendChild(pick);
        cards.appendChild(c);
      });
      p.appendChild(cards);
      this.type($('callLine'), `“${e.phone.line}”`);
      this.mark(p);
    });
  }

  // a typewriter for the raccoon's line, off one timer
  type(node, text) {
    clearInterval(this.typing);
    let i = 0;
    this.typing = setInterval(() => {
      i += 2;
      node.textContent = text.slice(0, i);
      this.a.voice?.();
      if (i >= text.length) clearInterval(this.typing);
    }, 30);
  }

  // ── keyboard and pad inside a panel ─────────────────────────────────
  actionable(station) {
    const p = $(`p-${station}`);
    return p && !p.hidden ? [...p.querySelectorAll('button:not(:disabled)')] : [];
  }
  mark(p) {
    const list = [...p.querySelectorAll('button:not(:disabled)')];
    list.forEach((b, i) => b.classList.toggle('sel', i === this.sel && this.navUsed));
  }
  nav(station, d) {
    const list = this.actionable(station);
    if (!list.length) return;
    this.navUsed = true;
    this.sel = (this.sel + d + list.length) % list.length;
    list.forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  }
  activate(station) {
    const list = this.actionable(station);
    list[Math.min(this.sel, list.length - 1)]?.click();
  }

  // ── messages ────────────────────────────────────────────────────────
  toast(text, sub = '', cls = '', ms = 1400, force = false) {
    const t = $('toast');
    if (!force && this.toastT > 0.4 && this.toastPri > (cls === 'big' ? 2 : 1)) return;
    t.className = `show ${cls}`;
    t.innerHTML = `${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}`;
    this.toastT = ms / 1000;
    this.toastPri = cls === 'big' ? 2 : 1;
  }

  pop(x, y, text, cls = '') {
    const p = el('div', `pop ${cls}`, esc(text));
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    $('pops').appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }

  // ── the end ─────────────────────────────────────────────────────────
  end(kind, e, best) {
    const s = e.stats;
    const sheet = $('endSheet');
    const rows = [
      ['coins pushed', s.value], ['deadline', `${e.deadline}/${LOCKS}`], ['shots', s.fired], ['spins', s.spins],
      ['fevers', s.fevers], ['stolen', s.stolen], ['charms bought', s.charmsBought], ['best shift', s.bestShift],
    ];
    const title = kind === 'won' ? 'OUT.' : 'YOU FELL.';
    const line = kind === 'won'
      ? 'The eighth padlock hits the floor and the door swings out onto a staircase. It goes up a long way. Toko says nothing, which is the nicest thing he has ever said.'
      : `The ATM was ${e.debt - e.atm} short. The floor under the stool opens, and the pit turns out to have a pit.`;
    sheet.innerHTML = `<h1 style="font-size:clamp(44px,12vw,72px)">${title}</h1>
      <p style="margin-top:14px">${line}</p>
      <div class="stats">${rows.map(([k, v]) => `<div>${k} <b>${v}</b></div>`).join('')}</div>
      <p class="keys">seed ${e.seed}${best ? ` · your best: ${best} coins` : ''}</p>`;
    const btns = el('div', 'btns');
    if (kind === 'won') {
      const more = el('button', 'big', 'GO BACK DOWN (ENDLESS)');
      more.addEventListener('click', () => this.a.endless());
      btns.appendChild(more);
    }
    const again = el('button', `big ${kind === 'won' ? 'green' : ''}`, 'NEW RUN');
    again.addEventListener('click', () => this.a.restart());
    btns.appendChild(again);
    sheet.appendChild(btns);
    $('end').hidden = false;
    again.focus();
  }
}

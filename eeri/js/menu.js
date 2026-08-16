// EERI — the in-game menu (owner direction, 2026-08-15):
//
// > *"we should also add a menu that can be accessed during the game.
// > attach it to the start and select buttons."*
//
// Both plates have already DRAWN a SELECT and a START pill — the DMG's pair
// and the arcade panel's — and neither did anything, which is worse than
// not drawing them: a control that is pictured and dead teaches the player
// that pictures are not controls.
//
// SELECT and START open the same menu. That is deliberate rather than lazy:
// on the original hardware they were two buttons because a cartridge needed
// somewhere to put a second idea, and a six-year-old should not have to
// remember which of two identical-looking pills is the one that helps.
//
// WHAT IT IS NOT: it is not a settings screen. Everything in it is a thing
// a child stuck in a room actually wants — carry on, start this bit again,
// go to a level, change the language, go home. No sliders, no toggles that
// need reading, and nothing that can put the game in a state you cannot get
// out of by pressing the same button again.
//
// THE PAUSE IS REAL. `paused()` gates the whole update half of the loop in
// main.js, not just input — a menu that leaves the world running is how you
// come back to find a robot standing on you.

import { t, lang, LANGS, setLang, STRINGS } from './lang.js?v=25';

const CSS = `
#menu {
  position: fixed; inset: 0; z-index: 14; display: grid; place-items: center;
  background: rgba(12, 9, 6, 0.72);
  font-family: system-ui, sans-serif; -webkit-user-select: none; user-select: none;
}
#menu .card {
  width: min(92vw, 420px); max-height: 86vh; overflow-y: auto;
  background: #2b2118; border: 4px solid #14100c; border-radius: 16px;
  box-shadow: 0 10px 0 rgba(0,0,0,0.35); padding: 18px;
  display: grid; gap: 10px;
}
#menu h2 {
  margin: 0 0 2px; color: #ffb01f; text-align: center;
  font: 900 20px/1 system-ui, sans-serif; letter-spacing: 0.18em;
}
#menu button {
  min-height: 52px; padding: 12px 16px; width: 100%;
  border: 3px solid #14100c; border-radius: 12px;
  background: #f3e6cf; color: #2b2118;
  font: 800 17px/1 system-ui, sans-serif; letter-spacing: 0.06em;
  cursor: pointer; touch-action: manipulation;
}
#menu button.go { background: #ffb01f; }
#menu button:active { transform: translateY(2px); }
#menu button:focus-visible { outline: 4px solid #fff; outline-offset: 3px; }
#menu .rowlbl {
  color: #d9c9ab; font: 700 12px/1 system-ui, sans-serif;
  letter-spacing: 0.16em; text-align: center; margin-top: 4px;
}
#menu .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
#menu .grid button { min-height: 48px; font-size: 15px; letter-spacing: 0.02em; }
#menu .grid button[aria-current="true"] { background: #ffb01f; }
`;

let el = null;
let open = false;

export function menuOpen() { return open; }

// ---- driving it from a controller ---------------------------------------
// The menu is DOM, so the pad drives real focus rather than a parallel
// "selected index" — that way the keyboard, a screen reader and the pad all
// agree on what is highlighted, and the focus ring is the highlight.
function items() {
  return el ? [...el.querySelectorAll('button')] : [];
}

export function menuMove(d) {
  const list = items(); if (!list.length) return;
  const at = list.indexOf(document.activeElement);
  const next = list[(at < 0 ? 0 : at + d + list.length) % list.length];
  next?.focus({ preventScroll: false });
}

export function menuPick() {
  const a = document.activeElement;
  if (a && items().includes(a)) a.click();
}

/**
 * @param {object} api  what the menu is allowed to do — passed in rather
 *   than imported, so this module knows nothing about the game's internals
 *   and the game keeps one place where those verbs live.
 *   { levels: [{i, label}], current: () => number, goSite(i), restart(),
 *     home() }
 */
export function toggleMenu(api) { open ? closeMenu() : openMenu(api); }

export function closeMenu() {
  open = false;
  el?.remove();
  el = null;
}

export function openMenu(api) {
  if (open) return;
  open = true;

  if (!document.getElementById('menuCss')) {
    const style = document.createElement('style');
    style.id = 'menuCss';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  el = document.createElement('div');
  el.id = 'menu';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="card">
      <h2>${STRINGS.en.title.toUpperCase()}</h2>
      <button type="button" class="go" data-a="resume"></button>
      <button type="button" data-a="restart"></button>
      <div class="rowlbl" data-l="levels"></div>
      <div class="grid" id="menuLevels"></div>
      <div class="rowlbl" data-l="lang"></div>
      <div class="grid" id="menuLangs"></div>
      <button type="button" data-a="home"></button>
    </div>`;
  document.body.appendChild(el);

  const paint = () => {
    el.querySelector('[data-a="resume"]').textContent = t('mResume');
    el.querySelector('[data-a="restart"]').textContent = t('mRestart');
    el.querySelector('[data-a="home"]').textContent = t('mHome');
    el.querySelector('[data-l="levels"]').textContent = t('mLevels');
    el.querySelector('[data-l="lang"]').textContent = t('mLang');
    for (const b of el.querySelectorAll('#menuLangs button')) {
      b.setAttribute('aria-current', String(b.dataset.code === lang()));
    }
  };

  const levels = el.querySelector('#menuLevels');
  for (const L of api.levels) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = L.label;
    b.setAttribute('aria-current', String(L.i === api.current()));
    b.addEventListener('click', () => { closeMenu(); api.goSite(L.i); });
    levels.appendChild(b);
  }

  const langs = el.querySelector('#menuLangs');
  for (const code of LANGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.code = code;
    b.textContent = STRINGS[code].langName;
    // the language switch REPAINTS rather than reopening: a menu that
    // closes itself when you change the language is a menu that argues
    b.addEventListener('click', () => { setLang(code); paint(); });
    langs.appendChild(b);
  }

  el.querySelector('[data-a="resume"]').addEventListener('click', closeMenu);
  el.querySelector('[data-a="restart"]').addEventListener('click', () => { closeMenu(); api.restart(); });
  el.querySelector('[data-a="home"]').addEventListener('click', () => api.home());
  // the backdrop is a way out too — the same rule the hub's panels follow
  el.addEventListener('pointerdown', (e) => { if (e.target === el) closeMenu(); });

  paint();
  el.querySelector('[data-a="resume"]').focus({ preventScroll: true });
}

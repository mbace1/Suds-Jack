// EERI — the intro screen (owner direction, 2026-08-14).
//
// > *"Intro screen with added logo and text for story brief. / eeri /
// > seikkailee työkoneiden ja robottien maailmassa"*
//
// The game used to boot straight into level 1 from a `#boot` div that said
// EERI in system-ui and then vanished. That is a loading state, not a title
// screen — nothing named the game, nothing said what it was about, and the
// Finnish six-year-old it is for met it in English.
//
// So: a real title. The logo, the name, one line of story, START. Three
// languages, switchable right here, because the intro is the only screen
// where a language toggle costs nothing — it is the one moment nobody is
// mid-jump.
//
// **The logo is behind the asset seam** (`assets/manifest.json` → `logo`).
// The owner is having art draw the real one — a wordmark built around the
// character — so this module must not bake a logo in. Until the file lands
// it draws a **placeholder wordmark in code**: the name in the game's own
// two colours with the hard shadow the HUD already uses. It is honest
// about being temporary by being plain, not by being ugly; a title screen
// that looks broken reads as a broken game even when it is a placeholder.
//
// Nothing here blocks the game: if the logo 404s or the manifest has no
// entry, the wordmark ships and START still starts.

import { t, lang, LANGS, setLang, STRINGS } from './lang.js?v=38';
import { uiAsset } from './assets.js?v=38';

const CSS = `
#intro {
  position: fixed; inset: 0; z-index: 12; display: grid;
  grid-template-rows: 1fr auto 1fr; justify-items: center;
  padding: max(16px, env(safe-area-inset-top)) 20px max(16px, env(safe-area-inset-bottom));
  background: radial-gradient(120% 90% at 50% 28%, #6fc2f2 0%, #4aa8e8 55%, #2f86c4 100%);
  color: #fff; text-align: center;
  font-family: system-ui, sans-serif; -webkit-user-select: none; user-select: none;
}
#intro.go { animation: introOut 0.32s ease-in forwards; }
@keyframes introOut { to { opacity: 0; transform: scale(1.04); } }

#intro .mid { grid-row: 2; display: grid; justify-items: center; gap: 18px; max-width: 660px; }

/* the logo slot: a painted file when there is one, the wordmark when not.
   Height is capped in vh as well as px so a landscape phone — the shape
   that matters — never loses the story line below it. */
#introLogo { display: block; max-width: min(88vw, 560px); max-height: min(34vh, 220px); }
#introWord {
  font: 900 clamp(52px, 15vw, 132px)/0.86 system-ui, sans-serif;
  letter-spacing: 0.02em; color: #ffb01f;
  text-shadow: 0 6px 0 #1a1410, 0 10px 24px rgba(26,20,16,0.35);
}
#introBrief {
  font: 700 clamp(15px, 3.4vw, 22px)/1.35 system-ui, sans-serif;
  letter-spacing: 0.02em; color: #fff; max-width: 22em;
  text-shadow: 0 2px 0 rgba(26,20,16,0.4);
}
#introStart {
  min-width: 200px; min-height: 56px; padding: 14px 34px;
  border: 4px solid #1a1410; border-radius: 14px; background: #ffb01f; color: #1a1410;
  font: 900 22px/1 system-ui, sans-serif; letter-spacing: 0.14em;
  box-shadow: 0 5px 0 #1a1410; cursor: pointer; touch-action: manipulation;
}
#introStart:active { transform: translateY(4px); box-shadow: 0 1px 0 #1a1410; }
#introStart:focus-visible, #intro .lang button:focus-visible {
  outline: 4px solid #fff; outline-offset: 3px;
}
/* the language row sits at the FOOT, not beside the title: it is a
   set-once switch and must not compete with START for the first look */
#intro .lang { grid-row: 3; align-self: end; display: flex; gap: 8px; }
#intro .lang button {
  min-width: 56px; min-height: 44px; padding: 10px 14px;
  border: 2px solid rgba(255,255,255,0.7); border-radius: 10px;
  background: rgba(26,20,16,0.28); color: #fff;
  font: 700 14px/1 system-ui, sans-serif; letter-spacing: 0.08em;
  cursor: pointer; touch-action: manipulation;
}
#intro .lang button[aria-pressed="true"] { background: #fff; color: #1a1410; border-color: #fff; }
@media (prefers-reduced-motion: reduce) { #intro.go { animation: none; opacity: 0; } }
`;

/**
 * Show the title screen. Resolves when the player starts — the caller
 * awaits it and then builds the level, so nothing heavy competes with the
 * first paint of the thing they are looking at.
 */
export function showIntro() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'intro';
  el.innerHTML = `
    <div class="mid">
      <div id="introLogoSlot"></div>
      <p id="introBrief"></p>
      <button id="introStart" type="button"></button>
    </div>
    <div class="lang" role="group"></div>`;
  document.body.appendChild(el);

  const slot = el.querySelector('#introLogoSlot');
  const brief = el.querySelector('#introBrief');
  const start = el.querySelector('#introStart');
  const langRow = el.querySelector('.lang');

  // the wordmark, until the painted logo lands
  slot.innerHTML = `<div id="introWord">${STRINGS.en.title}</div>`;

  // …and the painted one, if the manifest has it. Additive and late: the
  // screen is already up and readable, and it swaps only once the file has
  // decoded, so a slow logo never shows as a gap where the title goes.
  const logoSrc = uiAsset('logo');
  if (logoSrc) {
    const img = new Image();
    img.id = 'introLogo';
    img.alt = STRINGS.en.title;
    img.onload = () => slot.replaceChildren(img);
    img.onerror = () => { /* the wordmark stands */ };
    img.src = logoSrc;
  }

  const paint = () => {
    brief.textContent = t('brief');
    start.textContent = t('start');
    document.title = `${STRINGS.en.title.toUpperCase()} — ${t('brief')}`;
    for (const b of langRow.children) {
      b.setAttribute('aria-pressed', String(b.dataset.code === lang()));
    }
  };

  for (const code of LANGS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.code = code;
    b.textContent = STRINGS[code].langName;
    b.addEventListener('click', () => { setLang(code); paint(); });
    langRow.appendChild(b);
  }
  paint();

  return new Promise((resolve) => {
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      el.classList.add('go');
      // resolve immediately rather than after the fade: the level build is
      // the slow part, and running it under the fade hides the wait
      resolve();
      setTimeout(() => { el.remove(); style.remove(); }, 340);
    };
    // pointerup AND touchend, never click — the trap `hub/shell.js` and
    // `toko/js/signature.js` both paid for: this game preventDefaults touch
    // outside its own UI, which kills the synthesised click.
    start.addEventListener('pointerup', go);
    start.addEventListener('touchend', go);
    // and any way in from a pad or a keyboard, since this is a
    // controller-first game and START must not need a pointer
    addEventListener('keydown', (e) => {
      if (['Enter', 'Space', 'KeyE', 'ArrowRight'].includes(e.code)) go();
    }, { once: false });
    el.__padStart = go;   // main.js calls this when the pad's A/Start lands
    start.focus({ preventScroll: true });
  });
}

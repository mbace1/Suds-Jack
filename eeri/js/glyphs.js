// EERI — the button faces (DESIGN §6.4, owner direction 2026-08-14).
//
// > *"Those buttons can have small pic of the action or icon of the
// > character in motion, like old arcades with illustrated backboards."*
//
// So a button is not a triangle. Each one carries **a small picture of the
// thing it does**, and where the thing is something Eeri does, the picture
// is Eeri doing it. That is the arcade backboard idea at button scale:
// you read the control by recognising the pose, not by decoding an arrow.
//
// Drawn as inline SVG rather than as PNGs, for three reasons that all
// matter more than they look:
//
//  1. **They are UI, and UI is drawn in code everywhere on this site** —
//     `hub/art.js` paints nine marquees, `toko/js/face.js` paints the mark.
//     A glyph set that is a file is a glyph set that gets out of step with
//     the game that uses it.
//  2. **They scale.** The touch buttons are 62px, the hint line is 13px
//     text, and DESIGN §6.4 says it must be ONE set used by both. A vector
//     is the only thing that survives that range.
//  3. **They re-colour.** `currentColor` means a glyph inherits the button
//     it sits in, so the machine-yellow/ink pair in §6.4 is a CSS change,
//     not a re-export.
//
// **The seam is still here**, because the owner has art coming: a `glyphs`
// block in `assets/manifest.json` may name a painted sheet, and `art()`
// prefers it when it is live. Until then these ship, and they are not
// placeholders in the apologetic sense — an arcade backboard drawn in two
// colours is the correct answer at this size.
//
// The house rules they obey: **no key caps and no mouse icons, ever**
// (§6.4 — this game is controller-first and mobile-friendly, and a WASD
// diagram is neither), and the silhouette carries the read, because at
// 24px inside a 62px circle there is no room for anything else.

// One figure, posed. The body is a stack of flat shapes — the same
// language as the kid himself (`kid.js` builds him from boxes), so the
// button and the character on screen are recognisably the same person.
// Everything is drawn in a 24×24 box with the feet near y=21.
const F = {
  // running: leading knee up, trailing leg back, arms opposed. `d` is the
  // facing (+1 right, −1 left) and the whole figure mirrors about x=12.
  run: (d) => `
    <g transform="translate(12,0) scale(${d},1) translate(-12,0)">
      <circle cx="13" cy="6" r="3.1"/>
      <path d="M11 9 L15.5 9 L15 15 L10.5 15 Z"/>
      <path d="M15.5 10 L19.5 12.5 L18.5 14.5 L14.5 12 Z"/>
      <path d="M11 10 L7.5 13 L8.5 15 L12 12.5 Z"/>
      <path d="M14.5 15 L17.5 18 L16 20 L13 17.5 Z"/>
      <path d="M11 15 L9 19 L6.5 20.5 L6 18.5 L8 17 Z"/>
    </g>`,
  // jumping: both arms up, knees tucked — the pose that also reads as the
  // stomp, which is the same button
  jump: `
    <g>
      <circle cx="12" cy="6" r="3.1"/>
      <path d="M9.7 9 L14.3 9 L14 14.5 L10 14.5 Z"/>
      <path d="M9.7 9.5 L7 5.5 L8.8 4.2 L11.4 8 Z"/>
      <path d="M14.3 9.5 L17 5.5 L15.2 4.2 L12.6 8 Z"/>
      <path d="M10 14.5 L8.5 18.5 L6 19 L6.2 16.8 L8.2 16 Z"/>
      <path d="M14 14.5 L16.5 17.5 L18.5 18.5 L17.6 20.4 L14.6 19 Z"/>
    </g>`,
  // climbing: one hand high, one low, on a rung ladder. The ladder is part
  // of the picture because "up" alone is the ambiguous one — it is climb on
  // foot and boom-up in a cab, and the ladder says which is meant.
  climb: (d) => `
    <g opacity="0.55">
      <rect x="4" y="2" width="1.6" height="20" rx="0.6"/>
      <rect x="18.4" y="2" width="1.6" height="20" rx="0.6"/>
      <rect x="4" y="6" width="16" height="1.4" rx="0.6"/>
      <rect x="4" y="12" width="16" height="1.4" rx="0.6"/>
      <rect x="4" y="18" width="16" height="1.4" rx="0.6"/>
    </g>
    <g transform="translate(12,12) scale(1,${d}) translate(-12,-12)">
      <circle cx="12" cy="6.5" r="2.9"/>
      <path d="M9.8 9.2 L14.2 9.2 L13.9 15 L10.1 15 Z"/>
      <path d="M9.8 10 L6.6 6.6 L8.2 5.2 L11.2 8.6 Z"/>
      <path d="M14.2 11 L16.6 13.4 L15.2 14.9 L12.8 12.6 Z"/>
      <path d="M10.1 15 L8.6 19.5 L10.6 20.2 L12 16 Z"/>
      <path d="M13.9 15 L15.4 18.2 L13.5 19 L12.2 16 Z"/>
    </g>`,
  // climbing in: the kid stepping up onto a machine's step, which is the
  // one action that is about the MACHINE rather than about him
  ride: `
    <g opacity="0.6">
      <path d="M2 20 L22 20 L22 15 L16 15 L16 11 L7 11 L7 15 L2 15 Z"/>
      <circle cx="7" cy="21" r="2.4"/>
      <circle cx="17" cy="21" r="2.4"/>
    </g>
    <g>
      <circle cx="11" cy="4.6" r="2.7"/>
      <path d="M9 7.2 L13 7.2 L12.6 12 L9.4 12 Z"/>
      <path d="M13 8 L16.6 9.6 L15.9 11.4 L12.4 10 Z"/>
      <path d="M9.4 12 L7.6 15.2 L9.4 16.2 L11 13 Z"/>
    </g>`,
  // digging: the bucket coming down. Down is the bucket in a cab and the
  // way back down a ladder on foot; the bucket is the more distinctive of
  // the two, and the arrow underneath says the direction either way.
  dig: `
    <g>
      <path d="M4 4 L7 4 L14.5 12.5 L12 15 Z"/>
      <path d="M10.5 13.5 L17.5 13.5 L19 19 Q13.5 21.5 9 19 Z"/>
      <rect x="9" y="11.6" width="3.2" height="3.2" rx="0.8" transform="rotate(-45 10.6 13.2)"/>
    </g>`,
};

const SVG = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

// A **direction mark** rides in the corner of the movement buttons. The
// picture says what the action is; this says which way, and it is what
// keeps a running figure from being mistaken for a decoration.
const TICK = {
  left:  '<path d="M9 2 L4.6 6 L9 10" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>',
  right: '<path d="M15 2 L19.4 6 L15 10" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>',
  up:    '<path d="M8 4 L12 0.4 L16 4" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>',
  down:  '<path d="M8 20 L12 23.6 L16 20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>',
};

export const GLYPHS = {
  left:   () => SVG(F.run(-1) + TICK.left),
  right:  () => SVG(F.run(1) + TICK.right),
  up:     () => SVG(F.climb(1) + TICK.up),
  down:   () => SVG(F.dig + TICK.down),
  jump:   () => SVG(F.jump),
  action: () => SVG(F.ride),
};

let sheet = null;   // set by useGlyphSheet() when painted art ships

/**
 * The face for one control. Returns an HTML string, because that is what
 * both callers want: `button.innerHTML` and the hint line's markup.
 *
 * If a painted sheet is live in the manifest, a frame from it is used
 * instead — the seam, so the owner's art replaces this without the game
 * knowing (`assets/README.md` § glyph sheet).
 */
export function art(name) {
  if (sheet && sheet[name]) {
    return `<img src="${sheet[name]}" alt="" aria-hidden="true" draggable="false">`;
  }
  return (GLYPHS[name] || GLYPHS.jump)();
}

/** Point the set at a painted sheet: `{ left: url, right: url, … }`. */
export function useGlyphSheet(frames) { sheet = frames || null; }

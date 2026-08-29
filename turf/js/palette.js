// Nordic 90s street underworld: wet concrete and sodium light, not neon.
// Deliberately desaturated next to the rest of the arcade's brights — this
// cabinet's own colour, same rule every marquee follows (see hub/art.js).
export const PAL = {
  VOID: '#07080b',
  FLOOR_A: '#2c3038',
  FLOOR_B: '#33373f',
  FLOOR_LINE: '#1c1e24',
  FLOOR_HOME: '#2a343a',   // player's near edge, a faint cold tint
  FLOOR_FAR: '#3a2f2c',    // enemies' far edge, a faint warm-rust tint

  COVER_FULL: '#4d525c',
  COVER_FULL_DK: '#33363d',
  COVER_FULL_EDGE: '#14161a',
  COVER_PARTIAL: '#8a8f97',
  COVER_PARTIAL_DK: '#6a6f77',

  PLAYER: '#6fb8d9',
  PLAYER_DK: '#3f7590',
  ENEMY: '#c9663f',
  ENEMY_DK: '#8c4229',
  INK: '#12141a',

  // Fill alpha bumped from 0.30 (v8): legible on a desktop screenshot but a
  // real phone playtest of v8 found it nearly invisible at the board's
  // actual on-device size — a wash this faint reads as "slightly different
  // floor tile," not "you can move here."
  MOVE_HI: 'rgba(111,184,217,0.48)',
  MOVE_HI_EDGE: 'rgba(140,205,235,0.95)',
  ATTACK_HI: 'rgba(201,102,63,0.48)',
  ATTACK_HI_EDGE: 'rgba(240,140,90,0.95)',
  SELECT_EDGE: '#f2e2a0',

  HP_GOOD: '#5ad1a8',
  HP_MID: '#e0c24a',
  HP_BAD: '#e0453a',
  HP_TRACK: '#20232a',

  TELEGRAPH: '#f2b23a',
  CURSOR: '#eaeef2',

  UI_TEXT: '#d6d9de',
  UI_DIM: '#7b818c',
  UI_PANEL: '#14161c',
  UI_LINE: '#262a32',
  ACCENT: '#6fa8c9',
};

// Blend two hex colours (same trick hub/art.js uses for ramps).
export const mix = (c1, c2, t) => {
  const k = Math.max(0, Math.min(1, t));
  const ch = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = i => Math.round(ch(c1, i) + (ch(c2, i) - ch(c1, i)) * k).toString(16).padStart(2, '0');
  return `#${v(0)}${v(1)}${v(2)}`;
};

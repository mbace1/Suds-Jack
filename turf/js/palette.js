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
  // Momentum (momentum.js): the run a unit is still carrying. Its own colour,
  // not an HP shade — it is a different quantity and must never be misread as
  // health at a glance on a 14px-wide strip.
  MOMENTUM: '#f2e2a0',
  // The unit the board is currently about — the enemy taking its step right
  // now. Warm and bright against everything else on screen, because during
  // the enemy phase this is the only thing worth looking at.
  ACTING: '#ffc36b',
  // An arrival due next round. The enemy colour, because that is what is
  // coming — but hollow and pulsing rather than solid, since nothing is
  // standing there yet.
  ARRIVAL: 'rgba(201,102,63,0.22)',
  ARRIVAL_EDGE: 'rgba(240,140,90,0.9)',
  // Ammo. Cool and neutral so it cannot be mistaken for the warm momentum
  // pips sitting a few pixels away — they are different resources and the
  // whole point of showing both is that a glance tells them apart.
  AMMO: '#9fc7de',
  AMMO_SPENT: '#3a4048',
  // An armed ability's legal targets. Its own colour, not the attack orange:
  // while an ability is armed the board means something different, and
  // reusing the ordinary attack highlight would say the opposite.
  // The forecast badge over an attackable target. LETHAL gets its own colour
  // because "this kills them" is a different KIND of fact from "this is a
  // 70% shot", and a player scanning the board should be able to find the
  // finishable enemy without reading any digits at all.
  // Extraction pads and the objective marker. Green because it is the one
  // thing on the board that is unambiguously GOOD to stand on — every other
  // overlay here is either a threat or a capability.
  OBJECTIVE: 'rgba(90,209,168,0.30)',
  OBJECTIVE_EDGE: 'rgba(120,240,195,0.95)',
  // Firing positions offered while aiming. The BEST one is marked brighter:
  // the default has to be visible as a default, or the choice reads as work
  // rather than as an override.
  AIM_HI: 'rgba(240,140,90,0.30)',
  AIM_EDGE: 'rgba(240,140,90,0.85)',
  AIM_BEST: 'rgba(255,200,120,1)',
  FORECAST: '#d6d9de',
  FORECAST_LETHAL: '#ff8a7a',
  ABILITY_HI: 'rgba(242,226,160,0.42)',
  ABILITY_HI_EDGE: 'rgba(255,240,190,0.95)',

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

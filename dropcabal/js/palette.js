// Drop Cabal — central colour scheme (suds-sunset: Tempest-psychedelic sky over a dusty field).
// Scene / prop tints live here; enemy gel colours stay in enemy.js (they mirror toko-drop).

export const PAL = {
  // sky gradient canvas (top → horizon) + sun disc
  SKY_TOP:    '#141c50',
  SKY_MID:    '#5a3aa8',
  SKY_HORIZON:'#ff6fa0',
  SUN:        '#ffe9a8',
  SUN_HALO:   '#ff9fc0',

  // parallax silhouettes
  HILL_FAR:  0x3c2a70,
  HILL_NEAR: 0x281c52,

  // field
  GROUND:       '#8d86b8',
  GROUND_CHECK: '#7d76a8',
  FOREGROUND:   0x5a5387,   // strip the player runs on
  SANDBAG:      0xcdb98a,   // low wall between player strip and the field

  // destructible suds towers
  TOWER_A:     0xf2e9ff,
  TOWER_B:     0xd9c8f2,
  TOWER_BONUS: 0xffd166,

  // player + shots
  PLAYER:      0x00ccaa,
  PLAYER_DARK: 0x008877,
  GUN:         0x333344,
  TRACER:      0xfff1b0,
  CROSSHAIR:   0xff3344,
  GRENADE:     0x222233,
  BOOM:        0xffcc66,
  DUST:        0x6e679c,
};

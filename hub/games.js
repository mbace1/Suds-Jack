// The arcade catalogue — one entry per playable thing on the site.
//
// `status` 'active' (being worked on) or 'archived' (finished or set down —
//          still playable, listed further down, and not competing for
//          attention with the live work). One word to move a game between
//          the two; nothing else changes.
// `note`   a line of current state — what is starting, or why a cabinet is
//          dark. Shown under the tagline when the game is playable, and in
//          place of the controls line when it is not.
// `live`   omit for anything playable. `live: false` means the cabinet is
//          listed but there is nothing to open yet — the Play button renders
//          dead and dimmed instead of pointing at a 404, and `note` says why.
//          Not every button has to work for a game to be worth listing.
// `path`   what Play opens, relative to the hub page.
// `inRepo` true when the folder lives on this branch too. The site (gh-pages)
//          is a curated root that carries a few games `main` does not, so the
//          local test loop only checks the links it can actually see.
// `accent` the card's neon; taken from the game's own palette so the row of
//          cards reads as the row of cabinets it is meant to be.
// `art`    the key of a draw function in art.js (each cabinet gets a marquee).
// `pad`    how a controller drives this game. 'native' means the game reads a
//          pad itself and nothing should be layered on top. Otherwise
//          hub/padkeys.js bridges one: {keys:{...}} feeds its keyboard,
//          {pointer:true} feeds its one-button surface, {ui:true} walks its
//          on-screen buttons. Omit for anything not worth playing on a pad.
//
// Adding a game is one entry here plus one draw function in art.js.

export const GAMES = [
  {
    id: 'sudsjack',
    pad: 'native',
    status: 'active',
    note: 'the playable build is the original vector one — a rebuild on the Hyper Dagger baseline starts next',
    title: 'Suds Jack',
    tagline: 'A vector tube shooter down a neon well — the namesake, and the next thing being built.',
    lineage: 'Tempest 2000 × Bomb Jack',
    tags: ['shooter', 'vector', 'canvas'],
    controls: '← → / A D move · Space fire · Z superzapper',
    path: 'sudz/',
    inRepo: false,
    accent: '#22e0e8',
    art: 'tube',
  },
  {
    id: 'tokodrop',
    pad: 'native',
    status: 'active',
    title: 'Toko Drop',
    tagline: 'Twin-stick swarm survival. The gels dodge your lanes, school like fish, and burst into revenge rings.',
    lineage: 'bullet-hell / arena',
    tags: ['twin-stick', 'three.js', 'gamepad'],
    controls: 'WASD + hold LMB · Space dash · dual sticks on touch',
    path: 'toko-drop/',
    inRepo: true,
    accent: '#5ad1a8',
    art: 'gel',
  },
  {
    id: 'hyperdagger',
    pad: 'native',
    status: 'active',
    title: 'Hyper Dagger',
    tagline: 'Survive a swarm of voxel skulls on a disc in the void. Survival time is the only score.',
    lineage: 'Devil Daggers × HYPERDEMON',
    tags: ['fps', 'three.js', 'gamepad'],
    controls: 'WASD + mouse · Space ×2 jump · Shift dash · Esc pause',
    path: 'hyperdagger/',
    inRepo: true,
    accent: '#d8412f',
    art: 'skull',
  },
  {
    id: 'dropcabal',
    pad: { keys: { left: 'KeyA', right: 'KeyD', b0: 'Space', b1: 'KeyG' } },   // aim stays on the mouse
    status: 'active',
    title: 'Drop Cabal',
    tagline: 'A gallery shooter with layered depth — near gels eat the shots you aimed at far ones.',
    lineage: 'Cabal (1988)',
    tags: ['shooter', 'pixel', 'three.js'],
    controls: 'A D run · mouse aim + LMB · Space roll · G grenade',
    path: 'dropcabal/',
    inRepo: true,
    accent: '#e8913a',
    art: 'cabal',
  },
  {
    id: 'powder',
    pad: { keys: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', b0: 'Space' } },
    status: 'active',
    note: 'a fresh prototype — the handling and the look are in, the field still needs balancing',
    title: 'Powder',
    tagline: 'A heavy hover racer carving a bottomless descent. Dive off the line into the deep stuff to charge the burn, then spend it back on it.',
    lineage: 'Jet Moto × MotorStorm × snowboarding',
    tags: ['racing', 'ps1', 'three.js'],
    controls: 'A D carve · W tuck · S scrub · Space burn · twin sticks on touch',
    path: 'powder/',
    inRepo: true,
    accent: '#d7a35c',
    art: 'powder',
  },
  {
    id: 'paperboy',
    status: 'archived',
    live: false,
    note: 'taken off the site in June and not being picked back up — the code is still in the repo',
    title: 'Paper Route — Dawn Run',
    tagline: 'Deliver to the subscribers, smash the windows of everyone else, survive three crashes.',
    lineage: 'Paperboy (1985)',
    tags: ['arcade', 'isometric', 'three.js'],
    controls: 'A D steer · W S throttle · Z X throw · Esc pause',
    path: 'paperboy/',
    inRepo: true,
    accent: '#6fc7e8',
    art: 'route',
  },
  {
    id: 'skltr',
    pad: 'native',
    status: 'active',
    title: 'SKLTR',
    tagline: 'A neon survival roguelike — hold out, level up, and see how far the run goes.',
    lineage: 'Risk of Rain lineage',
    tags: ['roguelike', 'survival', 'canvas'],
    controls: 'WASD move · fires on its own',
    path: 'Skltr/',
    inRepo: false,
    accent: '#3ce85a',
    art: 'bones',
  },
  {
    id: 'neonronin',
    // isDown('KeyA'/'KeyD'/'KeyW'/'KeyS') for movement, Space to dash, KeyE for
    // the command; the camera stays on the mouse
    pad: { keys: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', b0: 'Space', b2: 'KeyE' } },
    status: 'active',
    title: 'Neon Ronin',
    tagline: 'Chain sword combos through a neon skyline. The fighting is automatic; the movement is yours.',
    lineage: 'character action',
    tags: ['action', 'three.js', 'combo'],
    controls: 'WASD + mouse · LMB chains · tap stick to jump ×2',
    path: 'neon-ronin/',
    inRepo: false,
    accent: '#e83ca8',
    art: 'slash',
  },
  {
    id: 'gameoflife',
    pad: { ui: true },
    status: 'active',
    title: 'The Game of Life',
    tagline: 'Small stories and games that always hand you back to the outdoors. Finnish, English, Japanese.',
    lineage: 'a quiet one',
    tags: ['stories', 'pixel', 'fi / en / ja'],
    controls: 'tap or click — that is all of it',
    path: 'gameoflife/',
    inRepo: true,
    accent: '#8faf6a',
    art: 'treeline',
  },
  {
    id: 'tinyhawk',
    pad: 'native',
    status: 'active',
    note: 'P0 — the park, the controls, grinds and manuals are in; goals and the node map are not',
    title: 'Tiny Hawk',
    tagline: 'A skate part shot in a near-black park. Load the stick, flick it, and hold the chain together.',
    lineage: 'Skate Story × Tony Hawk',
    tags: ['skate', 'three.js', 'gamepad'],
    controls: 'load ↓ then flick ↑ · left stick steers · WASD + Space + Q E F C',
    path: 'tinyhawk/',
    inRepo: true,
    accent: '#8fe6d8',
    art: 'prism',
  },
  {
    id: 'tiny2d',
    // its own keys, not a synthetic tap: PRESS_KEYS is held to press into the
    // hill and released at the lip, and TRICK_KEYS flicks
    pad: { keys: { down: 'KeyS', up: 'KeyW', b0: 'Space', b3: 'KeyW' } },
    status: 'active',
    title: 'Tiny 2D',
    tagline: 'One button. Press into the hill, let go at the lip, and land along the next one — not into it.',
    lineage: 'Tiny Wings, on a skateboard',
    tags: ['one-button', 'three.js', 'endless'],
    controls: 'hold anywhere · release at the lip · flick up to trick',
    path: 'tiny2d/',
    inRepo: true,
    accent: '#4fd0e0',
    art: 'lip',
  },
  {
    id: 'eyetest',
    status: 'archived',
    title: '20/20',
    tagline: 'An eyesight test that keeps score. Endless rounds, streak scoring, three lives.',
    lineage: 'optometry, arcade-fied',
    tags: ['puzzle', 'canvas', 'landscape'],
    controls: 'tap a picture · or ← →',
    path: 'eye-test/',
    inRepo: false,
    accent: '#e8d24a',
    art: 'optotype',
  },
];

// The shader studies the games were built out of — playable, but they are
// experiments, so they get a quieter shelf of their own.
export const SKETCHES = [
  { id: 'goo-surface', title: 'Goo Surface', tagline: 'SPH-lite goop, 64 particles, metaball pass. Poke it.', path: 'goo-surface.html', inRepo: true },
  { id: 'goo-flop', title: 'Goo Flop', tagline: 'One gel cube that tips onto its side when you swipe.', path: 'goo-flop.html', inRepo: true },
  { id: 'goo-snowman', title: 'Goo Snowman', tagline: 'Ray-marched SDF snowman — where the goo look started.', path: 'goo-snowman.html', inRepo: true },
];

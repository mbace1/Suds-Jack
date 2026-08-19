// The arcade catalogue — one entry per playable thing on the site.
//
// `status` 'active' (being worked on) or 'archived' (finished or set down —
//          still playable, listed further down, and the Play button still works).
// `score`  optional high-score key for the cabinet face.
// `fi`/`ja` optional localised strings; English is the fallback for everything.
// `pad`    'native' if the game has its own gamepad path, otherwise the hub
//          injects a soft pad. See pad.js.
// `accent` a CSS colour used for the cabinet glow.
// `art`    optional icon key for the cabinet face.
// `path`   relative URL from the hub root.
// `inRepo` true when the game lives in this repo (Pages deploys it).
// `live`   omit for anything playable. `live: false` means the cabinet is
//          listed but there is nothing to open yet — the Play button renders
//          dead and dimmed instead of pointing at a 404, and `note` says why.
//          Not every button has to work for a game to be worth listing.
// `note`   a line of current state — what is starting, or why a cabinet is
//          dark. Shown under the tagline when the game is playable, and in
//          place of the controls line when it is not.

export const GAMES = [
  {
    id: 'sudsjack',
    fi: {
      tagline: 'Vektorinen putkiräiskintä alas neonkaivoon — nimikkopeli.',
      controls: '← → / A D liiku · Väli ampuu · Z superzapper',
      note: 'pelattava versio on alkuperäinen vektoriversio, ja se jää — suunniteltu uusintaversio laskettiin sivuun',
    },
    ja: {
      tagline: 'ネオンの井戸を落ちていくベクター筒シューター — 名前の由来。',
      controls: '← → / A D 移動 · スペース 発射 · Z スーパーザッパー',
      note: '遊べるのは元のベクター版のまま — 作り直しの計画は取り下げた',
    },
    pad: 'native',
    status: 'active',
    note: 'the playable build is the original vector one, and it stays — the planned rebuild was set down',
    title: 'Suds Jack',
    tagline: 'A vector tube shooter down a neon well — the namesake.',
    lineage: 'Tempest 2000 × Bomb Jack',
    tags: ['shooter', 'vector', 'canvas'],
    controls: '← → / A D move · Space fire · Z superzapper',
    path: 'sudz/',
    inRepo: true,
    accent: '#4ecdc4',
    art: 'tube',
  },
  {
    id: 'hyperdagger',
    score: { key: 'hyperDaggerHi', fmt: 'secs' },
    fi: {
      tagline: 'Kolme moodia: PURE (Devil Daggers), HYPER (kello + dash), TRUCK (putoavat alustat).',
      lineage: 'Devil Daggers',
      controls: 'WASD + hiiri · LMB napauta/pidä sarja/suihku · RMB hakeutuvat tikarit · Väli hyppy · Esc tauko',
    },
    ja: {
      tagline: '3モード高速FPS：PURE / HYPER / TRUCK。',
      lineage: 'Devil Daggers',
      controls: 'WASD + マウス · 左クリック タップ/長押し 一斉射撃/連射 · 右クリック 誘導 · スペース ジャンプ · Esc 一時停止',
    },
    pad: 'native',
    status: 'active',
    title: 'Hyper Dagger',
    tagline: 'Three-mode fast FPS: PURE (Devil Daggers), HYPER (clock + dash), TRUCK (falling platforms).',
    lineage: 'Devil Daggers × Hyper Demon × Clustertruck',
    tags: ['fps', 'three.js', 'gamepad'],
    controls: 'WASD + mouse · tap/hold LMB shot/stream · RMB homing · Space hop · Esc pause · touch/pad supported',
    path: 'hyperdagger/',
    inRepo: true,
    accent: '#d8412f',
    art: 'skull',
  },
];

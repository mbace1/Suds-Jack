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
    fi: {
      tagline: 'Vektorinen putkiräiskintä alas neonkaivoon — nimikkopeli, ja seuraavaksi rakennettava.',
      controls: '← → / A D liiku · Väli ampuu · Z superzapper',
      note: 'pelattava versio on alkuperäinen vektoriversio — uusintaversio Hyper Daggerin pohjalta alkaa seuraavaksi',
    },
    ja: {
      tagline: 'ネオンの井戸を落ちていくベクター筒シューター — 名前の由来であり、次に作るもの。',
      controls: '← → / A D 移動 · スペース 発射 · Z スーパーザッパー',
      note: '遊べるのは元のベクター版 — Hyper Dagger を土台にした作り直しが次に始まる',
    },
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
    fi: {
      tagline: 'Kahden tatin laumaselviytyminen. Geelit väistävät linjojasi, parveilevat kuin kalat ja räjähtävät kostorenkaiksi.',
      lineage: 'luotihelvetti / areena',
      controls: 'WASD + pidä hiiren ykköstä · Väli syöksy · kosketuksella kaksi tattia',
    },
    ja: {
      tagline: 'ツインスティックの群れ生存戦。ゼリーは弾道をよけ、魚のように群れ、死ぬと復讐のリングを撒く。',
      lineage: '弾幕 / アリーナ',
      controls: 'WASD + 左クリック長押し · スペース ダッシュ · タッチでは二本スティック',
    },
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
    fi: {
      tagline: 'Selviydy vokselikallojen laumasta kiekolla tyhjyydessä. Selviytymisaika on ainoa pistemäärä.',
      lineage: 'Devil Daggers × HYPERDEMON',
      controls: 'WASD + hiiri · Väli ×2 hyppy · Vaihto syöksy · Esc tauko',
    },
    ja: {
      tagline: '虚空に浮かぶ円盤で、ボクセルの髑髏の群れを生き延びる。生存時間だけがスコア。',
      lineage: 'Devil Daggers × HYPERDEMON',
      controls: 'WASD + マウス · スペース ×2 ジャンプ · Shift ダッシュ · Esc 一時停止',
    },
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
    fi: {
      tagline: 'Syvyyssuuntaan kerrostuva galleriaräiskintä — lähellä olevat geelit syövät laukaukset, jotka tähtäsit kauas.',
      lineage: 'Cabal (1988)',
      controls: 'A D juokse · hiiri tähtää + ykkönen · Väli kierähdys · G kranaatti',
    },
    ja: {
      tagline: '奥行きが層になるギャラリーシューター — 手前のゼリーが、奥へ撃った弾を食べてしまう。',
      lineage: 'Cabal (1988)',
      controls: 'A D 走る · マウスで照準 + 左クリック · スペース ローリング · G 手榴弾',
    },
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
    fi: {
      tagline: 'Raskas leijukelkka kaivertaa pohjatonta laskua. Sukella ladulta syvään puuteriin latatakseen palon, ja polta se takaisin siihen.',
      lineage: 'Jet Moto × MotorStorm × lumilautailu',
      controls: 'A D kaarra · W kyyry · S jarruta · Väli palo · kosketuksella kaksi tattia',
      note: 'tuore prototyyppi — tuntuma ja ilme ovat paikallaan, kenttä kaipaa vielä tasapainotusta',
    },
    ja: {
      tagline: '重いホバースレッドが底なしの斜面を刻む。踏み跡を外して深雪へ飛び込みバーンを溜め、また深雪で使い切る。',
      lineage: 'Jet Moto × MotorStorm × スノーボード',
      controls: 'A D カービング · W タック · S スクラブ · スペース バーン · タッチでは二本スティック',
      note: 'できたてのプロトタイプ — 操作感と見た目は入った、コースはまだ調整が要る',
    },
    pad: { keys: { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', b0: 'Space' } },
    status: 'active',
    note: 'a fresh prototype — the handling and the look are in, the field still needs balancing',
    title: 'Powder',
    tagline: 'A heavy hover racer carving a bottomless descent. Dive off the line into the deep stuff to charge the burn, then spend it back on it.',
    lineage: 'Jet Moto × MotorStorm × snowboarding',
    tags: ['racing', 'ps1', 'three.js'],
    controls: 'A D carve · W tuck · S scrub · Space burn · twin sticks on touch',
    path: 'powder/',
    inRepo: false,
    accent: '#d7a35c',
    art: 'powder',
  },
  {
    id: 'paperboy',
    fi: {
      tagline: 'Toimita tilaajille, riko kaikkien muiden ikkunat, selviä kolmesta kolarista.',
      lineage: 'Paperboy (1985)',
      controls: 'A D ohjaa · W S kaasu · Z X heitä · Esc tauko',
      note: 'otettiin sivustolta pois kesäkuussa eikä sitä jatketa — koodi on yhä repossa',
    },
    ja: {
      tagline: '購読者には配り、それ以外の窓は割り、三回の転倒までは生き延びる。',
      lineage: 'Paperboy (1985)',
      controls: 'A D ハンドル · W S アクセル · Z X 投げる · Esc 一時停止',
      note: '6 月にサイトから外して以来そのまま — コードはリポジトリに残っている',
    },
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
    fi: {
      tagline: 'Neonvärinen selviytymisroguelike — kestä, kehity ja katso kuinka pitkälle pääset.',
      lineage: 'Risk of Rain -sukua',
      controls: 'WASD liiku · ampuu itsestään',
    },
    ja: {
      tagline: 'ネオンのサバイバル・ローグライク — 耐えて、強くなって、どこまで行けるか試す。',
      lineage: 'Risk of Rain の系譜',
      controls: 'WASD 移動 · 攻撃は自動',
    },
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
    fi: {
      tagline: 'Ketjuta miekkasarjoja neonhorisontin halki. Taistelu hoituu itsestään; liike on sinun.',
      lineage: 'character action',
      controls: 'WASD + hiiri · ykkönen ketjuttaa · napauta tattia = hyppy ×2',
    },
    ja: {
      tagline: 'ネオンの街並みで剣のコンボをつなぐ。斬るのは自動、動くのは自分。',
      lineage: 'キャラクターアクション',
      controls: 'WASD + マウス · 左クリックでコンボ · スティックを弾くと二段ジャンプ',
    },
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
    fi: {
      tagline: 'Pieniä tarinoita ja pelejä, jotka palauttavat sinut aina ulos. Suomeksi, englanniksi ja japaniksi.',
      lineage: 'hiljainen',
      controls: 'napauta tai klikkaa — siinä kaikki',
    },
    ja: {
      tagline: 'いつも外へ返してくれる、小さな物語とゲーム。フィンランド語・英語・日本語。',
      lineage: '静かなもの',
      controls: 'タップかクリック — それだけ',
    },
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
    fi: {
      tagline: 'Skeittiosuus kuvattuna lähes mustassa puistossa. Lataa tatti, napsauta se ja pidä ketju kasassa.',
      lineage: 'Skate Story × Tony Hawk',
      controls: 'lataa ↓ ja napsauta ↑ · vasen tatti ohjaa · WASD + Väli + Q E F C',
      note: 'P0 — puisto, ohjaus, grindit ja manuaalit ovat sisällä; tavoitteet ja solmukartta eivät',
    },
    ja: {
      tagline: 'ほぼ真っ暗な公園で撮るスケートパート。スティックを溜め、弾き、つなぎを切らさない。',
      lineage: 'Skate Story × Tony Hawk',
      controls: '↓ で溜めて ↑ で弾く · 左スティックで舵 · WASD + スペース + Q E F C',
      note: 'P0 — 公園・操作・グラインド・マニュアルは入った、目標とノードマップはまだ',
    },
    pad: 'native',
    status: 'active',
    note: 'P0 — the park, the controls, grinds and manuals are in; goals and the node map are not',
    title: 'Tiny Hawk',
    tagline: 'A skate part shot in a near-black park. Load the stick, flick it, and hold the chain together.',
    lineage: 'Skate Story × Tony Hawk',
    tags: ['skate', 'three.js', 'gamepad'],
    controls: 'load ↓ then flick ↑ · left stick steers · WASD + Space + Q E F C',
    path: 'tinyhawk/',
    inRepo: false,
    accent: '#8fe6d8',
    art: 'prism',
  },
  {
    id: 'tiny2d',
    fi: {
      tagline: 'Yksi nappi. Paina rinteeseen, päästä irti harjalla ja laskeudu seuraavaa pitkin — älä siihen.',
      lineage: 'Tiny Wings, rullalaudalla',
      controls: 'pidä pohjassa · päästä harjalla · napsauta ylös temppuun',
    },
    ja: {
      tagline: 'ボタンひとつ。斜面に押しつけ、頂で放し、次の斜面に沿って降りる — ぶつけるのではなく。',
      lineage: 'Tiny Wings、スケートボードで',
      controls: 'どこでも長押し · 頂で離す · 上に弾いてトリック',
    },
    // its own keys, not a synthetic tap: PRESS_KEYS is held to press into the
    // hill and released at the lip, and TRICK_KEYS flicks
    pad: { keys: { down: 'KeyS', up: 'KeyW', b0: 'Space', b3: 'KeyW' } },
    // one button IS the game, and under a thumb nothing says the screen is it
    touch: { label: 'Hold', sub: 'let go at the lip', key: 'Space' },
    status: 'active',
    title: 'Tiny 2D',
    tagline: 'One button. Press into the hill, let go at the lip, and land along the next one — not into it.',
    lineage: 'Tiny Wings, on a skateboard',
    tags: ['one-button', 'three.js', 'endless'],
    controls: 'hold anywhere · release at the lip · flick up to trick',
    path: 'tiny2d/',
    inRepo: false,
    accent: '#4fd0e0',
    art: 'lip',
  },
  {
    id: 'eyetest',
    fi: {
      tagline: 'Näöntarkastus, joka pitää pisteitä. Loputtomat kierrokset, putkipisteytys, kolme elämää.',
      lineage: 'optikko, pelillistettynä',
      controls: 'napauta kuvaa · tai ← →',
    },
    ja: {
      tagline: '点数のつく視力検査。無限ラウンド、連続正解スコア、ライフは三つ。',
      lineage: '検眼をアーケードに',
      controls: '絵をタップ · または ← →',
    },
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
  { id: 'goo-surface', fi: { tagline: 'SPH-kevyt möykky, 64 hiukkasta, metapallopassi. Tökkää sitä.' }, ja: { tagline: '軽量 SPH のどろどろ、粒子 64、メタボール処理。つついてみて。' }, title: 'Goo Surface', tagline: 'SPH-lite goop, 64 particles, metaball pass. Poke it.', path: 'goo-surface.html', inRepo: true },
  { id: 'goo-flop', fi: { tagline: 'Yksi geelikuutio, joka kaatuu kyljelleen kun pyyhkäiset.' }, ja: { tagline: 'スワイプすると横に倒れるゼリーの立方体ひとつ。' }, title: 'Goo Flop', tagline: 'One gel cube that tips onto its side when you swipe.', path: 'goo-flop.html', inRepo: true },
  { id: 'goo-snowman', fi: { tagline: 'Säteenmarssitettu SDF-lumiukko — täältä geelin ilme alkoi.' }, ja: { tagline: 'レイマーチング SDF の雪だるま — この見た目の始まり。' }, title: 'Goo Snowman', tagline: 'Ray-marched SDF snowman — where the goo look started.', path: 'goo-snowman.html', inRepo: true },
];

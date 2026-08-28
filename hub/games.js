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
// `inRepo` true when the folder lives in a complete source checkout. Keep this
//          explicit so partial or experimental branches can still mark links
//          they do not carry without weakening the local link gate.
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
    score: { key: 'sudsJack.horizon.best', fmt: 'points' },
    fi: {
      tagline: 'Yhdeksän kaistan vektoripeli: ketjuta palloja, tallaa ryömijöitä ja lue horisonttia.',
      controls: '← → / A D liiku · Väli hyppää · ohjain ja kosketus toimivat',
      note: 'v5 — näkyvä versionumero ja selvästi matalampi, lyhyempi Tempest-verkko',
    },
    ja: {
      tagline: '9レーンのベクタースコアアタック。オーブをつなぎ、クローラーを踏み、地平線を読む。',
      controls: '← → / A D 移動 · スペース ジャンプ · パッド／タッチ対応',
      note: 'v5 — 常時表示のビルド番号と、明確に低く短いTempest風ウェブ視点',
    },
    pad: 'native',
    status: 'active',
    note: 'v5 — a visible build number and a clearly lower, shorter Tempest web',
    title: 'Suds Jack',
    tagline: 'A nine-lane vector score attack: chain orbs, stomp crawlers, and read the horizon.',
    lineage: 'Bomb Jack × Tempest × Tiny Wings',
    tags: ['arcade', 'vector', 'canvas'],
    controls: '← → / A D move · Space jump · pad and touch supported',
    path: 'sudz/',
    inRepo: true,
    accent: '#22e0e8',
    art: 'tube',
  },
  {
    id: 'tokodrop',
    score: { key: 'tokoDropHi', fmt: 'points' },
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
    id: 'tokodropgodot',
    fi: {
      tagline: 'Sama parvi, Godotissa: oikea pinnanalainen sironta, kymmenen haastetasoa omine sääntöineen, ja Rush jossa syöksy tappaa mutta ampuminen vie kilpesi.',
      lineage: 'Toko Drop / Blade Rush / Geometry Wars 3',
      controls: 'kosketus: vasen peukalo liikkuu, oikea tähtää · WASD + hiiri · ohjain',
      note: 'Godot-versio — 15 lajia, 10 mitattua tasoa, Rush-tila',
    },
    ja: {
      tagline: '同じ群れをGodotで。本物のサブサーフェススキャタリング、独自ルールを持つ10のチャレンジ、そしてブーストで殺し撃てば盾を失うRushモード。',
      lineage: 'トコドロップ / Blade Rush / ジオメトリウォーズ3',
      controls: 'タッチ: 左親指で移動、右で照準 · WASD + マウス · パッド',
      note: 'Godot版 — 15種、計測済み10ステージ、Rushモード',
    },
    pad: 'native',
    status: 'active',
    note: 'Godot build — real subsurface gel, ten measured challenge levels, and a Rush mode where boosting kills but firing drops your shield',
    title: 'Toko Drop — Godot',
    tagline: 'The same swarm rebuilt in Godot: gel that light passes through, ten challenge levels each with its own rule, and a Rush mode where boosting is the kill and shooting costs you the shield.',
    lineage: 'Toko Drop × Blade Rush × Geometry Wars 3',
    tags: ['twin-stick', 'godot', 'gamepad'],
    controls: 'touch: left thumb moves, right aims · WASD + hold LMB · pad',
    // A WebAssembly build; it lives only on the deployed site, the same way
    // piritori-godot does. Source: github.com/mbace1/toko-drop-godot
    path: 'toko-drop-godot/',
    inRepo: false,
    deployedOnly: true,
    accent: '#8f86e8',
    art: 'gelgrid',
  },
  {
    id: 'hyperdagger',
    score: { key: 'hyperDaggerHi', fmt: 'secs' },
    fi: {
      tagline: 'Devil Daggersista inspiroitunut käsikirjoitettu areena-FPS: opi vihollisaikataulu, kerää hakeutuvat tikarit ja selviä leukojaan kalisuttavasta kalloparvesta.',
      lineage: 'Devil Daggers',
      controls: 'WASD + hiiri · LMB napauta/pidä sarja/suihku · RMB hakeutuvat tikarit · Väli hyppy · Esc tauko',
    },
    ja: {
      tagline: 'Devil Daggersに着想を得たスクリプト型アリーナFPS。出現時刻を覚え、誘導ダガーを蓄え、顎を鳴らす骸骨の群れを生き延びろ。',
      lineage: 'Devil Daggers',
      controls: 'WASD + マウス · 左クリック タップ/長押し 一斉射撃/連射 · 右クリック 誘導 · スペース ジャンプ · Esc 一時停止',
    },
    pad: 'native',
    status: 'active',
    title: 'Hyper Dagger',
    tagline: 'A scripted survival FPS inspired by Devil Daggers: learn the spawn clock, bank homing daggers, and survive the jawing skull swarm.',
    lineage: 'Devil Daggers',
    tags: ['fps', 'three.js', 'gamepad'],
    controls: 'WASD + mouse · tap/hold LMB shot/stream · RMB homing · Space hop · Esc pause · touch/pad supported',
    path: 'hyperdagger/',
    inRepo: true,
    accent: '#d8412f',
    art: 'skull',
  },
  {
    id: 'dropcabal',
    score: { key: 'dropCabalHi', fmt: 'points' },
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
    pad: 'native',   // reads the sticks itself: a crosshair needs an axis, not a keystroke
    status: 'active',
    title: 'Drop Cabal',
    tagline: 'A gallery shooter with layered depth — near gels eat the shots you aimed at far ones.',
    lineage: 'Cabal (1988)',
    tags: ['shooter', 'pixel', 'three.js'],
    controls: 'A D run · mouse aim + LMB · Space roll · G grenade · pad: twin sticks',
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
    inRepo: true,
    accent: '#d7a35c',
    art: 'powder',
  },
  {
    id: 'paperboy',
    score: { key: 'paperRouteHi', fmt: 'points' },
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
    inRepo: true,
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
    inRepo: true,
    accent: '#e83ca8',
    art: 'slash',
  },
  {
    id: 'flashprince',
    score: { key: 'flashPrinceBest', fmt: 'best-time' },
    fi: {
      tagline: 'Jokainen liike viedään loppuun. Riipu, kiipeä ja vedä ase esiin ennen kuin hän ehtii.',
      lineage: 'Another World × Flashback × Prince of Persia',
      controls: '← → kävele (pidä = juoksu) · ↑ hyppy ja kiipeäminen · ↓ kyykky · E ase · X ammu',
      note: 'neljätoista ruutua viidakosta hautakammioon ja takaisin — monikielisyys ja äänet vielä kesken',
    },
    ja: {
      tagline: '始めた動きは必ず終わる。ぶら下がり、よじ登り、相手より先に銃を抜く。',
      lineage: 'Another World × Flashback × Prince of Persia',
      controls: '← → 歩く（長押しで走る）· ↑ ジャンプ／よじ登り · ↓ しゃがむ · E 銃 · X 撃つ',
      note: 'ジャングルから墓所へ、そしてまた戻る十四画面 — 多言語と音はまだこれから',
    },
    pad: 'native',
    status: 'active',
    note: 'fourteen screens from the jungle to the tomb and back — new, and still being tuned',
    title: 'Flash Prince',
    tagline: 'Every move you start, you finish. Hang, climb, and draw before he does.',
    lineage: 'Another World × Flashback × Prince of Persia',
    tags: ['cinematic', 'polygon', 'canvas'],
    controls: '← → walk (hold to run) · ↑ jump & climb · ↓ crouch · E pistol · X fire',
    path: 'flashprince/',
    inRepo: true,
    accent: '#c8ee5a',
    art: 'ledge',
  },
  {
    id: 'eeri',
    fi: {
      tagline: 'Poika työmaalla, joka saa kiivetä koneisiin. Aja kaivinkonetta, nosta puomia, väistä pallo.',
      lineage: 'Mario 3 × Yoshi’s Crafted World × Tonka',
      controls: '◀ ▶ juokse · Ⓐ hyppää · Ⓑ kiipeä koneeseen · ▲ ▼ puomi · pidä ▼ kaivaa',
      note: 'v15.49 — Jokainen maailma sai oman kamerahetkensä: nostokurki, höyrypuuska, liitävä lintu, valonheittimen pyyhkäisy.',
    },
    ja: {
      tagline: '工事現場の子ども。重機によじ登って運転できる。ショベルを走らせ、ブームを上げ、鉄球をかわす。',
      lineage: 'マリオ3 × ヨッシークラフトワールド × トンカ',
      controls: '◀ ▶ 走る · Ⓐ ジャンプ · Ⓑ 乗り込む · ▲ ▼ ブーム · ▼長押しで掘る',
      note: 'v15.49 — 各ワールドに専用のカメラの瞬間が加わった——クレーン、蒸気の噴き出し、滑空する鳥、投光器の光の掃引。',
    },
    pad: 'native',
    status: 'active',
    note: 'v15.49 — every world gets its own camera moment: a tower crane, a puff of steam, a gliding bird, a floodlight sweeping the dark.',
    title: 'Eeri',
    tagline: 'A kid on a worksite where nobody is driving. Read the machine, get in the cab, and dig your way out.',
    lineage: 'Mario 3 × Yoshi’s Crafted World × Tonka',
    tags: ['platformer', 'three.js', 'diorama'],
    controls: '◀ ▶ run · Ⓐ jump · Ⓑ climb in · ▲ ▼ boom · hold ▼ to dig, sling or swing',
    // Eeri was split out of this monorepo on 2026-08-23 (git-filter-repo,
    // full history) into its own repo, which is where JS development
    // happens now — its own CLAUDE.md says so, and the browser build had
    // been frozen at v15.37 there while a parallel v15.38-49 accidentally
    // continued in THIS repo instead, the exact class of fork this
    // project's own history keeps warning about. Reconciled and pushed to
    // mbace1/eeri on 2026-08-28; this cabinet now points at that repo's
    // own GitHub Pages site rather than a folder in this checkout, the
    // same way eeri-godot/toko-drop-godot point outside main for the
    // artefact main does not carry. `eeri/` stays in this repo as a
    // frozen v15.49 snapshot, per owner direction — not deleted, but not
    // developed here again either.
    path: 'https://mbace1.github.io/eeri/',
    inRepo: false,
    deployedOnly: true,
    accent: '#ffb01f',
    art: 'worksite',
  },
  {
    id: 'eerigodot',
    fi: {
      tagline: 'Sama työmaa, Godotissa: oikea valo ja varjot, kaikki kaksitoista kenttää, neljä maailmaa omine kulisseineen.',
      lineage: 'Mario 3 × Yoshi’s Crafted World × Tonka',
      controls: '◀ ▶ juokse · Ⓐ hyppää · Ⓑ kiipeä koneeseen · pidä ▼ kaivaa',
      note: 'Godot-versio selainversion rinnalla. Sama peli, eri moottori — tässä on oikea valo ja varjot, joita litteä selainversio ei voi piirtää.',
    },
    ja: {
      tagline: '同じ工事現場をGodotで。本物の光と影、全12ステージ、4つのワールドにそれぞれの背景。',
      lineage: 'マリオ3 × ヨッシークラフトワールド × トンカ',
      controls: '◀ ▶ 走る · Ⓐ ジャンプ · Ⓑ 乗り込む · ▼長押しで掘る',
      note: 'ブラウザ版と並ぶGodot版。同じゲームだがエンジンが違う——こちらには平面的なブラウザ版には描けない本物の光と影がある。',
    },
    pad: 'native',
    status: 'active',
    note: 'Godot build, beside the browser one. The same twelve levels and the same four worlds — but lit, with real shadows the flat browser build cannot draw.',
    title: 'Eeri (Godot)',
    tagline: 'The same worksite, rebuilt in Godot: real light and contact shadows, all twelve levels, four worlds each with their own set.',
    lineage: 'Mario 3 × Yoshi’s Crafted World × Tonka',
    tags: ['platformer', 'godot', 'diorama'],
    controls: '◀ ▶ run · Ⓐ jump · Ⓑ climb in · hold ▼ to dig',
    // A WebAssembly build that lives only on the deployed site, the same
    // arrangement piritori-godot and toko-drop-godot have. `inRepo: false`
    // because main does not carry the artefact, so the smoke gate must not
    // try to fetch it. Source: github.com/mbace1/eeri
    path: 'eeri-godot/',
    inRepo: false,
    deployedOnly: true,
    accent: '#ffd166',
    art: 'diorama',
  },
  {
    id: 'turf',
    fi: {
      tagline: 'Ruudukkotaktiikkaa sateisella pohjoismaisella takapihalla: näet vihollisten aikeet etukäteen, suoja oikeasti merkitsee, kolme operaattoria kuutta vastaan.',
      lineage: 'Into the Breach × Metal Slug Tactics',
      controls: 'napauta operaattoria, sitten ruutua tai vihollista',
      note: 'v1 — ensimmäinen taisteluprototyyppi: yksi taistelu, ei vielä saalista tai kokemuspisteitä.',
    },
    ja: {
      tagline: '雨に濡れた北欧の裏路地でのグリッド戦術。敵の狙いは先に見える、遮蔽物が本当に効く、三人のオペレーターが六人と対峙する。',
      lineage: 'Into the Breach × Metal Slug Tactics',
      controls: 'オペレーターをタップ、次にマスか敵をタップ',
      note: 'v1 — 最初の戦闘プロトタイプ:単一エンカウンター、略奪品や経験値はまだなし。',
    },
    status: 'active',
    note: 'v1 — Milestone 1 feel-test: one encounter, no loot or XP yet.',
    title: 'TURF',
    tagline: 'Grid tactics on a rain-lit Nordic backlot: telegraphed hits, cover that actually matters, three operators against six.',
    lineage: 'Into the Breach × Metal Slug Tactics',
    tags: ['tactics', 'grid', 'canvas'],
    controls: 'tap an operator, then a tile to move or an enemy to hit',
    path: 'turf/',
    inRepo: true,
    accent: '#6fa8c9',
    art: 'backlot',
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
    id: 'kindling',
    fi: {
      tagline: 'Hoivakumppani, ei pistetaulu. Merkitse ne pienet asiat jotka todella teit, pidä niillä tulta, ja valo näyttää huoneen.',
      lineage: 'Finch, mutta yhdessä huoneessa',
      controls: 'napauta listaa · hengitä tulen tahdissa · lähetä se ulos',
      note: 'uusi — sovellus itse on vielä pelkästään englanniksi',
    },
    ja: {
      tagline: '点数表ではなく、世話をするための小さなアプリ。実際にやった小さなことに印をつけ、その火を保つと、光が部屋を見せてくれる。',
      lineage: 'Finch を一部屋に',
      controls: 'リストをタップ · 火に合わせて呼吸する · 外へ送り出す',
      note: '新作 — 中身はまだ英語だけ',
    },
    pad: { ui: true },
    status: 'active',
    note: 'new — the app itself is English only so far',
    title: 'Kindling',
    tagline: 'A care companion, not a scoreboard. Tick off the small things you actually did, keep a fire on them, and the light shows you the room.',
    lineage: 'Finch, in one room',
    tags: ['care', 'daily', 'pixel'],
    controls: 'tap the list · breathe with the fire · send it out',
    path: 'kindling/',
    inRepo: true,
    accent: '#f0a24a',
    art: 'hearth',
  },
  {
    id: 'radiofree',
    fi: {
      tagline: 'Piraattiuutisvirta Tokon lukemana. Jokainen tiedote on keksitty; DECODE näyttää mitä sanamuoto oikeasti teki.',
      lineage: 'Metal Gearin kodekki × puhelimen syöte',
      controls: 'vieritä tai pyyhkäise · ⧉ purkaa tiedotteen · ← → vaihtaa taajuutta',
    },
    ja: {
      tagline: 'トコが読み上げる海賊放送のニュース。どの速報も作りもの。DECODE がその言い回しの仕掛けを見せる。',
      lineage: 'メタルギアの無線 × スマホのフィード',
      controls: 'スクロールかスワイプ · ⧉ で速報を解読 · ← → で周波数',
    },
    pad: { ui: true },
    status: 'active',
    title: 'Radio Free Helsinki',
    tagline: 'A pirate news feed read by Toko. Every bulletin is invented; DECODE shows you what the wording was doing.',
    lineage: 'Metal Gear codec × a phone feed',
    tags: ['app', 'pixel', 'fi / en / ja'],
    controls: 'scroll or swipe · ⧉ decodes the bulletin · ← → changes band',
    path: 'radiofree/',
    inRepo: true,
    accent: '#7dffb2',
    art: 'codec',
  },
  {
    id: 'piritori',
    fi: {
      tagline: 'Kerronnallinen strategiapeli: näe koko vuoden 2003 Kallio, aloita Piritorilta, tee ensimmäinen voitto ja rakenna väen, tiedon ja reittien verkosto.',
      lineage: 'Dope Wars × Mini Metro × East of Eden',
      controls: 'valitse paikka kartalta · tee valintoja · hoida kirjanpitoa · taistele muodostelmissa',
      note: 'Godot-versio — viisi pelitilaa, seitsemän päivää, muodostelmataistelut · fi/en/ja',
    },
    ja: {
      tagline: '2003年のカッリオ全域を見渡し、ピリトリの最初の取引から人・情報・路線のネットワークを築く物語ストラテジー。',
      lineage: 'ドープウォーズ × ミニメトロ × エデンの東',
      controls: '地図で場所を選ぶ · 選択する · 帳簿を管理する · 陣形戦を指揮する',
      note: 'Godot版 — 5つのモード、7日間、陣形戦 · fi/en/ja',
    },
    status: 'active',
    note: 'Godot build — five modes, one saved seven-day campaign, and an Eden that stays a mystery',
    title: 'Piritori → Eden',
    tagline: 'A narrative strategy game across the full 2003 Kallio board: begin at Piritori, make the first margin, then build a network of people, information and routes.',
    lineage: 'Dope Wars × Mini Metro × East of Eden',
    tags: ['strategy', 'economy', 'narrative'],
    controls: 'choose a map location · make narrative choices · manage the ledger · command formation battles',
    // The Godot port replaced the JS prototype here. It is a WebAssembly build
    // and lives only on the deployed site — `inRepo: false` because main does
    // not carry the 63MB artefact, so the smoke gate must not try to fetch it.
    // `deployedOnly: true` tells the gate's own "every visible cabinet is in
    // the source tree" check that this is a deliberate, standing exception
    // rather than an accidentally-imported production-only link — the thing
    // that check exists to catch.
    path: 'piritori-godot/',
    inRepo: false,
    deployedOnly: true,
    accent: '#e8c24a',
    art: 'nightmap',
  },
  {
    id: 'tokomove',
    fi: {
      tagline: 'Sama kaupunki päivänvalossa: pelkkä liikennepuoli, ihmiset kouluun ja töihin. Todistaa että pohja on rehellinen.',
      lineage: 'Mini Metro, Kallion oikealla kartalla',
      controls: 'vedä pysäkiltä toiselle: linja · napauta: tiedot',
      note: 'sama moottori kuin Piritorissa — sama kaupunki, vastakkainen sää',
    },
    ja: {
      tagline: '同じ街の昼の顔。純粋な交通パズル — 人を学校へ、仕事へ。土台が正直であることの証明。',
      lineage: 'ミニメトロ、実在のカッリオの地図で',
      controls: '駅から駅へドラッグで路線 · タップで詳細',
      note: 'ピリトリと同じエンジン — 同じ街、正反対の天気',
    },
    status: 'active',
    note: 'the same engine as Piritori — same city, opposite weather',
    title: 'Toko Move',
    tagline: 'The same city by daylight: the pure transit half, moving people to school and work. Proof the ground under Piritori is honest.',
    lineage: 'Mini Metro, on the real map of Kallio',
    tags: ['puzzle', 'transit', 'daylight'],
    controls: 'drag stop to stop: a line · tap: details',
    path: 'toko-move/',
    inRepo: true,
    accent: '#2f9fb8',
    art: 'daymap',
  },
  {
    id: 'tinyhawk',
    fi: {
      tagline: 'Pullea lintu kuvaa skeittiosuutta lähes mustassa puistossa. Lataa tatti, napsauta se ja pidä ketju kasassa.',
      lineage: 'Skate Story × Tony Hawk',
      controls: 'oikea tatti ↓ + ↖/↗ flipit · sivulle shuvit · laske linjat täyttääksesi SPECIAL-mittarin',
      note: 'v6 — onnistuneet linjat täyttävät SPECIAL-mittarin ja avaavat neljä linnun nimikkotemppua',
    },
    ja: {
      tagline: '丸々とした鳥が、ほぼ真っ暗な公園でスケートパートを撮る。スティックを溜め、弾き、つなぎを切らさない。',
      lineage: 'Skate Story × Tony Hawk',
      controls: '右スティック ↓＋↖/↗ フリップ · 横でショービット · ライン着地でSPECIALを溜める',
      note: 'v6 — 着地したラインでSPECIALが溜まり、鳥専用の4つのシグネチャートリックが解禁',
    },
    pad: 'native',
    status: 'active',
    note: 'v6 — landed lines now fill a Special meter and unlock four fat-bird signature tricks',
    title: 'Tiny Hawk',
    tagline: 'A fat bird films a skate part in a near-black park. Load the stick, flick it, and hold the chain together.',
    lineage: 'Skate Story × Tony Hawk',
    tags: ['skate', 'three.js', 'gamepad'],
    controls: 'right stick ↓ + ↖/↗ flips · side swipe shuvit · land lines to fill SPECIAL',
    path: 'tinyhawk/',
    inRepo: true,
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
    inRepo: true,
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
    inRepo: true,
    accent: '#e8d24a',
    art: 'optotype',
  },
  // Not on the floor. `secret: true` keeps a cabinet out of every rack, every
  // count and every filter until the code is entered — and what it hides is a
  // real page that is already in this repo, because a secret that turns out to
  // be a joke about there being no secret is worth exactly one telling.
  {
    // NOT `toko` — that fragment already belongs to the counter (see THEIRS in
    // hub.js), and a cabinet answering to the same hash would fight the panel
    // every badge in every signed game links to.
    id: 'brand',
    secret: true,
    fi: {
      tagline: 'Naamio, merkki ja kaikki mihin se painetaan — työpajan oma identiteetti, elävänä.',
      lineage: 'kaksi väriä, ei kuvatiedostoja',
      controls: 'katso · vie merkki mukanasi',
    },
    ja: {
      tagline: '仮面とマーク、そしてそれが刷られるすべて — 工房そのものの正体、生きたまま。',
      lineage: '二色だけ、画像素材なし',
      controls: '眺める · マークを持ち帰る',
    },
    status: 'active',
    title: 'Toko Midori Games',
    tagline: 'The mask, the mark, and everything it gets printed on — the workshop\'s own identity, live.',
    lineage: 'two colours, no image assets',
    tags: ['brand', 'canvas'],
    controls: 'look · take the mark with you',
    path: 'toko/',
    inRepo: true,
    accent: '#F0027F',
    art: 'mask',
  },
];

// The shader studies the games were built out of — playable, but they are
// experiments, so they get a quieter shelf of their own.
export const SKETCHES = [
  { id: 'toko-enemy-lab', fi: { tagline: 'Kaikki Toko Dropin 40 geeliä elävinä pelin omalla koodilla — osu, poksauta, säädä materiaalit.' }, ja: { tagline: 'トコドロップの全40ゼリーが実ゲームのコードで生きている — 叩いて、弾けさせて、質感をいじって。' }, title: 'Toko Enemy Lab', tagline: 'All 40 Toko Drop gels live on the real game code — hit them, pop them, restyle the goo.', path: 'toko-drop/enemy-lab.html', inRepo: true },
  { id: 'goo-surface', fi: { tagline: 'SPH-kevyt möykky, 64 hiukkasta, metapallopassi. Tökkää sitä.' }, ja: { tagline: '軽量 SPH のどろどろ、粒子 64、メタボール処理。つついてみて。' }, title: 'Goo Surface', tagline: 'SPH-lite goop, 64 particles, metaball pass. Poke it.', path: 'goo-surface.html', inRepo: true },
  { id: 'goo-flop', fi: { tagline: 'Yksi geelikuutio, joka kaatuu kyljelleen kun pyyhkäiset.' }, ja: { tagline: 'スワイプすると横に倒れるゼリーの立方体ひとつ。' }, title: 'Goo Flop', tagline: 'One gel cube that tips onto its side when you swipe.', path: 'goo-flop.html', inRepo: true },
  { id: 'goo-snowman', fi: { tagline: 'Säteenmarssitettu SDF-lumiukko — täältä geelin ilme alkoi.' }, ja: { tagline: 'レイマーチング SDF の雪だるま — この見た目の始まり。' }, title: 'Goo Snowman', tagline: 'Ray-marched SDF snowman — where the goo look started.', path: 'goo-snowman.html', inRepo: true },
];

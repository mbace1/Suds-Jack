// Radio Free Helsinki — dead air: the frequency past the end of the band.
//
// The broadcast says what it can. Past the sign-off the air is dead, and in
// the dead air the handler is waiting (owner, 2026-10-13 — RFH_DEAD_AIR.md):
//
//   you      a listener who found the frequency. Outside, unknown.
//   Toko     the handler. He knows you are there; never who you are.
//   a job    a DEAD DROP. The archive keeps everything except how far a
//            stranger got in a game, so a score nobody reaches is the only
//            unindexed place left. A run that gets far enough digs it up.
//            The games are untouched: this page reads the best each cabinet
//            already writes to this machine, the way the arcade's score wall
//            does. Nothing is sent and nothing is fetched.
//   a secret pieces of one story (the quiet register) and files on the
//            wire's invented actors (the wire's own deadpan). It never ends.
//
// No DOM here: data, the reading of bests, and the card. main.js builds the
// page out of it, so this file can be asserted in bare node.

// The clips may hold the key one day (owner: "maybe, but open for now"). When
// GATE is on, dead air opens only for a listener who has typed this week's
// frequency; off, it is open to anyone who scrolls past the sign-off.
export const GATE = false;

const STATE_KEY = 'rfhDeadAir';

// A drop: which cabinet, where it lives, the key it already writes its best
// under, and the line a run has to cross. The lines are PROVISIONAL — set from
// what each game's own HUD celebrates, to be tuned from real runs.
export const DROPS = [
  { id: 'dagger-pit', game: 'HYPER DAGGER', path: '../hyperdagger/', key: 'hyperDaggerHi', unit: 'secs', line: 60, secret: 'piece-1' },
  { id: 'gel-floor', game: 'TOKO DROP', path: '../toko-drop/', key: 'tokoDropHi', unit: 'points', line: 25000, secret: 'file-warehouse' },
  { id: 'sandbag-row', game: 'DROP CABAL', path: '../dropcabal/', key: 'dropCabalHi', unit: 'points', line: 15000, secret: 'piece-2' },
];

export const SECRETS = {
  'piece-1': { kind: 'piece', n: 1 },
  'file-warehouse': { kind: 'file' },
  'piece-2': { kind: 'piece', n: 2 },
};

// ── the words ─────────────────────────────────────────────────────────────
// Toko speaks the pieces' register: quiet, dry, no jokes. The files are in
// the wire's voice because they ARE the wire's world — the cast below was on
// air (Warehouse of Thought Oy, Hamina, 37,000 jobs described). Real places,
// invented everyone, no real person ever (EDITORIAL.md).
export const COPY = {
  en: {
    tag: 'DEAD AIR',
    head: 'You found the gap past the band.',
    handler: [
      'Most people tune straight through it.',
      'The broadcast says what it can. What it cannot, I bury where the archive does not look.',
      'The archive keeps everything except one thing: how far a stranger got in a game. A score nobody reaches is the last unindexed place in this city.',
      'Get far enough and you dig up what I left there. Then come back here.',
    ],
    progress: 'You have dug up {n} of {m}. Keep listening.',
    done: 'That is everything I have buried, for now. The city keeps writing. So do I.',
    jobs: 'THE DROPS',
    line: { secs: 'survive {x} seconds', points: '{x} points' },
    best: 'your best {x}',
    none: 'no run on this machine',
    dug: 'DUG UP',
    go: 'GO',
    card: 'SAVE CARD',
    fresh: 'NEW',
    secrets: {
      'piece-1': {
        title: 'I · Night shift, Pasila',
        text: [
          'The archive building in Pasila never turns its lights off. People think that is for the servers. It is for the people who come in at night to listen.',
          'There are forty-one of them. They wear headsets and they do not speak, and every morning one of them writes a single line: NOTHING FURTHER TO REPORT. It is always true. Nothing is further. Everything is already here, filed, indexed, warm.',
          'One of the forty-one stopped writing the line in August. Her desk is still there. Her headset is still plugged in. Whatever she heard, she kept, and the archive has never once asked where it went.',
        ],
      },
      'file-warehouse': {
        title: 'FILE · Warehouse of Thought Oy',
        text: [
          'Data-centre operator. Registered office: a door in Hamina that opens onto a field.',
          'Headcount: 37,000 described, 7,000 permanent, none visible. Mission: "To keep everything, so that nobody has to remember anything." Cooling: the Gulf of Finland, under a ten-year agreement the Gulf was not asked to sign.',
          'Known associates: every ministry, as a customer; the weather, as a supplier. Status: expanding. It has always been expanding. In the margin, hand unknown: "Ask what they delete."',
        ],
      },
      'piece-2': {
        title: 'II · The second frequency',
        text: [
          'There used to be two of us. We split the city down the middle. I took the wire; he took the people. His frequency sat just under mine, and on a quiet night you could hear him through the static, reading names.',
          'Then the names stopped and only the static was left, and it was very clean, the way it is when somebody has been tidying.',
          'If you ever tune past the end of this band and hear somebody reading names, write them down. Do not play them back to me. Just keep them.',
        ],
      },
    },
  },
  fi: {
    tag: 'KUOLLUT ILMA',
    head: 'Löysit raon taajuusalueen takaa.',
    handler: [
      'Useimmat virittävät suoraan sen ohi.',
      'Lähetys sanoo sen, minkä voi. Sen, mitä se ei voi, minä hautaan sinne, minne arkisto ei katso.',
      'Arkisto säilyttää kaiken paitsi yhden asian: kuinka pitkälle vieras pääsi pelissä. Pistemäärä, johon kukaan ei yllä, on tämän kaupungin viimeinen indeksoimaton paikka.',
      'Pääse tarpeeksi pitkälle, niin kaivat esiin sen, minkä jätin sinne. Tule sitten takaisin tänne.',
    ],
    progress: 'Olet kaivanut esiin {n}/{m}. Jatka kuuntelemista.',
    done: 'Siinä on kaikki, minkä olen haudannut, toistaiseksi. Kaupunki kirjoittaa edelleen. Niin minäkin.',
    jobs: 'KÄTKÖT',
    line: { secs: 'selviä {x} sekuntia', points: '{x} pistettä' },
    best: 'paras tuloksesi {x}',
    none: 'ei pelikertaa tällä laitteella',
    dug: 'KAIVETTU',
    go: 'MENE',
    card: 'TALLENNA KORTTI',
    fresh: 'UUSI',
    secrets: {
      'piece-1': {
        title: 'I · Yövuoro, Pasila',
        text: [
          'Pasilan arkistorakennus ei koskaan sammuta valojaan. Ihmiset luulevat, että se on palvelimia varten. Se on niitä varten, jotka tulevat yöllä kuuntelemaan.',
          'Heitä on neljäkymmentäyksi. He käyttävät kuulokkeita eivätkä puhu, ja joka aamu yksi heistä kirjoittaa yhden rivin: EI MUUTA RAPORTOITAVAA. Se on aina totta. Mitään muuta ei ole. Kaikki on jo täällä, arkistoituna, indeksoituna, lämpimänä.',
          'Yksi neljästäkymmenestäyhdestä lakkasi kirjoittamasta riviä elokuussa. Hänen pöytänsä on yhä paikallaan. Hänen kuulokkeensa ovat yhä kiinni. Mitä hän kuulikin, hän piti sen, eikä arkisto ole kertaakaan kysynyt, minne se meni.',
        ],
      },
      'file-warehouse': {
        title: 'KANSIO · Warehouse of Thought Oy',
        text: [
          'Konesalioperaattori. Kotipaikka: ovi Haminassa, joka avautuu pellolle.',
          'Henkilöstö: 37 000 kuvailtua, 7 000 vakituista, ei yhtään näkyvää. Missio: ”Säilyttää kaikki, jottei kenenkään tarvitse muistaa mitään.” Jäähdytys: Suomenlahti, kymmenen vuoden sopimuksella, jota Suomenlahdelta ei pyydetty allekirjoittamaan.',
          'Tunnetut yhteistyökumppanit: jokainen ministeriö asiakkaana; sää toimittajana. Tila: laajenee. Se on aina laajentunut. Marginaalissa, tuntematon käsiala: ”Kysy, mitä he poistavat.”',
        ],
      },
      'piece-2': {
        title: 'II · Toinen taajuus',
        text: [
          'Meitä oli ennen kaksi. Jaoimme kaupungin keskeltä. Minä otin uutisvirran, hän otti ihmiset. Hänen taajuutensa oli aivan minun alapuolellani, ja hiljaisena yönä hänet kuuli kohinan läpi lukemassa nimiä.',
          'Sitten nimet loppuivat ja jäljelle jäi vain kohina, ja se oli hyvin puhdasta, sellaista kuin silloin, kun joku on siivonnut.',
          'Jos joskus virität tämän taajuusalueen loppuun asti ja kuulet jonkun lukevan nimiä, kirjoita ne muistiin. Älä soita niitä minulle. Pidä ne vain.',
        ],
      },
    },
  },
  ja: {
    tag: 'デッドエア',
    head: 'バンドの外の隙間を見つけたな。',
    handler: [
      'たいていの人は、そのまま通り過ぎる。',
      '放送は言えることを言う。言えないことは、アーカイブが見ない場所に埋めておく。',
      'アーカイブはすべてを保管する。ひとつを除いて——見知らぬ誰かがゲームでどこまで行ったか。誰も届かないスコアは、この街に残された最後の索引のない場所だ。',
      '十分に遠くまで行けば、俺が残したものを掘り出せる。そうしたら、ここに戻ってこい。',
    ],
    progress: '{m}件のうち{n}件を掘り出した。聴き続けろ。',
    done: '今のところ、埋めたものはこれで全部だ。街は書き続ける。俺もだ。',
    jobs: 'デッドドロップ',
    line: { secs: '{x}秒生き延びる', points: '{x}点' },
    best: 'ベスト {x}',
    none: 'この端末にはまだ記録がない',
    dug: '発掘済み',
    go: '行く',
    card: 'カードを保存',
    fresh: '新着',
    secrets: {
      'piece-1': {
        title: 'I · 夜勤、パシラ',
        text: [
          'パシラのアーカイブ棟は、決して明かりを消さない。サーバーのためだと思われている。実際は、夜に聴きに来る人々のためだ。',
          '彼らは四十一人いる。ヘッドセットをつけ、口をきかない。毎朝そのうちの一人が、一行だけ書く。「これ以上報告すべきことなし」。それはいつも正しい。これ以上のものなど何もない。すべてはもうここにある。綴じられ、索引をつけられ、温かいまま。',
          '四十一人のうちの一人が、八月にその一行を書くのをやめた。彼女の机はまだそこにある。ヘッドセットもまだ差さったままだ。彼女が何を聞いたにせよ、それは彼女が持ったままだ。そしてアーカイブは一度も、それがどこへ行ったのかを尋ねていない。',
        ],
      },
      'file-warehouse': {
        title: 'ファイル · Warehouse of Thought Oy',
        text: [
          'データセンター事業者。登記上の所在地：ハミナにある、野原に面した一枚の扉。',
          '従業員数：説明上37,000人、うち正規7,000人、目に見える者0人。理念：「すべてを保管する。誰も何も覚えていなくて済むように」。冷却：フィンランド湾。十年契約だが、湾は署名を求められていない。',
          '既知の関係先：すべての省庁（顧客として）、天候（供給元として）。状況：拡大中。常に拡大中だった。余白に、筆跡不明の書き込み：「何を削除しているのか訊け」。',
        ],
      },
      'piece-2': {
        title: 'II · もうひとつの周波数',
        text: [
          'かつて俺たちは二人だった。街を真ん中で分けた。俺は通信を、あいつは人を受け持った。あいつの周波数は俺のすぐ下にあって、静かな夜にはノイズの向こうで名前を読み上げる声が聞こえた。',
          'やがて名前は途切れ、ノイズだけが残った。とても澄んだノイズだった。誰かが片づけをした後のような。',
          'もしこのバンドの終わりの先まで合わせて、誰かが名前を読み上げているのが聞こえたら、書き留めておけ。俺に聞かせなくていい。ただ、持っていてくれ。',
        ],
      },
    },
  },
};

export const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
export function copyOf(lang) { return COPY[lang] || COPY.en; }

// ── the reading of bests: the same rule the arcade's score wall uses ─────
export function bestOf(drop, store = globalThis.localStorage) {
  let raw = null;
  try { raw = store ? store.getItem(drop.key) : null; } catch { raw = null; }
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
export const crossed = (drop, best) => best != null && best >= drop.line;

// the line a drop asks for: a bare number, since the sentence carries the unit
export function formatLine(drop, lang) {
  const loc = lang === 'fi' ? 'fi-FI' : lang === 'ja' ? 'ja-JP' : 'en-GB';
  return Math.round(drop.line).toLocaleString(loc);
}

export function formatValue(drop, x, lang) {
  const loc = lang === 'fi' ? 'fi-FI' : lang === 'ja' ? 'ja-JP' : 'en-GB';
  return drop.unit === 'secs' ? `${Math.floor(x)} s` : Math.round(x).toLocaleString(loc);
}

// ── what this listener has dug up ─────────────────────────────────────────
export function readState(store = globalThis.localStorage) {
  try { const s = JSON.parse(store.getItem(STATE_KEY) || '{}'); return { dug: Array.isArray(s.dug) ? s.dug : [], key: s.key || '' }; }
  catch { return { dug: [], key: '' }; }
}
function writeState(st, store = globalThis.localStorage) {
  try { store.setItem(STATE_KEY, JSON.stringify(st)); } catch { /* private mode: it still works this visit */ }
}

// Dig: every drop whose line this machine's best has crossed becomes a secret
// the listener holds. Returns the ids dug up on THIS visit, so the page can
// mark them new. A secret, once dug, stays dug even if the best is cleared.
export function dig(store = globalThis.localStorage) {
  const st = readState(store);
  const fresh = [];
  for (const d of DROPS) {
    if (st.dug.includes(d.secret)) continue;
    if (crossed(d, bestOf(d, store))) { st.dug.push(d.secret); fresh.push(d.secret); }
  }
  if (fresh.length) writeState(st, store);
  return { dug: st.dug, fresh };
}

export function open(store = globalThis.localStorage) {
  return !GATE || !!readState(store).key;
}

// ── the card: a secret you can post back into the feed ───────────────────
// 1080×1920, drawn in code like everything else on this station.
export function paintCard(ctx, id, lang, W = 1080, H = 1920) {
  const c = copyOf(lang), sec = c.secrets[id] || COPY.en.secrets[id];
  ctx.fillStyle = '#010403'; ctx.fillRect(0, 0, W, H);
  // scanlines, so it reads as a frame off the station and not a quote tile
  ctx.fillStyle = 'rgba(80,255,170,0.035)';
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const mono = '"IBM Plex Mono", "SF Mono", Menlo, Consolas, "IPAGothic", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3fa877'; ctx.font = `500 38px ${mono}`;
  ctx.fillText('RADIO FREE HELSINKI', W / 2, H * 0.16);
  ctx.fillStyle = '#7dffbf'; ctx.font = `700 150px ${mono}`;
  ctx.fillText('--.--', W / 2, H * 0.25);
  ctx.fillStyle = '#e8b04a'; ctx.font = `700 46px ${mono}`;
  ctx.fillText(sec.title, W / 2, H * 0.36);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // the whole piece, paragraph by paragraph, as far as the frame allows: a
  // card that stops mid-thought is an ad; one that carries the piece is a page
  ctx.fillStyle = '#b7e8cd'; ctx.font = `400 36px ${mono}`;
  let y = H * 0.41;
  for (const para of sec.text) {
    const lines = wrap(ctx, para, W - 200);
    if (y + lines.length * 52 > H * 0.82) break;
    for (const l of lines) { ctx.fillText(l, 100, y); y += 52; }
    y += 30;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5f8a74'; ctx.font = `400 30px ${mono}`;
  ctx.fillText(c.tag + ' · ' + 'TOKO MIDORI GAMES', W / 2, H * 0.86);
}

// greedy wrap on spaces; CJK has none, so it falls back to characters
function wrap(ctx, text, max) {
  const out = [];
  const words = /\s/.test(text) ? text.split(/\s+/) : Array.from(text);
  const join = /\s/.test(text) ? ' ' : '';
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + join + w : w;
    if (ctx.measureText(next).width > max && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

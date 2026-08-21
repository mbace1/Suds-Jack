// What a note is ABOUT.
//
// Free text is the honest channel and it is not going anywhere. But a hundred
// notes that all say "the controls" and nothing else cannot be sorted, and
// sorting is the whole difference between feedback you read and feedback you
// act on. So every note now carries a KIND, picked in one tap before the words.
//
// The ordering is the interesting part. Each project puts the kinds it is
// actually asking about first — Powder wants to know about balance because the
// catalogue says its field still needs balancing; Tiny Hawk wants to know about
// the flick because that is the mechanic it is built on; The Game of Life wants
// ideas because the next thing it needs is another experience. The order of the
// buttons IS the question being asked, which is why it is per project and not
// one fixed list.
//
// Both surfaces read this file: the panel under a cabinet's cover art, and the
// counter Toko is standing at. That is the point — a note left in the chat and
// a note left under a cover have to be the same shape or they cannot be counted
// together.

// The ids are the data — they are what a note is filed under, so they never
// translate. Only the words on the buttons do.
export const KIND_IDS = ['bug', 'controls', 'balance', 'idea', 'look', 'perf', 'more'];

const WORDS = {
  en: {
    bug: ['Something broke', 'it crashed, stuck, or did the wrong thing'],
    controls: ['How it handles', 'input, feel, aiming, touch'],
    balance: ['Too hard / too easy', 'the difficulty curve'],
    idea: ['An idea for it', 'something you want to see in it'],
    look: ['Look and sound', 'art, palette, audio'],
    perf: ['Ran badly', 'frame rate, heat, battery'],
    more: ['More of this', 'what is working'],
  },
  fi: {
    bug: ['Jokin hajosi', 'kaatui, jumitti tai teki väärin'],
    controls: ['Miltä se tuntuu', 'ohjaus, tuntuma, tähtäys, kosketus'],
    balance: ['Liian vaikea / liian helppo', 'vaikeuskäyrä'],
    idea: ['Idea siihen', 'jotain mitä haluaisit siihen'],
    look: ['Ulkoasu ja ääni', 'grafiikka, väripaletti, äänet'],
    perf: ['Pätki tai takkusi', 'ruudunpäivitys, kuumeneminen, akku'],
    more: ['Lisää tätä', 'mikä toimii'],
  },
  ja: {
    bug: ['不具合があった', 'クラッシュ・停止・誤動作'],
    controls: ['操作感について', '入力・手触り・照準・タッチ'],
    balance: ['難しすぎる / 簡単すぎる', '難易度のカーブ'],
    idea: ['こうしてほしい', '入っていてほしいもの'],
    look: ['見た目と音', 'アート・配色・音'],
    perf: ['重かった', 'フレームレート・発熱・バッテリー'],
    more: ['もっとこれを', 'うまくいっているところ'],
  },
};

// The label list in one language. `lang` is passed in rather than read from a
// module-level variable, because both surfaces that call this already know
// which language they are drawing in and neither should have to set global
// state to ask a pure question.
export function kinds(lang = 'en') {
  const w = WORDS[lang] ?? WORDS.en;
  return KIND_IDS.map(id => ({ id, label: (w[id] ?? WORDS.en[id])[0], hint: (w[id] ?? WORDS.en[id])[1] }));
}

export const KINDS = kinds('en');

// The kinds each project leads with. Anything not named here follows in the
// order above, so a new game gets a sensible menu the day it is listed and a
// better one the day someone thinks about it.
const LEADS = {
  powder: ['balance', 'controls'],        // "the field still needs balancing"
  tinyhawk: ['controls', 'idea'],         // "goals and the node map are not [in]"
  tiny2d: ['controls', 'balance'],        // one button, so the feel is the game
  hyperdagger: ['balance', 'controls'],
  dropcabal: ['controls', 'balance'],
  tokodrop: ['balance', 'idea'],
  sudsjack: ['idea', 'more'],             // a rebuild is starting; ideas land now
  gameoflife: ['idea', 'more'],           // the next thing it needs is another story
  // The two cabinets that live only on the deployed site had never been given a
  // question, so the counter offered them the bare order — and the gate tolerates
  // exactly one of those. A worksite platformer for a six-year-old is asked about
  // its handling first; a VR room you sit in is asked how it FEELS to be in.
  eeri: ['controls', 'balance'],
  tokotrip: ['look', 'more'],
  kindling: ['look', 'idea'],             // a mobile UX layer just landed on it
                                          // and the art target is changing under
                                          // it: how it reads, and what it should
                                          // notice next
  skltr: ['balance', 'controls'],
  neonronin: ['controls', 'look'],
  eyetest: ['idea', 'bug'],
  paperboy: ['more', 'idea'],             // set down — "put it back" is the note
  flashprince: ['controls', 'balance'],   // commitment is the design AND the
                                          // complaint: it has to be told apart
                                          // from lag, and the screens are the
                                          // difficulty
  radiofree: ['idea', 'look'],
  piritori: ['balance', 'idea'],          // the economy IS the game: can seven
                                          // nights beat the interest, and what
                                          // should the city do next
  tokomove: ['look', 'idea'],             // the day read is the product: does it
                                          // read as the same city, kindly            // it is writing and voice: what it
                                          // should say next, and how it reads
  hub: ['idea', 'bug'],
};

// the kinds for one project, most-likely first
export function kindsFor(gameId, lang = 'en') {
  const all = kinds(lang);
  const byId = Object.fromEntries(all.map(k => [k.id, k]));
  const lead = LEADS[gameId] ?? [];
  return [...lead.map(id => byId[id]).filter(Boolean), ...all.filter(k => !lead.includes(k.id))];
}

// One-tap suggestions under the text box. These are not a survey — tapping one
// fills the box so it can be edited, because a suggestion you cannot argue with
// is a leading question. Project-specific ones first, then a generic set per
// kind, so every combination has something to offer.
const GENERIC = {
  en: {
    bug: ['Got stuck, had to reload', 'A button did nothing', 'Broke after a while'],
    controls: ['Does not do what I meant', 'Awkward on touch', 'Let me remap it'],
    balance: ['Too hard too early', 'Nothing left once you are good', 'The jump is sudden'],
    idea: ['Add a mode where…', 'I want to see…', 'It should remember…'],
    look: ['Hard to read what matters', 'Love the palette', 'The sound needs…'],
    perf: ['Drops when it gets busy', 'Heats my phone', 'Slow to start'],
    more: ['I keep coming back to this', 'One thing away', 'Do more like this'],
  },
  fi: {
    bug: ['Jumitti, piti ladata uudestaan', 'Nappi ei tehnyt mitään', 'Hajosi hetken päästä'],
    controls: ['Ei tee sitä mitä tarkoitin', 'Kömpelö kosketuksella', 'Anna vaihtaa näppäimet'],
    balance: ['Liian vaikea liian aikaisin', 'Ei mitään jäljellä kun oppii', 'Vaikeus hyppää kerralla'],
    idea: ['Lisää tila jossa…', 'Haluaisin nähdä…', 'Sen pitäisi muistaa…'],
    look: ['Vaikea erottaa mikä on tärkeää', 'Väripaletti on hieno', 'Ääni kaipaa…'],
    perf: ['Pätkii kun ruudulla on paljon', 'Kuumentaa puhelimen', 'Käynnistyy hitaasti'],
    more: ['Palaan tähän aina uudestaan', 'Yhden asian päässä', 'Lisää tämänkaltaista'],
  },
  ja: {
    bug: ['固まって再読み込みした', 'ボタンが反応しなかった', 'しばらくして壊れた'],
    controls: ['思った通りに動かない', 'タッチだと扱いにくい', 'キーを変えさせてほしい'],
    balance: ['早い段階で難しすぎる', '上手くなるとやることがない', '難易度が急に上がる'],
    idea: ['こういうモードがほしい…', '見てみたいのは…', '覚えていてほしいのは…'],
    look: ['何が重要か読み取りにくい', '配色がとても良い', '音に足りないのは…'],
    perf: ['混み合うと処理落ちする', '端末が熱くなる', '起動が遅い'],
    more: ['何度も戻ってきてしまう', 'あと一歩', 'こういうのをもっと'],
  },
};

const SPECIFIC = {
  en: {
    'powder:balance': ['Burn runs out too fast', 'Diving off the line is not worth it'],
    'powder:controls': ['Carving feels heavy', 'The scrub barely slows me'],
    'tinyhawk:controls': ['Cannot tell when the stick is loaded', 'The camera loses me mid-trick'],
    'tinyhawk:idea': ['Give me a goal to chase', 'I want a line to follow'],
    'tiny2d:controls': ['Hard to tell where the lip is', 'The trick flick never comes out'],
    'tiny2d:balance': ['I land into the hill every time', 'Never had to let go early'],
    'hyperdagger:balance': ['Too much arrives at once', 'The swarm collapses into a blob'],
    'hyperdagger:controls': ['The dash does not go where I flick', 'Aim with a pad needs work'],
    'dropcabal:controls': ['Aiming with a thumb is fiddly', 'The roll comes out late'],
    'tokodrop:balance': ['The waves stop escalating', 'The dash cooldown is too long'],
    'gameoflife:idea': ['A story about…', 'Let me revisit a finished one', 'More that sends me outside'],
    'gameoflife:more': ['I actually went outside', 'The quiet is the point'],
    'kindling:look': ['The room is hard to read', 'Too many numbers on it now'],
    'kindling:idea': ['A small thing it should notice', 'Something it could bring home'],
    'sudsjack:idea': ['Keep the tube, lose the…', 'The rebuild should keep…'],
    'paperboy:more': ['Put this one back on the site'],
    'hub:idea': ['Sort the cabinets by…', 'Show me what changed since last time'],
    'flashprince:controls': ['I could not tell if it heard me', 'The step goes further than I wanted'],
    'flashprince:balance': ['One screen keeps killing me', 'The sentry draws before I do'],
    'radiofree:idea': ['Report on…', 'Let me keep a bulletin', 'A voice I could switch to'],
    'radiofree:look': ['The decode is hard to follow', 'The voice needs…'],
  },
  fi: {
    'powder:balance': ['Palo loppuu liian nopeasti', 'Ladulta poikkeaminen ei kannata'],
    'powder:controls': ['Kaarto tuntuu raskaalta', 'Jarrutus ei juuri hidasta'],
    'tinyhawk:controls': ['En huomaa milloin tatti on ladattu', 'Kamera hukkaa minut tempun aikana'],
    'tinyhawk:idea': ['Anna jokin tavoite', 'Haluaisin linjan jota seurata'],
    'tiny2d:controls': ['Vaikea hahmottaa missä harja on', 'Temppunapsautus ei lähde koskaan'],
    'tiny2d:balance': ['Laskeudun joka kerta rinteeseen', 'Ei ole tarvinnut päästää aikaisin irti'],
    'hyperdagger:balance': ['Liikaa tulee kerralla', 'Lauma puuroutuu yhdeksi mötiköksi'],
    'hyperdagger:controls': ['Syöksy ei mene napsautuksen suuntaan', 'Tähtäys ohjaimella kaipaa työtä'],
    'dropcabal:controls': ['Peukalolla tähtääminen on näpertämistä', 'Kierähdys lähtee myöhässä'],
    'tokodrop:balance': ['Aallot lakkaavat kiristymästä', 'Syöksyn jäähdytys on liian pitkä'],
    'gameoflife:idea': ['Tarina aiheesta…', 'Anna palata jo koettuun', 'Lisää sellaista mikä vie ulos'],
    'gameoflife:more': ['Menin oikeasti ulos', 'Hiljaisuus on koko juju'],
    'kindling:look': ['Huonetta on vaikea lukea', 'Numeroita on nyt liikaa'],
    'kindling:idea': ['Pieni asia jonka sen pitäisi huomata', 'Jotain mitä se voisi tuoda kotiin'],
    'sudsjack:idea': ['Pidä putki, jätä pois…', 'Uusintaversion pitäisi säilyttää…'],
    'paperboy:more': ['Palauta tämä sivustolle'],
    'hub:idea': ['Järjestä kaapit…-mukaan', 'Näytä mikä on muuttunut viime käynnin jälkeen'],
    'flashprince:controls': ['En tiennyt kuuliko se minua', 'Askel vie pidemmälle kuin halusin'],
    'flashprince:balance': ['Yksi ruutu tappaa aina', 'Vartija ehtii ennen minua'],
    'radiofree:idea': ['Kertoisi aiheesta…', 'Antaisi tallentaa uutisen', 'Toinen ääni valittavaksi'],
    'radiofree:look': ['Purkua on vaikea seurata', 'Ääni kaipaa…'],
  },
  ja: {
    'powder:balance': ['バーンが早く切れすぎる', '踏み跡を外す価値がない'],
    'powder:controls': ['カービングが重い', 'スクラブがほとんど効かない'],
    'tinyhawk:controls': ['スティックが溜まったのが分からない', 'トリック中にカメラが見失う'],
    'tinyhawk:idea': ['追いかける目標がほしい', 'たどるラインがほしい'],
    'tiny2d:controls': ['頂がどこか分かりにくい', 'トリックの弾きが出ない'],
    'tiny2d:balance': ['毎回斜面に突っ込む', '早く離す必要が一度もなかった'],
    'hyperdagger:balance': ['一度に来すぎる', '群れが一塊に潰れてしまう'],
    'hyperdagger:controls': ['ダッシュが弾いた方向に行かない', 'パッドでの照準に手が要る'],
    'dropcabal:controls': ['親指で狙うのが細かすぎる', 'ローリングの出が遅い'],
    'tokodrop:balance': ['ウェーブが上がらなくなる', 'ダッシュのクールダウンが長い'],
    'gameoflife:idea': ['こんな話が読みたい…', '終えたものにまた入らせて', '外へ向かわせるものをもっと'],
    'gameoflife:more': ['ほんとうに外に出ました', '静かさこそが本体'],
    'kindling:look': ['部屋が読みにくい', '数字が増えすぎた'],
    'kindling:idea': ['気づいてほしい小さなこと', '持って帰ってきてほしいもの'],
    'sudsjack:idea': ['筒は残して、…はやめて', '作り直しでも残してほしいのは…'],
    'paperboy:more': ['これをサイトに戻してほしい'],
    'hub:idea': ['キャビネットを…順に並べて', '前回から何が変わったか見せて'],
    'flashprince:controls': ['聞こえているのか分からなかった', '一歩が思ったより進む'],
    'flashprince:balance': ['同じ画面で必ず死ぬ', '見張りのほうが先に抜く'],
    'radiofree:idea': ['これを報じてほしい…', 'ニュースを残させてほしい', '声を選べるように'],
    'radiofree:look': ['デコードが追いにくい', '声に足りないのは…'],
  },
};

export function chipsFor(gameId, kindId, lang = 'en') {
  const sp = SPECIFIC[lang] ?? SPECIFIC.en, ge = GENERIC[lang] ?? GENERIC.en;
  const key = `${gameId}:${kindId}`;
  return [...(sp[key] ?? SPECIFIC.en[key] ?? []),
    ...(ge[kindId] ?? GENERIC.en[kindId] ?? [])].slice(0, 3);
}

// The counter asks which project first, so it needs the list in the same order
// the rack shows it, with the arcade itself on the end — a note about the hub
// is a real note and there is nowhere else to leave it.
// `self` is what the arcade itself is called in the caller's language — passed
// in rather than looked up, so this file stays a table and not a dependency.
export function projectChoices(games, self = 'The arcade itself') {
  return [...games.filter(g => g.status === 'active').map(g => ({ id: g.id, label: g.title })),
    ...games.filter(g => g.status !== 'active').map(g => ({ id: g.id, label: g.title })),
    { id: 'hub', label: self }];
}

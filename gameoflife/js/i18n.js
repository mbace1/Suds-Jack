// The Game of Life — trilingual strings (fi / en / ja).
// Every user-facing string lives here. t(key) falls back to English so a
// missing translation never breaks a view — it just shows English until filled in.

export const LANGS = [
  { code: 'fi', label: 'Suomi' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

let lang = 'en';

export function setLang(l) { if (STR[l]) lang = l; }
export function getLang() { return lang; }

export function t(key) {
  const v = STR[lang][key] ?? STR.en[key];
  return v ?? key;
}

const STR = {

  // ──────────────────────────────────────────────── English
  en: {
    'hub.title': 'The Game of Life',
    'hub.tagline': 'Small games and stories that always lead back outside.',
    'hub.play': 'Begin',
    'hub.again': 'Visit again',
    'hub.done.today': 'visited today',
    'hub.lang': 'Language',
    'hub.feedback': 'Leave a thought',
    'hub.cycle.hint': 'After a game or two, the games will rest — and point you somewhere real.',
    'hub.rested': 'The games are resting. The world outside is open.',
    'hub.offer': 'offered to you, now',
    'hub.another': 'something else, perhaps',
    'kind.story': 'a story',
    'kind.game': 'a game',
    'kind.wisdom': 'a kernel of wisdom',

    'exp.aqueduct.name': 'The Stone River',
    'exp.aqueduct.desc': 'How Rome invited water downhill — then turn the stones yourself.',
    'exp.forest.name': 'The Forest Path',
    'exp.forest.desc': 'A short walk with choices, ending in four slow breaths.',

    'aq.p1': 'Two thousand years ago, Rome grew thirsty. The hills held springs, but the city held people.',
    'aq.p2': 'So engineers walked the land for weeks, reading its slopes. Water cannot be pushed — it can only be invited downhill.',
    'aq.p3': 'They built stone rivers on arches: aqueducts. A fall of a few hands per kilometre — gentler than a sleeping breath — carried water fifty miles to the fountains.',
    'aq.puzzle.hint': 'Tap the stones to turn them. Invite the water from the spring to the fountain.',
    'aq.level': 'Channel',
    'aq.flow': 'The water finds its way.',
    'aq.outro': 'Every aqueduct is only a stream that people asked to walk beside them.',
    'aq.nature': 'Now find real water — a stream, a gutter after rain, a river. Watch how it chooses its path downhill. Notice that no one is steering it.',

    'fo.s1': 'You leave the road where the moss begins. The morning is cold in a friendly way.',
    'fo.s1.a': 'Follow the sound of water',
    'fo.s1.b': 'Climb toward the light',
    'fo.s2a': 'A stream, thin as a ribbon. A grey heron stands in it, patient as a stone, and does not mind you.',
    'fo.s2b': 'On the ridge the pines lean together and speak in the wind. Far below, the forest is a single green animal, breathing.',
    'fo.s2.a': 'Sit on the fallen birch',
    'fo.s2.b': 'Keep walking, slower now',
    'fo.s3': 'You find a stone with a cushion of moss, placed as if someone knew you were coming. You sit.',
    'fo.breathe.in': 'breathe in',
    'fo.breathe.out': 'let it go',
    'fo.breathe.hint': 'Follow the circle. Four breaths.',
    'fo.outro': 'The forest does not load. It does not update. It is already there, running the oldest game of all.',
    'fo.nature': 'Take this walk for real, even a small one — to the nearest tree counts. Leave the phone in your pocket and let your ears do the graphics.',

    'nat.title': 'An invitation',
    'nat.accept': 'I will',
    'nat.later': 'Not yet',
    'nat.day.1': 'Step outside and find one thing moved by wind — a branch, laundry, grass. Watch it for a full minute.',
    'nat.day.2': 'Find water doing something: dripping, flowing, evaporating off warm stone. Stay with it a while.',
    'nat.day.3': 'Look for the oldest living thing you can see from where you stand. It has been playing longer than any of us.',
    'nat.eve.1': 'It is evening. Read one poem, slowly, twice. Here is one to start with:',
    'nat.eve.2': 'It is evening. Find one painting — in a book, on a wall — and look at it until it looks back.',
    'nat.eve.art': 'Suggestion: look for landscape painters — Caspar David Friedrich, Hiroshige, or Finland’s own Pekka Halonen.',

    'fb.title': 'A quick thought?',
    'fb.q': 'How did this feel?',
    'fb.placeholder': 'Anything to tell the gardeners of this game… (optional)',
    'fb.send': 'Leave it',
    'fb.skip': 'Skip',
    'fb.thanks': 'Thank you. It is kept.',

    'ui.continue': 'Continue',
    'ui.back': 'Back to the hub',
    'ui.start': 'Begin',
  },

  // ──────────────────────────────────────────────── Suomi
  fi: {
    'hub.title': 'Elämän peli',
    'hub.tagline': 'Pieniä pelejä ja tarinoita, jotka johtavat aina takaisin ulos.',
    'hub.play': 'Aloita',
    'hub.again': 'Käy uudelleen',
    'hub.done.today': 'käyty tänään',
    'hub.lang': 'Kieli',
    'hub.feedback': 'Jätä ajatus',
    'hub.cycle.hint': 'Parin pelin jälkeen pelit lepäävät — ja osoittavat jonnekin todelliseen.',
    'hub.rested': 'Pelit lepäävät. Maailma ulkona on auki.',
    'hub.offer': 'tarjolla sinulle, nyt',
    'hub.another': 'ehkä jokin muu',
    'kind.story': 'tarina',
    'kind.game': 'peli',
    'kind.wisdom': 'viisaudenjyvä',

    'exp.aqueduct.name': 'Kivinen joki',
    'exp.aqueduct.desc': 'Miten Rooma kutsui veden alamäkeen — käännä sitten kivet itse.',
    'exp.forest.name': 'Metsäpolku',
    'exp.forest.desc': 'Lyhyt kävely valintoineen, joka päättyy neljään hitaaseen hengitykseen.',

    'aq.p1': 'Kaksituhatta vuotta sitten Rooma tuli janoiseksi. Kukkuloilla oli lähteitä, mutta kaupungissa oli ihmisiä.',
    'aq.p2': 'Niinpä insinöörit kulkivat maastossa viikkoja lukien sen rinteitä. Vettä ei voi työntää — sen voi vain kutsua alamäkeen.',
    'aq.p3': 'He rakensivat kivisiä jokia holvikaarien päälle: akvedukteja. Muutaman kämmenen lasku kilometrillä — lempeämpi kuin nukkuvan hengitys — kantoi veden kymmenien kilometrien päähän suihkulähteille.',
    'aq.puzzle.hint': 'Käännä kiviä napauttamalla. Kutsu vesi lähteestä suihkulähteelle.',
    'aq.level': 'Kanava',
    'aq.flow': 'Vesi löytää tiensä.',
    'aq.outro': 'Jokainen akvedukti on vain puro, jota ihmiset pyysivät kulkemaan rinnallaan.',
    'aq.nature': 'Etsi nyt oikeaa vettä — puro, sadeveden kouru, joki. Katso miten se valitsee reittinsä alamäkeen. Huomaa, ettei kukaan ohjaa sitä.',

    'fo.s1': 'Jätät tien siihen, missä sammal alkaa. Aamu on kylmä ystävällisellä tavalla.',
    'fo.s1.a': 'Seuraa veden ääntä',
    'fo.s1.b': 'Kiipeä kohti valoa',
    'fo.s2a': 'Puro, ohut kuin nauha. Harmaahaikara seisoo siinä kärsivällisenä kuin kivi, eikä välitä sinusta.',
    'fo.s2b': 'Harjanteella männyt nojaavat toisiinsa ja puhuvat tuulessa. Kaukana alhaalla metsä on yksi vihreä eläin, joka hengittää.',
    'fo.s2.a': 'Istu kaatuneelle koivulle',
    'fo.s2.b': 'Jatka matkaa, hitaammin nyt',
    'fo.s3': 'Löydät kiven, jolla on sammaltyyny, asetettuna kuin joku olisi tiennyt sinun tulevan. Istut.',
    'fo.breathe.in': 'hengitä sisään',
    'fo.breathe.out': 'päästä irti',
    'fo.breathe.hint': 'Seuraa ympyrää. Neljä hengitystä.',
    'fo.outro': 'Metsä ei lataudu. Se ei päivity. Se on jo siellä, pelaten kaikista vanhinta peliä.',
    'fo.nature': 'Tee tämä kävely oikeasti, vaikka pienikin — lähimmälle puulle asti riittää. Jätä puhelin taskuun ja anna korvien hoitaa grafiikka.',

    'nat.title': 'Kutsu',
    'nat.accept': 'Minä menen',
    'nat.later': 'En vielä',
    'nat.day.1': 'Astu ulos ja etsi yksi asia, jota tuuli liikuttaa — oksa, pyykki, heinä. Katso sitä kokonainen minuutti.',
    'nat.day.2': 'Etsi vettä tekemässä jotakin: tippumassa, virtaamassa, haihtumassa lämpimältä kiveltä. Viivy sen äärellä hetki.',
    'nat.day.3': 'Etsi vanhin elävä olento, jonka näet siitä missä seisot. Se on pelannut pidempään kuin kukaan meistä.',
    'nat.eve.1': 'On ilta. Lue yksi runo, hitaasti, kahdesti. Tässä yksi aluksi:',
    'nat.eve.2': 'On ilta. Etsi yksi maalaus — kirjasta, seinältä — ja katso sitä kunnes se katsoo takaisin.',
    'nat.eve.art': 'Ehdotus: katso maisemamaalareita — Caspar David Friedrich, Hiroshige tai oma Pekka Halosemme.',

    'fb.title': 'Nopea ajatus?',
    'fb.q': 'Miltä tämä tuntui?',
    'fb.placeholder': 'Kerrottavaa tämän pelin puutarhureille… (vapaaehtoinen)',
    'fb.send': 'Jätä se',
    'fb.skip': 'Ohita',
    'fb.thanks': 'Kiitos. Se on tallessa.',

    'ui.continue': 'Jatka',
    'ui.back': 'Takaisin aulaan',
    'ui.start': 'Aloita',
  },

  // ──────────────────────────────────────────────── 日本語
  ja: {
    'hub.title': '人生のゲーム',
    'hub.tagline': '小さなゲームと物語。いつも最後は、外の世界へ。',
    'hub.play': 'はじめる',
    'hub.again': 'もういちど',
    'hub.done.today': '今日あそんだ',
    'hub.lang': '言語',
    'hub.feedback': 'ひとこと残す',
    'hub.cycle.hint': 'ひとつふたつ遊ぶと、ゲームはひと休みして、本物の世界を指さします。',
    'hub.rested': 'ゲームは休んでいます。外の世界が開いています。',
    'hub.offer': 'いまのあなたに',
    'hub.another': 'べつのものを',
    'kind.story': 'ものがたり',
    'kind.game': 'あそび',
    'kind.wisdom': 'ことばのたね',

    'exp.aqueduct.name': '石の川',
    'exp.aqueduct.desc': 'ローマが水を坂の下へ招いた方法 — そのあと自分で石を回してみよう。',
    'exp.forest.name': '森の小道',
    'exp.forest.desc': '選択のある短い散歩。最後は四つのゆっくりした呼吸。',

    'aq.p1': '二千年前、ローマは渇いていた。丘には泉があり、都市には人があふれていた。',
    'aq.p2': 'そこで技師たちは何週間も土地を歩き、斜面を読んだ。水は押せない — 坂の下へ招くことしかできない。',
    'aq.p3': '彼らはアーチの上に石の川を築いた。水道橋である。一キロにつき手のひら数枚分の傾き — 眠る人の呼吸よりも穏やかな坂が、水を何十キロも先の泉まで運んだ。',
    'aq.puzzle.hint': '石をタップして回そう。泉から噴水まで、水を招き入れて。',
    'aq.level': '水路',
    'aq.flow': '水は道を見つける。',
    'aq.outro': 'どの水道橋も、人がそばを歩いてほしいと頼んだ、ひとすじの小川にすぎない。',
    'aq.nature': 'さあ、本物の水を探しに行こう — 小川、雨上がりの側溝、川。水が坂を下る道を自分で選ぶのを見てほしい。誰も操縦していないことに気づくはず。',

    'fo.s1': '苔がはじまるところで道を離れる。朝は、親しげな冷たさをしている。',
    'fo.s1.a': '水の音をたどる',
    'fo.s1.b': '光のほうへ登る',
    'fo.s2a': 'リボンのように細い小川。灰色のサギが石のように辛抱づよく立っていて、あなたを気にしない。',
    'fo.s2b': '尾根では松たちが寄りかかり合い、風の中で話している。はるか下の森は、呼吸するひとつの緑の生きものだ。',
    'fo.s2.a': '倒れた白樺に腰かける',
    'fo.s2.b': 'もっとゆっくり、歩きつづける',
    'fo.s3': '苔のクッションをのせた石を見つける。まるで誰かが、あなたが来るのを知っていたかのように。腰を下ろす。',
    'fo.breathe.in': '息を吸って',
    'fo.breathe.out': '手放して',
    'fo.breathe.hint': '円にあわせて。呼吸を四回。',
    'fo.outro': '森は読み込み中にならない。アップデートもしない。もうそこにあって、いちばん古いゲームを続けている。',
    'fo.nature': 'この散歩を、ほんとうにしてみよう。小さくてもいい — いちばん近くの木まででも。電話はポケットに入れたまま、耳にグラフィックを任せて。',

    'nat.title': '招待状',
    'nat.accept': '行ってくる',
    'nat.later': 'まだいい',
    'nat.day.1': '外に出て、風に動かされているものをひとつ探そう — 枝、洗濯物、草。まるまる一分間、見ていよう。',
    'nat.day.2': '何かをしている水を探そう。滴っている、流れている、温かい石から蒸発している。しばらくそばにいよう。',
    'nat.day.3': '立っている場所から見える、いちばん年老いた生きものを探そう。それは誰よりも長く遊びつづけている。',
    'nat.eve.1': '夜です。詩をひとつ、ゆっくり、二度読もう。まずはこの一句から:',
    'nat.eve.2': '夜です。絵をひとつ見つけて — 本の中でも、壁の上でも — 絵がこちらを見返すまで眺めよう。',
    'nat.eve.art': 'おすすめ: 風景画家を探してみて — カスパー・ダーヴィト・フリードリヒ、広重、フィンランドのペッカ・ハロネン。',

    'fb.title': 'ひとこと、いかが?',
    'fb.q': 'どんな気持ちでしたか?',
    'fb.placeholder': 'このゲームの庭師たちへ、何かあれば…(任意)',
    'fb.send': '残す',
    'fb.skip': 'とばす',
    'fb.thanks': 'ありがとう。たしかに受け取りました。',

    'ui.continue': 'つづける',
    'ui.back': 'ロビーへもどる',
    'ui.start': 'はじめる',
  },
};

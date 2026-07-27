// TOKO MIDORI GAMES — what Toko says, in three languages.
//
// A hand-written dialogue tree, not a language model. There is no network call
// here and there never will be: the whole kit is offline-first, zero
// dependency, and a workshop whose entire position is "go make your own" should
// not be answering you with rented autocomplete. Toko says what Toko wrote.
//
// Toko says it in fi / en / ja — the same three the rest of the workshop uses.
// The register is the same in all three: short lines, no hedging, a little
// combative. Japanese has no case, so the Sierra shouting simply does not
// apply there and the lines are written plainly instead of being forced.
//
// This file is the ONE place the counter's words live — the voice, the chat's
// own labels, and the prompts in the feedback branch. It deliberately does not
// reach into hub/i18n.js for them: the kit has to stay droppable on any page
// in the workshop, and words split across two files drift.
//
// A topic is { id, q, a, fi?, ja?, opens?, once?, end?, mode? }
//   q     what the player picks, in the player's mouth (English)
//   a     Toko's reply, one array entry per typed line (English)
//   fi/ja { q, a } — the same two in that language
//   opens ids unlocked by asking it — the conversation grows as you dig
//   once  drop the topic from the menu after it has been asked
//   end   close the counter after the reply finishes
//   mode  'feedback' hands the menu to chat.js's talk-back branch

const GREET = {
  en: ['YOU FOUND THE COUNTER.', 'ASK ME SOMETHING.'],
  fi: ['LÖYSIT TISKIN.', 'KYSY JOTAIN.'],
  ja: ['カウンターを見つけたな。', '何か聞け。'],
};

export function greeting(lang = 'en') { return GREET[lang] ?? GREET.en; }

// the chat's own labels and the feedback branch's prompts
const UI = {
  en: {
    cue: 'TOKO IS AT THE COUNTER',
    talk: 'TALK',
    leave: 'LEAVE',
    hint: '1–9 PICK · ENTER SKIP · ESC LEAVE',
    'fb.hint': 'CTRL+ENTER SEND · ESC BACK',
    'fb.ask': 'GO ON. WHICH ONE.',
    'fb.kind': '{x}. WHAT KIND OF NOTE?',
    'fb.words': 'IN YOUR OWN WORDS.',
    'fb.never': 'NEVER MIND.',
    'fb.send': 'SEND',
    'fb.type': 'TYPE IT HERE',
    'fb.local': 'KEPT ON THIS DEVICE',
    'fb.self': 'THE ARCADE ITSELF',
    'fb.sent': 'GOT IT. THAT IS IN THE WORKSHOP NOW.',
    'fb.blind': 'IT LEFT. THAT FORM DOES NOT ANSWER BACK, SO THAT IS ALL I CAN HONESTLY TELL YOU.',
    'fb.queued': 'THE INBOX DID NOT ANSWER. I AM HOLDING IT. IT GOES OUT NEXT TIME YOU COME IN.',
    'fb.off': 'KEPT ON THIS DEVICE. NO INBOX IS SET YET.',
    'fb.thin': 'WORDS WOULD HAVE HELPED MORE.',
    'fb.gone': 'THE BOOK IS NOT ON THE COUNTER RIGHT NOW.',
  },
  fi: {
    cue: 'TOKO ON TISKILLÄ',
    talk: 'PUHU',
    leave: 'POISTU',
    hint: '1–9 VALITSE · ENTER OHITA · ESC POISTU',
    'fb.hint': 'CTRL+ENTER LÄHETÄ · ESC TAKAISIN',
    'fb.ask': 'ANNA TULLA. MISTÄ NIISTÄ.',
    'fb.kind': '{x}. MILLAISTA PALAUTETTA?',
    'fb.words': 'OMIN SANOIN.',
    'fb.never': 'EI SITTENKÄÄN.',
    'fb.send': 'LÄHETÄ',
    'fb.type': 'KIRJOITA TÄHÄN',
    'fb.local': 'TALLESSA TÄLLÄ LAITTEELLA',
    'fb.self': 'PELISALI ITSE',
    'fb.sent': 'TULI PERILLE. SE ON NYT PAJALLA.',
    'fb.blind': 'LÄHTI. TUO LOMAKE EI VASTAA MITÄÄN, JOTEN ENEMPÄÄ EN VOI REHELLISESTI SANOA.',
    'fb.queued': 'POSTILAATIKKO EI VASTANNUT. PIDÄN SEN TALLESSA. SE LÄHTEE ENSI KÄYNNILLÄ.',
    'fb.off': 'TALLESSA TÄLLÄ LAITTEELLA. POSTILAATIKKOA EI OLE VIELÄ ASETETTU.',
    'fb.thin': 'SANAT OLISIVAT AUTTANEET ENEMMÄN.',
    'fb.gone': 'KIRJA EI OLE NYT TISKILLÄ.',
  },
  ja: {
    cue: 'トコがカウンターにいる',
    talk: '話す',
    leave: '退出',
    hint: '1–9 選択 · ENTER 早送り · ESC 退出',
    'fb.hint': 'CTRL+ENTER 送信 · ESC 戻る',
    'fb.ask': '言ってみろ。どれについてだ。',
    'fb.kind': '{x} だな。どんな内容だ。',
    'fb.words': '自分の言葉で。',
    'fb.never': 'やっぱりやめる。',
    'fb.send': '送信',
    'fb.type': 'ここに書く',
    'fb.local': 'この端末に保存',
    'fb.self': 'アーケードそのもの',
    'fb.sent': '受け取った。もう工房にある。',
    'fb.blind': '送った。あのフォームは返事をしないから、正直に言えるのはここまでだ。',
    'fb.queued': '受信先が応答しなかった。預かっておく。次に来たときに送る。',
    'fb.off': 'この端末に保存した。受信先はまだ設定されていない。',
    'fb.thin': '言葉があったほうが助かった。',
    'fb.gone': '今は帳面がカウンターに出ていない。',
  },
};

export function ui(key, lang = 'en', vars) {
  let v = UI[lang]?.[key] ?? UI.en[key] ?? key;
  if (vars) for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, val);
  return v;
}

export const TOPICS = [
  {
    id: 'who', q: 'WHO ARE YOU?', once: true,
    a: [
      'TOKO MIDORI. 美鳥十湖.',
      'I MAKE THE GAMES ON THIS FLOOR.',
      'THAT IS THE WHOLE BIOGRAPHY.',
    ],
    fi: {
      q: 'KUKA SINÄ OLET?',
      a: ['TOKO MIDORI. 美鳥十湖.', 'TEEN TÄMÄN SALIN PELIT.', 'SIINÄ KOKO ELÄMÄKERTA.'],
    },
    ja: {
      q: 'あんたは誰だ。',
      a: ['トコ・ミドリ。美鳥十湖。', 'このフロアのゲームを作っている。', '経歴はそれで全部だ。'],
    },
    opens: ['mask', 'name'],
  },
  {
    id: 'mask', q: 'WHY THE MASK?', once: true, locked: true,
    a: [
      'SO YOU LOOK AT THE WORK.',
      'A FACE IS A BRAND. I ALREADY HAVE ONE —',
      'IT IS ON THE DOOR, AND IT IS SMILING.',
    ],
    fi: {
      q: 'MIKSI NAAMIO?',
      a: ['JOTTA KATSOISIT TYÖTÄ.', 'KASVOT OVAT BRÄNDI. MINULLA ON JO YKSI —',
        'SE ON OVESSA, JA SE HYMYILEE.'],
    },
    ja: {
      q: 'なぜ仮面を。',
      a: ['作品のほうを見てもらうためだ。', '顔はブランドだ。もう一つ持っている —',
        'ドアにある。笑っているやつだ。'],
    },
    opens: ['clusters'],
  },
  {
    id: 'name', q: 'WHY "MIDORI"?', once: true, locked: true,
    a: [
      'IT IS A NAME, NOT A COLOUR THEORY.',
      'THE BRAND IS BLACK AND MAGENTA.',
      'PEOPLE ASK. I ENJOY IT.',
    ],
    fi: {
      q: 'MIKSI "MIDORI"?',
      a: ['SE ON NIMI, EI VÄRIOPPI.', 'BRÄNDI ON MUSTA JA MAGENTA.',
        'IHMISET KYSYVÄT. NAUTIN SIITÄ.'],
    },
    ja: {
      q: 'なぜ「ミドリ」なんだ。',
      a: ['名前だ。色彩理論ではない。', 'ブランドは黒とマゼンタだ。', 'みんな聞いてくる。悪くない。'],
    },
  },
  {
    id: 'clusters', q: 'WHO ELSE IS TOKO?', once: true, locked: true,
    a: [
      'TOKO IS ONE PERSON.',
      'TOKO IS ALSO EVERYONE WHO EVER SHIPPED',
      'SOMETHING FROM HERE — AND EVERY PLAYER',
      'WHO HAS NOT ARRIVED YET.',
      'THE HEAD IS FULL OF SMALLER HEADS.',
    ],
    fi: {
      q: 'KUKA MUU ON TOKO?',
      a: ['TOKO ON YKSI IHMINEN.', 'TOKO ON MYÖS JOKAINEN JOKA ON IKINÄ',
        'JULKAISSUT TÄÄLTÄ JOTAIN — JA JOKAINEN',
        'PELAAJA JOKA EI OLE VIELÄ SAAPUNUT.', 'PÄÄ ON TÄYNNÄ PIENEMPIÄ PÄITÄ.'],
    },
    ja: {
      q: '他に誰がトコなんだ。',
      a: ['トコは一人だ。', 'トコはここから何かを出した全員でもある —',
        'そしてまだ来ていないプレイヤー全員でも。', '頭の中は小さな頭でいっぱいだ。'],
    },
  },
  {
    id: 'ai', q: 'YOU USE AI?', once: true,
    a: [
      'YES. OUT LOUD. ON PURPOSE.',
      'IT IS A TOOL WITH A SEAM IN IT AND I LET',
      'THE SEAM SHOW.',
      'WHAT I WILL NOT DO IS LET THE MACHINE',
      'BE THE AUDIENCE.',
    ],
    fi: {
      q: 'KÄYTÄTKÖ TEKOÄLYÄ?',
      a: ['KÄYTÄN. ÄÄNEEN. TARKOITUKSELLA.', 'SE ON TYÖKALU JOSSA ON SAUMA, JA ANNAN',
        'SAUMAN NÄKYÄ.', 'MITÄ EN TEE: EN ANNA KONEEN OLLA YLEISÖ.'],
    },
    ja: {
      q: 'AI を使うのか。',
      a: ['使う。公言して、意図的に。', '継ぎ目のある道具だ。継ぎ目は隠さない。',
        'やらないのは、機械を観客にすることだ。'],
    },
    opens: ['scroll'],
  },
  {
    id: 'scroll', q: 'WHAT DOES THAT MEAN?', once: true, locked: true,
    a: [
      'A WORLD WHERE EVERYTHING IS GENERATED',
      'AND NOTHING IS MADE.',
      'WHERE PEOPLE SCROLL OUTPUT INSTEAD OF',
      'CUTTING THEIR OWN.',
      'DO NOT BE THE AUDIENCE FOR THAT.',
    ],
    fi: {
      q: 'MITÄ SE TARKOITTAA?',
      a: ['MAAILMA JOSSA KAIKKI ON GENEROITU', 'EIKÄ MITÄÄN OLE TEHTY.',
        'JOSSA IHMISET SELAAVAT TULOSTETTA SEN', 'SIJAAN ETTÄ LEIKKAISIVAT OMANSA.',
        'ÄLÄ OLE SEN YLEISÖ.'],
    },
    ja: {
      q: 'どういう意味だ。',
      a: ['すべてが生成され、何ひとつ作られていない世界だ。',
        '自分で切り出す代わりに、出力をスクロールする世界。', 'その観客にはなるな。'],
    },
  },
  {
    // The house tempo has a name and this is where it says so — without
    // quoting a word of it. The song is somebody else's; the mood is Toko's.
    id: 'music', q: 'WHAT ARE YOU LISTENING TO?', once: true,
    a: [
      'SOMETHING LONG.',
      'IT IS MOSTLY QUIET, AND THEN IT IS NOT.',
      'I PUT IT ON TO DRAW TO AND I NEVER',
      'NOTICE IT END.',
    ],
    fi: {
      q: 'MITÄ KUUNTELET?',
      a: ['JOTAIN PITKÄÄ.', 'SE ON ENIMMÄKSEEN HILJAINEN, JA SITTEN EI OLE.',
        'LAITAN SEN SOIMAAN JA PIIRRÄN,', 'ENKÄ KOSKAAN HUOMAA SEN LOPPUVAN.'],
    },
    ja: {
      q: '何を聴いている。',
      a: ['長いやつだ。', 'ほとんど静かで、そのあと静かじゃなくなる。',
        'かけて絵を描く。終わったのに気づいたことがない。'],
    },
    opens: ['faraway'],
  },
  {
    id: 'faraway', q: 'YOU SEEM FAR AWAY.', once: true, locked: true,
    a: [
      'I AM HERE.',
      'I JUST DO NOT SEE THE POINT IN HURRYING.',
      'THE WORK TAKES AS LONG AS IT TAKES.',
      'SO DOES THE SOLO.',
    ],
    fi: {
      q: 'VAIKUTAT KAUKAISELTA.',
      a: ['OLEN TÄSSÄ.', 'EN VAIN NÄE SYYTÄ KIIREHTIÄ.',
        'TYÖ VIE NIIN KAUAN KUIN VIE.', 'NIIN VIE SOOLOKIN.'],
    },
    ja: {
      q: '遠くにいるみたいだ。',
      a: ['ここにいる。', '急ぐ理由が見当たらないだけだ。',
        '仕事はかかるだけかかる。', 'ソロも同じだ。'],
    },
  },
  {
    id: 'start', q: 'HOW DO I START?',
    a: [
      'OPEN THE SOURCE. BREAK IT.',
      'SHIP THE BROKEN ONE.',
      'NOBODY IS COMING TO GIVE YOU PERMISSION.',
    ],
    fi: {
      q: 'MITEN ALOITAN?',
      a: ['AVAA LÄHDEKOODI. RIKO SE.', 'JULKAISE RIKKINÄINEN.',
        'KUKAAN EI TULE ANTAMAAN SINULLE LUPAA.'],
    },
    ja: {
      q: 'どう始めればいい。',
      a: ['ソースを開け。壊せ。', '壊れたまま出せ。', '許可をくれる者は来ない。'],
    },
    opens: ['bad'],
  },
  {
    id: 'bad', q: 'WHAT IF I AM BAD AT IT?', once: true, locked: true,
    a: [
      'GOOD. THAT IS THE FIRST DRAFT WORKING.',
      'I SHIPPED THIS LOGO ONCE WITH THE EYES',
      'CLOSED UP INTO BLOBS.',
      'IT IS STILL IN THE COMMIT LOG.',
      'I DID NOT DELETE IT. I FIXED IT.',
    ],
    fi: {
      q: 'ENTÄ JOS OLEN HUONO SIINÄ?',
      a: ['HYVÄ. SILLOIN ENSIMMÄINEN VERSIO TOIMII.', 'JULKAISIN TÄMÄN LOGON KERRAN SILMÄT',
        'UMPEEN MENNEINÄ MÖYKKYINÄ.', 'SE ON YHÄ COMMIT-LOKISSA.',
        'EN POISTANUT SITÄ. KORJASIN SEN.'],
    },
    ja: {
      q: '下手だったらどうする。',
      a: ['いい。それが第一稿というものだ。', 'このロゴは一度、目が潰れた塊のまま出した。',
        'コミットログにまだ残っている。', '消さなかった。直した。'],
    },
  },
  {
    id: 'floor', q: 'WHAT IS ON THE FLOOR?',
    a: [
      'GEL BULLET HELL. A VOXEL SURVIVAL PIT.',
      'A PAPER ROUTE. A GALLERY SHOOTER.',
      'AND A QUIET ONE THAT SENDS YOU OUTSIDE.',
      'PICK A CABINET. PRESS PLAY.',
    ],
    fi: {
      q: 'MITÄ SALISSA ON?',
      a: ['GEELILUOTIHELVETTI. VOKSELIKUOPPA.', 'LEHDENJAKOREITTI. GALLERIARÄISKINTÄ.',
        'JA YKSI HILJAINEN JOKA LÄHETTÄÄ ULOS.', 'VALITSE KAAPPI. PAINA PELAA.'],
    },
    ja: {
      q: 'フロアには何がある。',
      a: ['ゼリーの弾幕。ボクセルの生存穴。', '新聞配達。ギャラリーシューター。',
        'そして外へ送り出す静かなやつ。', 'キャビネットを選べ。プレイを押せ。'],
    },
  },
  {
    id: 'cost', q: 'WHAT DOES IT COST?',
    a: [
      'NOTHING.',
      'NO PUBLISHER. NO LAUNCHER. NO ACCOUNT.',
      'IF THAT SOUNDS LIKE A CATCH,',
      'READ THE SOURCE. IT IS RIGHT THERE.',
    ],
    fi: {
      q: 'MITÄ SE MAKSAA?',
      a: ['EI MITÄÄN.', 'EI JULKAISIJAA. EI LATAINTA. EI TILIÄ.',
        'JOS SE KUULOSTAA ANSALTA,', 'LUE LÄHDEKOODI. SE ON SIINÄ.'],
    },
    ja: {
      q: 'いくらかかる。',
      a: ['何もかからない。', 'パブリッシャーもランチャーもアカウントもない。',
        '裏があると思うなら、', 'ソースを読め。そこにある。'],
    },
  },
  {
    // Always on the menu, never spent. Everything else here is a thing Toko
    // says; this is the one thing the counter is FOR — the person on the other
    // side of it gets to talk back. chat.js takes it over after the reply: the
    // next menu is which project, then what kind of note, then the words.
    id: 'feedback', q: 'I HAVE SOMETHING TO TELL YOU.', mode: 'feedback',
    a: ['GO ON. WHICH ONE.'],
    fi: { q: 'MINULLA ON SINULLE ASIAA.', a: ['ANNA TULLA. MISTÄ NIISTÄ.'] },
    ja: { q: '伝えたいことがある。', a: ['言ってみろ。どれについてだ。'] },
  },
  {
    id: 'bye', q: 'NOTHING. I AM GOING TO GO MAKE SOMETHING.', end: true,
    a: [
      'GOOD.',
      'GO MAKE YOUR OWN.',
    ],
    fi: {
      q: 'EI MITÄÄN. MENEN TEKEMÄÄN JOTAIN.',
      a: ['HYVÄ.', 'MENE TEKEMÄÄN OMASI.'],
    },
    ja: {
      q: '何も。何か作りに行く。',
      a: ['いい。', '自分のを作れ。'],
    },
  },
];

// What the player says, and what Toko says back, in one language. Falls back to
// the English written on the topic itself, so a topic added today without
// translations still works — it just speaks English inside a Finnish counter.
export function topicQ(t, lang = 'en') { return t[lang]?.q ?? t.q; }
export function topicA(t, lang = 'en') { return t[lang]?.a ?? t.a; }

// for the gate: every topic should say both things in all three
export function langsOf(t) {
  return ['fi', 'ja'].filter(l => t[l]?.q && t[l]?.a?.length);
}

// the topics on the menu at any moment: everything unlocked, minus what has
// been asked and spent, with FEEDBACK second-to-last and GOODBYE last. Those
// two hold their places on purpose — the way out and the way to talk back
// should be where you left them, not shuffled by what you happened to ask.
export function menu(unlocked, asked) {
  const live = TOPICS.filter(t =>
    (!t.locked || unlocked.has(t.id)) && !(t.once && asked.has(t.id)));
  const tail = t => (t.end ? 2 : t.mode === 'feedback' ? 1 : 0);
  return [...live.filter(t => !tail(t)), ...live.filter(t => tail(t) === 1),
    ...live.filter(t => tail(t) === 2)];
}

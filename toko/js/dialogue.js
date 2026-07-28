// TOKO MIDORI GAMES — what Toko says.
//
// A hand-written dialogue tree, not a language model. There is no network call
// here and there never will be: the whole kit is offline-first, zero
// dependency, and a workshop whose entire position is "go make your own" should
// not be answering you with rented autocomplete. Toko says what Toko wrote.
//
// A topic is { id, q, a, ... }
//   q      what the player picks, in the player's mouth
//   a      Toko's reply, one array entry per typed line
//   opens  ids unlocked by asking it — the conversation grows as you dig
//   once   drop the topic from the menu after it has been asked
//   locked start hidden; something else has to `opens` it
//   end    close the counter after the reply finishes
//   pick   follow the reply with a real cabinet and a real link
//   gift   follow the reply with a sticker he generates on the spot
//   asks   HE asks YOU: the menu becomes your possible answers
//   after  hours (0–23) this topic exists in at all
//   needs  how many things you must have asked before it appears
//   keys   words the typed parser matches on, over and above the question
//   note   follow the reply with a box to write him one
//   scores follow the reply with whatever the games left on THIS machine
//   torn   the portrait tears while he answers — a glitch is an event

export const GREETING = [
  'YOU FOUND THE COUNTER.',
  'ASK ME SOMETHING.',
];

// 00:00–04:59. He is still up, and so are you, and he is not going to
// pretend that is normal.
// Two lines, not three. He is unhurried, not slow: at 34ms a character a
// third line puts four seconds between opening the counter and being allowed
// to say anything, and that is a wait, not a mood.
export const LATE = [
  'IT IS YOU, AT THIS HOUR.',
  'THE RECORD IS STILL GOING. ASK.',
];

// He came back on his own. Fires when you sit at the counter and pick
// nothing — Sierra front desks were never silent either. Capped per visit,
// because a counter that talks at you is a shop.
export const ASIDES = [
  ['TAKE YOUR TIME.'],
  ['I AM NOT GOING ANYWHERE.'],
  ['THE SOLO IS ABOUT TO START AGAIN.'],
  ['YOU CAN ALSO JUST GO AND PLAY ONE.'],
  ['I DO NOT MIND THE QUIET.'],
];

export const TOPICS = [
  // ── who ────────────────────────────────────────────────────────────────
  {
    id: 'who', q: 'WHO ARE YOU?', once: true,
    a: [
      'TOKO MIDORI. 美鳥十湖.',
      'I MAKE THE GAMES ON THIS FLOOR.',
      'THAT IS THE WHOLE BIOGRAPHY.',
    ],
    opens: ['mask', 'name'],
  },
  {
    id: 'mask', q: 'WHY THE MASK?', once: true, locked: true,
    a: [
      'SO YOU LOOK AT THE WORK.',
      'A FACE IS A BRAND. I ALREADY HAVE ONE —',
      'IT IS ON THE DOOR, AND IT IS SMILING.',
    ],
    opens: ['clusters'],
  },
  {
    id: 'name', q: 'WHY "MIDORI"?', once: true, locked: true,
    a: [
      'IT IS A NAME, NOT A COLOUR THEORY.',
      'THE BRAND IS BLACK AND MAGENTA.',
      'PEOPLE ASK. I ENJOY IT.',
    ],
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
  },

  // ── the machine ────────────────────────────────────────────────────────
  {
    id: 'ai', q: 'YOU USE AI?', once: true,
    a: [
      'YES. OUT LOUD. ON PURPOSE.',
      'IT IS A TOOL WITH A SEAM IN IT AND I LET',
      'THE SEAM SHOW.',
      'WHAT I WILL NOT DO IS LET THE MACHINE',
      'BE THE AUDIENCE.',
    ],
    opens: ['scroll', 'hypocrite'],
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
  },
  {
    // The hardest question anyone can ask this workshop. He takes it flat on
    // rather than dodging — a brand that will not hear its own objection is
    // an advertisement.
    id: 'hypocrite', q: 'SO YOU ARE A HYPOCRITE.', once: true, locked: true,
    a: [
      'PROBABLY. SIT DOWN.',
      'I DO NOT THINK THE TOOL IS THE PROBLEM.',
      'A SAMPLER WAS NOT THE PROBLEM EITHER.',
      'THE PROBLEM IS HANDING SOMEBODY ELSE',
      'THE DECIDING.',
      'I STILL DECIDE. THAT IS THE WHOLE LINE.',
    ],
    opens: ['seam'],
  },
  {
    id: 'seam', q: 'WHAT IS A SEAM?', once: true, locked: true,
    a: [
      'THE PLACE THE MAKING SHOWS.',
      'A TEAR IN THE LOGO. A GLITCH THAT REPEATS',
      'BECAUSE IT IS SEEDED AND NOT RANDOM.',
      'POLISH HIDES THE HAND.',
      'I WANT YOU TO SEE THE HAND.',
    ],
  },

  // ── the tempo ──────────────────────────────────────────────────────────
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
  },
  {
    // Only on the menu between midnight and five. He is not going to mention
    // the hour at two in the afternoon.
    id: 'late', q: 'YOU ARE UP LATE.', once: true, after: [0, 5],
    a: [
      'THIS IS THE GOOD PART OF THE DAY.',
      'NOBODY IS AWAKE TO HAVE AN OPINION.',
      'THE WORK GOES SIDEWAYS AND I LET IT.',
      'GO TO BED AFTER ONE MORE.',
    ],
  },

  // ── go make your own ───────────────────────────────────────────────────
  {
    id: 'start', q: 'HOW DO I START?',
    a: [
      'OPEN THE SOURCE. BREAK IT.',
      'SHIP THE BROKEN ONE.',
      'NOBODY IS COMING TO GIVE YOU PERMISSION.',
    ],
    opens: ['bad', 'tools'],
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
  },
  {
    id: 'tools', q: 'WHAT DO YOU USE?', once: true, locked: true,
    a: [
      'A TEXT EDITOR AND A BROWSER.',
      'NO ENGINE. NO LAUNCHER. NO ACCOUNT.',
      'THE LOGO YOU ARE LOOKING AT IS SIX ARCS',
      'AND A TABLE OF NUMBERS.',
      'THERE IS NO IMAGE FILE ANYWHERE IN HERE.',
    ],
    opens: ['build'],
  },
  {
    id: 'build', q: 'NO BUILD STEP?', once: true, locked: true,
    a: [
      'NONE. YOU OPEN THE FILE AND IT RUNS.',
      'A BUILD STEP IS A DOOR WITH A LOCK ON IT',
      'BETWEEN A KID AND THE SOURCE.',
      'I REMEMBER BEING THAT KID.',
    ],
  },

  // ── the floor ──────────────────────────────────────────────────────────
  {
    // `pick` tells the counter to follow the answer with a real cabinet and a
    // real link. Toko does not list the floor at you; he picks one.
    id: 'play', q: 'WHAT SHOULD I PLAY?', pick: true,
    a: [
      'TODAY? THIS ONE.',
      'I DO NOT PICK A NEW ONE EVERY TIME YOU ASK.',
      'THAT IS A SHOP. THIS IS A COUNTER.',
    ],
  },
  {
    id: 'floor', q: 'WHAT IS ON THE FLOOR?',
    a: [
      'GEL BULLET HELL. A VOXEL SURVIVAL PIT.',
      'A PAPER ROUTE. A GALLERY SHOOTER.',
      'AND A QUIET ONE THAT SENDS YOU OUTSIDE.',
      'PICK A CABINET. PRESS PLAY.',
    ],
    opens: ['quiet', 'dead'],
  },
  {
    id: 'quiet', q: 'THE QUIET ONE?', once: true, locked: true,
    a: [
      'IT IS CALLED THE GAME OF LIFE.',
      'IT ENDS BY ASKING YOU TO GO OUTSIDE,',
      'AND IT MEANS IT — IT WORKS WITH THE',
      'SIGNAL OFF.',
      'THAT IS THE ONE ROOM I DO NOT SIGN.',
      'A LOGO IN THERE WOULD UNDO IT.',
    ],
  },
  {
    id: 'dead', q: 'IS ANYTHING HERE DEAD?', once: true, locked: true,
    a: [
      'YES. AND IT STAYS ON THE FLOOR.',
      'THE ARCHIVE IS NOT A GRAVEYARD, IT IS',
      'A SHELF.',
      'A BUTTON THAT SAYS "NOT UP" IS HONEST.',
      'A BUTTON THAT 404s IS NOT.',
    ],
  },

  // ── you say something back ─────────────────────────────────────────────
  {
    // The counter's whole reason for existing, really. Everything else is
    // Toko talking; this is the one place the traffic runs the other way and
    // ends up somewhere a person reads it.
    id: 'note', q: 'I HAVE SOMETHING TO SAY.', note: true,
    a: [
      'THEN SAY IT. I AM LISTENING.',
      'BROKEN, BORING, WRONG — ALL USEFUL.',
      'I WILL NOT ARGUE WITH YOU ABOUT IT.',
    ],
  },

  // ── he asks you ────────────────────────────────────────────────────────
  {
    // The one topic that runs the other way. `asks` turns the menu into YOUR
    // possible answers for one turn — the counter stops being a vending
    // machine for lore and becomes a conversation.
    id: 'me', q: 'ASK ME SOMETHING INSTEAD.', once: true,
    a: [
      'ALL RIGHT. FAIR.',
      'WHY ARE YOU STANDING AT A COUNTER',
      'IN A GAME YOU DID NOT MAKE?',
    ],
    asks: [
      {
        q: 'I WANT SOMETHING TO PLAY.',
        a: [
          'HONEST. GO ON THEN — PICK A CABINET.',
          'COME BACK AND TELL ME IF IT IS BAD.',
          'I WILL BELIEVE YOU.',
        ],
      },
      {
        q: 'I WANT TO MAKE ONE OF THESE.',
        a: [
          'THEN YOU ARE IN THE RIGHT ROOM AND',
          'THE WRONG PART OF IT.',
          'THE SOURCE IS ONE MENU AWAY.',
          'STOP TALKING TO ME.',
        ],
        opens: ['start', 'tools'],
      },
      {
        q: 'I AM AVOIDING WORK.',
        a: [
          'SO AM I. THIS COUNTER IS PROCRASTINATION',
          'WITH A LOGO ON IT.',
          'STAY AS LONG AS YOU LIKE.',
        ],
      },
      {
        q: 'I DO NOT KNOW.',
        a: [
          'THAT IS THE BEST ANSWER ANYONE GIVES ME.',
          'MOST OF WHAT IS ON THIS FLOOR STARTED',
          'AT EXACTLY THAT.',
        ],
        opens: ['start'],
      },
    ],
  },

  // ── the money ──────────────────────────────────────────────────────────
  {
    id: 'cost', q: 'WHAT DOES IT COST?',
    a: [
      'NOTHING.',
      'NO PUBLISHER. NO LAUNCHER. NO ACCOUNT.',
      'IF THAT SOUNDS LIKE A CATCH,',
      'READ THE SOURCE. IT IS RIGHT THERE.',
    ],
    opens: ['steal'],
  },
  {
    id: 'steal', q: 'CAN I TAKE YOUR CODE?', once: true, locked: true,
    a: [
      'TAKE IT. THAT IS WHAT IT IS FOR.',
      'DO NOT TAKE THE FACE — THAT ONE IS MINE',
      'AND YOU SHOULD WANT YOUR OWN ANYWAY.',
      'EVERYTHING ELSE: YOURS.',
      'PUT YOUR NAME ON IT AND MAKE IT WORSE.',
    ],
    opens: ['gift'],
  },

  // ── he hands you something ─────────────────────────────────────────────
  {
    // Not a link to a file — there are no files. The counter draws the sticker
    // out of the same arcs the mark is made of and hands it to you as SVG.
    id: 'gift', q: 'GIVE ME SOMETHING, THEN.', once: true, locked: true, gift: true,
    a: [
      'HERE. I DREW IT WHILE YOU WERE ASKING.',
      'IT IS VECTOR, SO IT IS ANY SIZE YOU LIKE.',
      'PRINT IT. PUT IT ON A LAPTOP.',
      'PUT IT SOMEWHERE IT IS NOT SUPPOSED',
      'TO BE.',
    ],
  },

  // ── what he can see from here ──────────────────────────────────────────
  {
    // Read off YOUR machine, by the games themselves, and never sent
    // anywhere. He says so, because a workshop that claims not to profile
    // you should be able to explain exactly what it just looked at.
    id: 'seen', q: 'HAVE YOU SEEN ME PLAY?', once: true, scores: true,
    a: [
      'ONLY WHAT THE CABINETS WROTE DOWN',
      'ON YOUR OWN MACHINE.',
      'IT NEVER LEAVES IT, AND I COULD NOT',
      'READ IT FROM ANYWHERE ELSE IF I WANTED TO.',
    ],
  },

  // ── the back of the shop ───────────────────────────────────────────────
  {
    // Not unlockable by any single topic — it appears once you have actually
    // dug. The reward for exhausting a tree should be more tree.
    id: 'back', q: 'YOU HAVE BEEN TALKING A WHILE.', once: true, needs: 9,
    a: [
      'I HAVE. NOBODY USUALLY GETS THIS FAR.',
      'SO: THE MASK IS NOT MYSTERY, IT IS',
      'A DOOR HELD OPEN.',
      'ANY OF YOU COULD BE STANDING HERE.',
      'THAT IS THE WHOLE JOKE AND IT IS ALSO',
      'THE WHOLE PLAN.',
      'GO MAKE YOUR OWN.',
    ],
    opens: ['gift'],
  },

  {
    id: 'bye', q: 'NOTHING. I AM GOING TO GO MAKE SOMETHING.', end: true,
    a: [
      'GOOD.',
      'GO MAKE YOUR OWN.',
    ],
  },
];

// The portrait tears while he answers these. A glitch is an EVENT, not a
// state (BRAND.md §5), and the events worth having one are the moments the
// seam is what he is talking about.
for (const id of ['ai', 'scroll', 'hypocrite', 'seam']) {
  const t = TOPICS.find(x => x.id === id);
  if (t) t.torn = true;
}

// ── the parser ───────────────────────────────────────────────────────────
// You can also just TYPE at him, which is the whole reason this thing is
// shaped like Police Quest. Still no language model: it is word overlap
// against a lookup table, and when it misses it says so in his voice rather
// than inventing an answer.
//
// Kept as one table rather than sprinkled through the topics above, because
// it is a lookup and it reads better as a lookup.
const KEYS = {
  who: ['WHO', 'TOKO', 'MIDORI', 'ARTIST', 'MAKER', 'HELLO', 'HI'],
  mask: ['MASK', 'FACE', 'HIDE', 'HIDDEN', 'ANONYMOUS', 'IDENTITY'],
  name: ['MIDORI', 'GREEN', 'JAPANESE', 'MEAN', 'MEANING'],
  clusters: ['ELSE', 'EVERYONE', 'OTHERS', 'TEAM', 'CLUSTER', 'HEADS'],
  ai: ['AI', 'MACHINE', 'MODEL', 'ROBOT', 'GENERATED', 'LLM', 'CLAUDE'],
  scroll: ['SCROLL', 'SLOP', 'AUDIENCE', 'FEED', 'CONTENT'],
  hypocrite: ['HYPOCRITE', 'HYPOCRISY', 'CHEAT', 'CHEATING', 'FAKE', 'LAZY'],
  seam: ['SEAM', 'GLITCH', 'BROKEN', 'SHOW', 'POLISH'],
  music: ['MUSIC', 'LISTENING', 'SONG', 'RECORD', 'FLOYD', 'PINK', 'NUMB'],
  faraway: ['FAR', 'AWAY', 'SLOW', 'TIRED', 'STONED', 'DREAMING'],
  late: ['LATE', 'NIGHT', 'SLEEP', 'BED', 'HOUR', 'TIME'],
  start: ['START', 'BEGIN', 'HOW', 'LEARN', 'MAKE', 'FIRST'],
  bad: ['BAD', 'TERRIBLE', 'FAIL', 'SUCK', 'MISTAKE', 'AFRAID'],
  tools: ['TOOLS', 'TOOL', 'USE', 'ENGINE', 'UNITY', 'GODOT', 'EDITOR', 'STACK'],
  build: ['BUILD', 'COMPILE', 'BUNDLER', 'NPM', 'WEBPACK', 'STEP'],
  play: ['PLAY', 'RECOMMEND', 'SUGGEST', 'PICK', 'WHICH', 'BEST'],
  floor: ['FLOOR', 'GAMES', 'LIST', 'CATALOGUE', 'WHAT', 'ARCADE'],
  quiet: ['QUIET', 'LIFE', 'CALM', 'ZEN', 'NATURE', 'OUTSIDE'],
  dead: ['DEAD', 'ARCHIVE', 'ARCHIVED', 'OLD', 'ABANDONED', 'DYING'],
  me: ['ASK', 'YOU', 'INSTEAD', 'TURN', 'QUESTION'],
  cost: ['COST', 'PRICE', 'MONEY', 'PAY', 'FREE', 'BUY', 'ADS'],
  steal: ['STEAL', 'TAKE', 'COPY', 'FORK', 'LICENCE', 'LICENSE', 'SOURCE', 'CODE'],
  gift: ['GIFT', 'STICKER', 'GIVE', 'SOMETHING', 'FREE', 'DOWNLOAD', 'SVG'],
  note: ['NOTE', 'SAY', 'FEEDBACK', 'TELL', 'BUG', 'IDEA', 'THANKS', 'HATE', 'LOVE'],
  seen: ['SEEN', 'SCORE', 'SCORES', 'HIGH', 'RECORD', 'PLAYED', 'STATS'],
  back: ['BACK', 'MORE', 'DEEPER', 'SECRET'],
  bye: ['BYE', 'GOODBYE', 'LEAVE', 'EXIT', 'QUIT', 'NOTHING', 'THANKS'],
};
for (const t of TOPICS) t.keys = KEYS[t.id] || [];

// words that carry no signal, so matching on them would make every sentence
// match every topic
const STOP = new Set(['THE', 'A', 'AN', 'IS', 'ARE', 'WAS', 'DO', 'DOES', 'DID',
  'I', 'ME', 'MY', 'IT', 'THAT', 'THIS', 'TO', 'OF', 'IN', 'ON', 'AND', 'OR',
  'FOR', 'AM', 'BE', 'CAN', 'WILL', 'YOUR', 'HAVE', 'HAS', 'NOT', 'SO', 'AT']);

const words = s => (s.toUpperCase().match(/[A-Z']+/g) || []).filter(w => !STOP.has(w));

// He hears the cry and answers it, whatever else is in the sentence.
export const CRY = {
  test: s => /GO\s+MAKE\s+(YOUR\s+)?OWN/i.test(s),
  a: ['THERE IT IS.', 'NOW STOP TYPING AT ME AND GO.'],
};

// What he says when the parser misses. It admits the miss rather than
// guessing — a counter that pretends to understand is worse than one that
// shrugs.
export const MISSES = [
  ['I DO NOT KNOW THAT ONE.', 'TRY THE LIST.'],
  ['SAY IT ANOTHER WAY.'],
  ['NO. ASK ME SOMETHING ON THE LIST,', 'OR TELL ME I AM WRONG ABOUT SOMETHING.'],
  ['THAT IS NOT A THING I HAVE AN ANSWER FOR.'],
];

// Best word overlap over keys and the topic's own question, keys counting
// double. Under two points it returns null and he shrugs — a low bar here
// would have him confidently answering the wrong question, which is exactly
// the failure the whole workshop is against.
export function find(text) {
  const said = words(text || '');
  if (!said.length) return null;
  let best = null, score = 0;
  for (const t of TOPICS) {
    const keys = new Set(t.keys);
    const own = new Set(words(t.q));
    let s = 0;
    for (const w of new Set(said)) s += keys.has(w) ? 2 : (own.has(w) ? 1 : 0);
    if (s > score) { score = s; best = t; }
  }
  return score >= 2 ? best : null;
}

const byId = new Map(TOPICS.map(t => [t.id, t]));
export const topic = id => byId.get(id);

// What Toko opens with. Three inputs and no profile: how many times you have
// been here, what hour it is where you are, and the last thing you asked —
// which is remembered so that coming back feels like coming back, not like
// being recognised by a system.
const RETURNING = [
  ['YOU CAME BACK.', 'ASK ME SOMETHING.'],
  ['AGAIN.', 'GO ON THEN.'],
  ['YOU KNOW WHERE I AM.', 'ASK.'],
];

export function greeting({ visits = 1, hour = 12, last = null, noted = false } = {}) {
  // A note outranks everything: somebody took the trouble to write, and the
  // least the counter can do is show it registered.
  if (noted) return ['I GOT YOUR NOTE.', 'I READ ALL OF THEM. ASK ME SOMETHING.'];
  const t = last && byId.get(last);
  if (visits > 1 && t) {
    return ['LAST TIME YOU ASKED ABOUT ' + tail(t.q), 'ASK ME SOMETHING ELSE.'];
  }
  if (hour < 5) return LATE.slice();
  if (visits <= 1) return GREETING.slice();
  return RETURNING[(visits - 2) % RETURNING.length].slice();
}

// ── what the cabinets left on your machine ───────────────────────────────
// Read locally, shown once, sent nowhere. Each entry is the key a game
// actually writes; unknown keys are simply absent, which is why a machine
// that has played nothing gets an honest "nothing here" rather than a guess.
export const SCOREBOARD = [
  ['hyperDaggerHi', 'HYPER DAGGER', s => `${(+s).toFixed(1)}s SURVIVED`],
  ['hyperDaggerHiHyper', 'HYPER DAGGER (HYPER)', s => `${(+s).toFixed(1)}s`],
  ['dropCabalHi', 'DROP CABAL', s => `${(+s).toLocaleString()} POINTS`],
  ['paperRouteHi', 'PAPER ROUTE', s => `${(+s).toLocaleString()} POINTS`],
  ['tokoDropHi', 'TOKO DROP', s => `WAVE ${s}`],
];

export const SEEN_NOTHING = [
  'NOTHING. EITHER YOU ARE NEW OR YOU CLEARED',
  'IT, AND BOTH ARE FINE BY ME.',
  'GO PUT A NUMBER ON SOMETHING.',
];
export const SEEN_SOMETHING = ['SO FAR:'];

// "WHY THE MASK?" → "THE MASK." — the player's own words handed back, minus
// the question. Cheap, and it reads like memory rather than telemetry.
function tail(q) {
  const words = q.replace(/[?.]$/, '').split(' ');
  return words.slice(Math.max(0, words.length - 2)).join(' ') + '.';
}

// The topics on the menu at any moment: everything unlocked and in season,
// minus what has been asked and spent, with GOODBYE always last.
//
// `fresh` (ids unlocked by the last thing you asked) float to the top. The
// menu shows nine at most, so without this a branch you just opened could be
// pushed off the bottom of the list that opened it.
export function menu(unlocked, asked, { hour = 12, fresh = null } = {}) {
  const live = TOPICS.filter(t =>
    (!t.locked || unlocked.has(t.id))
    && !(t.once && asked.has(t.id))
    && (!t.needs || asked.size >= t.needs)
    && (!t.after || (hour >= t.after[0] && hour < t.after[1])));
  const rank = t => (fresh && fresh.has(t.id) ? 0 : 1);
  const body = live.filter(t => !t.end).sort((a, b) => rank(a) - rank(b));
  return [...body, ...live.filter(t => t.end)];
}

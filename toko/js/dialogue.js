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
//   notes  follow the reply with the notes you have already left
//   changed follow the reply with the log of what actually got fixed
//   askGames  like `asks`, but the options are the live catalogue
//   askFaves  like `asks`, but the options are somebody else's games
//   scores follow the reply with whatever the games left on THIS machine
//   torn   the portrait tears while he answers — a glitch is an event

// The brand's release number, and the one place the code states it. It is the
// first `## vN` heading in toko/VERSIONS.md — test/brand.cjs fails if the two
// drift, because a version that is only true in the changelog is worse than
// no version at all. `scripts/versions.mjs` reads the log for
// hub/versions.json; the counter shows THIS, so it is right even offline.
export const VERSION = 5;

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

// You just came off a cabinet — the browser said so, and the badge in that
// game's corner is probably how you got here. He does not pretend not to
// notice. This replaces the greeting entirely rather than being bolted on
// after it: two lines is the ceiling (see LATE), and a player who has just
// played something has a subject already.
//
// It is the shortest path this floor has between finishing a run and saying
// something about it — the note that follows files under THAT game, so a
// thought caught while it is still warm lands where it is useful.
export const BACK_FROM = [
  'STRAIGHT OFF {x}, THEN.',
  'WHAT DID IT DO TO YOU?',
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

  // ── the mantra ─────────────────────────────────────────────────────────
  // The shop rules. Every one of these is a thing that was decided while
  // building something on this floor, and every one of them is short enough
  // to shout across a room, which is the test.
  {
    id: 'mantra', q: 'WHAT MAKES A GOOD GAME?',
    a: [
      'THE VERB.',
      'RUN. FIRE. FALL. POUR. WAIT.',
      'EVERYTHING ELSE IS DECORATION ON A VERB,',
      'AND IF THE VERB IS DULL THE DECORATION',
      'IS A COVER-UP.',
    ],
    opens: ['thirty', 'feel', 'hard', 'creed', 'faves'],
  },
  {
    // Where the mantra stops being an opinion and turns into receipts. Every
    // rule he shouts came off one of these.
    id: 'faves', q: 'WHAT DO YOU PLAY?', askFaves: true,
    a: ['OTHER PEOPLE\u2019S GAMES. CONSTANTLY.',
      'EVERYTHING I SHOUT ABOUT CAME OFF ONE',
      'OF THESE. PICK ONE.'],
  },
  {
    id: 'thirty', q: 'AND THE FIRST THIRTY SECONDS?', once: true, locked: true,
    a: [
      'THEY TEACH YOU BY KILLING YOU.',
      'NOT A TUTORIAL. NOT A WALL OF TEXT WITH',
      'A CONTINUE BUTTON.',
      'DIE ONCE, UNDERSTAND, GO AGAIN.',
      'IF IT NEEDS EXPLAINING IT NEEDS REBUILDING.',
    ],
  },
  {
    id: 'feel', q: 'WHAT IS "FEEL"?', once: true, locked: true,
    a: [
      'THE GAP BETWEEN YOUR THUMB AND THE SCREEN.',
      'A PRESS ANSWERS IN ONE FRAME OR IT IS',
      'BROKEN, AND IT DOES NOT MATTER HOW GOOD',
      'THE REST OF IT LOOKS.',
      'SHAKE THE CAMERA. MOVE THE NUMBER.',
      'MAKE THE HIT COST SOMETHING TO WATCH.',
    ],
    opens: ['juice'],
  },
  {
    id: 'juice', q: 'IS THAT NOT JUST JUICE?', once: true, locked: true,
    a: [
      'JUICE ON A BAD VERB IS A LIAR.',
      'IT BUYS YOU THIRTY SECONDS AND THEN THE',
      'PLAYER NOTICES THERE IS NOTHING UNDER IT.',
      'GET THE VERB RIGHT WHILE IT IS STILL UGLY.',
      'THEN MAKE IT LOUD.',
    ],
  },
  {
    id: 'hard', q: 'WHY IS EVERYTHING SO HARD?', once: true, locked: true,
    a: [
      'IT IS NOT HARD. IT IS HONEST.',
      'THE ENEMY IS SLOW AND VISIBLE AND IT',
      'STILL GETS YOU, SO THAT IS ON YOU,',
      'AND SO IS THE NEXT ONE.',
      'A GAME THAT CANNOT KILL YOU CANNOT',
      'CONGRATULATE YOU EITHER.',
    ],
    opens: ['loop'],
  },
  {
    id: 'loop', q: 'WHAT MAKES ME PRESS AGAIN?', once: true, locked: true,
    a: [
      'THE RUN HAS TO BE SHORT ENOUGH THAT',
      'LOSING IS CHEAPER THAN QUITTING.',
      'NO SAVE. NO LOADING SCREEN. NO MENU',
      'BETWEEN THE DOOR AND THE VERB.',
      'ONE BUTTON AND YOU ARE BACK IN.',
    ],
  },
  {
    // The set piece. Nine lines, and every one of them is a rule somebody
    // on this floor actually followed.
    id: 'creed', q: 'SAY THE WHOLE THING.', once: true, locked: true,
    a: [
      'THE VERB FIRST.',
      'ONE FRAME TO ANSWER.',
      'DIE, UNDERSTAND, GO AGAIN.',
      'SHORT RUNS. NO SAVE.',
      'CONSTRAINTS, NOT NOSTALGIA.',
      'DRAW IT IN CODE.',
      'NO ACCOUNT. NO LAUNCHER. NO PERMISSION.',
      'SHIP THE BROKEN ONE.',
      'GO MAKE YOUR OWN.',
    ],
    opens: ['retro', 'anarchy'],
  },

  // ── the position ───────────────────────────────────────────────────────
  {
    id: 'retro', q: '"CONSTRAINTS, NOT NOSTALGIA"?', once: true, locked: true,
    a: [
      'A 2600 CHANGED COLOUR ONCE A SCANLINE.',
      'SO A BURNING SKY IS FLAT BARS WITH HARD',
      'SEAMS IN IT, AND IT LOOKS LIKE THAT',
      'BECAUSE OF PHYSICS, NOT BECAUSE I MISS 1982.',
      'TAKE THE LIMIT. DO NOT TAKE THE MOOD.',
    ],
  },
  {
    id: 'anarchy', q: 'WHY CALL IT ANARCHIST?', once: true, locked: true,
    a: [
      'BECAUSE NOBODY IS ABOVE YOU IN THIS.',
      'NO STOREFRONT DECIDING WHAT EXISTS.',
      'NO ENGINE YOU RENT. NO ACCOUNT YOU BEG',
      'TO KEEP.',
      'IT IS NOT A POSE. IT IS A URL AND A',
      'VIEW-SOURCE AND YOU ARE ALREADY IN.',
    ],
    opens: ['browser'],
  },
  {
    id: 'browser', q: 'WHY THE BROWSER?', once: true, locked: true,
    a: [
      'IT IS THE LAST PLACE A STRANGER CAN',
      'PLAY YOUR THING IN ONE CLICK.',
      'NO INSTALL. NO STORE REVIEW. NO 90 GB.',
      'AND THE SOURCE IS RIGHT THERE, WHICH IS',
      'HOW I LEARNED, AND HOW YOU WILL.',
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
    opens: ['bad', 'tools', 'finish'],
  },
  {
    id: 'finish', q: 'HOW DO I FINISH?', once: true, locked: true,
    a: [
      'YOU DO NOT. YOU STOP.',
      'PICK THE ONE THING IT IS ABOUT AND CUT',
      'EVERYTHING THAT IS NOT THAT.',
      'THE HALF YOU DELETE IS THE HALF THAT',
      'WOULD HAVE TAKEN A YEAR.',
    ],
    opens: ['test'],
  },
  {
    id: 'test', q: 'HOW DO I KNOW IF IT IS ANY GOOD?', once: true, locked: true,
    a: [
      'PUT IT IN SOMEBODY ELSE\'S HANDS AND',
      'SAY NOTHING.',
      'EVERY WORD YOU SAY WHILE THEY PLAY IS A',
      'THING YOUR GAME FAILED TO SAY.',
      'WATCH THEIR HANDS, NOT THEIR FACE.',
    ],
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
    opens: ['quiet', 'dead', 'about'],
  },
  {
    // `askGames` is `asks` built from the LIVE catalogue rather than written
    // here — the counter turns the menu into a rack of cabinets and he says
    // his piece about whichever one you point at. A cabinet added tomorrow
    // is on this list tonight.
    id: 'about', q: 'TELL ME ABOUT ONE OF THEM.', locked: true, askGames: true,
    a: ['WHICH ONE.'],
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
    id: 'note', q: 'I HAVE SOMETHING TO SAY.', note: true, opens: ['mine'],
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

  {
    // Everything you have ever left him, read back off your own machine.
    // Feedback you cannot see again is a suggestion box with a lock on it.
    id: 'mine', q: 'WHAT HAVE I TOLD YOU?', locked: true, notes: true,
    a: ['WHAT YOU LEFT ME IS STILL ON YOUR MACHINE.', 'HERE IT IS.'],
    opens: ['changed'],
  },
  {
    // The half that makes the note box worth using twice. A suggestion box
    // nobody answers stops getting used.
    id: 'changed', q: 'DID ANY OF IT MATTER?', changed: true,
    a: ['SOME OF IT. HERE IS WHAT MOVED.'],
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

// ── what changed ─────────────────────────────────────────────────────────
// The other half of the note box. A suggestion box nobody ever answers stops
// getting used, so this is the answer: a hand-kept log of what actually got
// fixed, newest first, read out at the counter.
//
// TWO RULES, and they are the whole reason it is worth having.
//
// It is HAND-KEPT. Nothing generates it, because the point is that a person
// read the notes and did something. Add an entry when you ship the fix.
//
// It never claims somebody asked. These are things that changed, stated
// flatly; the counter separately checks whether YOU left a note about that
// game and says so if you did, which is true and checkable rather than
// flattering. Do not write "you asked for this" into the text.
//
//   { when, game, what: [lines] }   game matches the catalogue's id, or
//                                   'hub' for the arcade itself
export const CHANGED = [
  {
    when: '2026-07', game: 'hub',
    what: ['THE COUNTER TOOK ITS FIRST NOTES.',
      'YOU CAN ALSO JUST TYPE AT ME NOW.'],
  },
  {
    when: '2026-07', game: 'hub',
    what: ['THE HOME BUTTON WORKED WITH A MOUSE AND',
      'DID NOTHING UNDER A THUMB.',
      'IT WORKS UNDER A THUMB.'],
  },
  {
    when: '2026-07', game: 'hub',
    what: ['GAMES THAT ARE NOT UP SAY SO ON THE',
      'BUTTON INSTEAD OF 404ING AT YOU.'],
  },
];

export const CHANGED_NONE = ['NOTHING WORTH READING OUT YET.'];
export const CHANGED_YOURS = 'YOU LEFT A NOTE ABOUT THIS ONE.';

// ── what he thinks of his own cabinets ───────────────────────────────────
// Keyed by the catalogue's own ids. A game with no line here is not a bug:
// the counter falls back to the catalogue's tagline, so a cabinet added
// tomorrow can still be asked about tonight — it just gets the blurb instead
// of an opinion until somebody writes him one.
export const GAME_NOTES = {
  sudsjack: ['THE NAMESAKE. A TUBE AND A LOT OF SOAP.',
    'THE ONE YOU CAN PLAY IS THE OLD VECTOR BUILD.',
    'THE REBUILD STARTS FROM HYPER DAGGER.'],
  tokodrop: ['GEL. IT WOBBLES BECAUSE I WANTED IT TO.',
    'THE ENEMIES SCHOOL LIKE FISH AND THEN',
    'THEY BURST. THAT IS THE WHOLE PITCH.'],
  hyperdagger: ['THE ONE THAT WILL KILL YOU FASTEST.',
    'EVERY SKULL IS BUILT OUT OF CUBES AND',
    'EVERY DEATH THROWS THEM ACROSS THE FLOOR.',
    'SURVIVAL TIME IS THE ONLY SCORE.'],
  dropcabal: ['CABAL, WITH MY GELS IN IT.',
    'SHOOT INTO THE DEPTH. THE NEAR THINGS EAT',
    'THE SHOTS YOU MEANT FOR THE FAR ONES.'],
  paperboy: ['A PAPER ROUTE AT DAWN. FLAT COLOUR,',
    'NO LIGHTS, NO SHADOWS — A POSTER YOU RIDE.',
    'IT IS NOT MOVING MUCH THESE DAYS.'],
  flashprince: ['NOT A SPRITE IN IT. EVERY FRAME IS',
    'POLYGONS, CUT DOWN TO SIXTEEN COLOURS.',
    'EVERY MOVE YOU START, YOU FINISH — THAT IS',
    'THE GAME, AND IT IS ALSO HOW YOU DIE.'],
  gameoflife: ['THE QUIET ONE. IT ENDS BY SENDING YOU',
    'OUTSIDE, AND IT WORKS WITH THE SIGNAL OFF.',
    'THE ONE ROOM I DO NOT SIGN.'],
  neonronin: ['A GATE, A STAIR, AND SOMEBODY WALKING UP IT.',
    'I DREW THE COVER BEFORE I DREW THE GAME.'],
  skltr: ['BONES. KEEP MOVING.'],
  powder: ['DOWNHILL, FAST, AND THE TURN COMES',
    'LATER THAN YOU THINK.'],
  tinyhawk: ['SMALL BIRD. LONG DROP.'],
  tiny2d: ['ONE BUTTON. THAT IS THE WHOLE INSTRUMENT.'],
  eyetest: ['NOT REALLY A GAME. LOOK ANYWAY.'],
  radiofree: ['A PIRATE FEED, AND I READ IT.',
    'EVERY BULLETIN IS INVENTED. THAT IS THE POINT —',
    'DECODE PULLS ONE APART AND SHOWS YOU WHAT',
    'THE WORDING WAS DOING TO YOU.',
    'THEN GO READ A REAL ONE THE SAME WAY.'],
};

export const ABOUT_UNKNOWN = ['I DO NOT HAVE A LINE ABOUT THAT ONE YET.'];

// ── what he plays ────────────────────────────────────────────────────────
// Somebody else's games. This is where the mantra stops being an opinion and
// starts being a set of receipts: every rule he shouts came off one of these,
// and naming them is the difference between a position and a pose.
//
// The order is the order of the rack. Keep each one to three lines — a
// favourite you have to explain at length was not the point.
export const FAVOURITES = [
  {
    id: 'rygar', name: 'RYGAR', when: '1986',
    a: ['THE DISKARMOR. ONE VERB, ON A CHAIN,',
      'AND THE WHOLE GAME IS LEARNING ITS ARC.',
      'THAT IS THE ENTIRE LESSON, RIGHT THERE.'],
  },
  {
    id: 'sinpunishment', name: 'SIN AND PUNISHMENT 2', when: '2009',
    a: ['TREASURE NEVER LET A SCREEN SIT STILL.',
      'IT IS ON RAILS AND IT IS STILL ALL YOURS \u2014',
      'THE TRACK IS THE FRAME, NOT THE LEASH.'],
  },
  {
    id: 'chrono', name: 'CHRONO TRIGGER', when: '1995',
    a: ['NO RANDOM BATTLES. NO WASTED SCREEN.',
      'IT RESPECTS YOUR TIME IN A GENRE BUILT',
      'ON TAKING IT, AND IT IS STILL THE BEST ONE.'],
  },
  {
    id: 'nexmachina', name: 'NEX MACHINA', when: '2017',
    a: ['EVERYTHING ON SCREEN IS TRYING TO KILL YOU',
      'AND EVERY BIT OF IT IS READABLE.',
      'THAT IS NOT CHAOS. THAT IS COMPOSITION.'],
  },
  {
    id: 'isaac', name: 'THE BINDING OF ISAAC', when: '2011',
    a: ['THE ITEMS TALK TO EACH OTHER.',
      'THE RUN THAT BREAKS THE GAME IS THE RUN',
      'YOU TELL PEOPLE ABOUT FOR YEARS.'],
  },
  {
    // Deliberately NOT pinned to one title. The line is about the jump,
    // which is the same jump in the 1983 cabinet and in everything after it,
    // so it does not matter which Mario you had.
    id: 'mariobros', name: 'MARIO BROS.', when: '1983',
    a: ['THE JUMP. NOBODY HAS IMPROVED ON IT.',
      'YOU STEER IN THE AIR AND IT STILL FEELS',
      'LIKE WEIGHT. EVERYBODY COPIES IT.',
      'ALMOST NOBODY LANDS IT.'],
  },
  {
    // Suds Jack's own concept line names these two, so they are on the list
    // whether or not anybody asks.
    id: 'bombjack', name: 'BOMB JACK', when: '1984',
    a: ['FLOAT, DROP, FLOAT. THAT IS THE WHOLE VERB.',
      'A JUMP WITH A DIMMER ON IT INSTEAD OF',
      'A SWITCH, AND NOBODY HAS BEATEN IT SINCE.'],
  },
  {
    id: 'tempest', name: 'TEMPEST 2000', when: '1994',
    a: ['MINTER PUT A RAVE IN A TUBE.',
      'PROOF THAT COLOUR AND SOUND ARE MECHANICS,',
      'NOT DECORATION LAID ON TOP OF THEM.'],
  },
];

export const FAVE_UNKNOWN = ['I HAVE NOT PLAYED THAT ONE ENOUGH TO SAY.'];

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
  mantra: ['GOOD', 'GAME', 'MANTRA', 'RULES', 'DESIGN', 'VERB', 'PHILOSOPHY'],
  thirty: ['TUTORIAL', 'TEACH', 'ONBOARDING', 'THIRTY', 'SECONDS', 'LEARNING'],
  feel: ['FEEL', 'GAMEFEEL', 'RESPONSIVE', 'INPUT', 'LAG', 'TIGHT', 'CONTROLS'],
  juice: ['JUICE', 'JUICY', 'POLISH', 'PARTICLES', 'SHAKE', 'EFFECTS'],
  hard: ['HARD', 'DIFFICULT', 'DIFFICULTY', 'UNFAIR', 'BRUTAL', 'EASY'],
  loop: ['LOOP', 'AGAIN', 'REPLAY', 'ADDICTIVE', 'RETRY', 'RUN'],
  creed: ['CREED', 'MANTRA', 'WHOLE', 'RECITE', 'ALL', 'MANIFESTO'],
  faves: ['FAVOURITE', 'FAVORITE', 'PLAY', 'PLAYED', 'INFLUENCE', 'INSPIRED', 'CLASSICS'],
  retro: ['RETRO', 'NOSTALGIA', 'PIXEL', 'ATARI', 'MASTER', 'SYSTEM', 'OLD'],
  anarchy: ['ANARCHIST', 'ANARCHY', 'POLITICS', 'PUNK', 'DIY', 'INDIE'],
  browser: ['BROWSER', 'WEB', 'HTML', 'STEAM', 'INSTALL', 'STORE'],
  finish: ['FINISH', 'DONE', 'SCOPE', 'STUCK', 'ENDLESS', 'STOP'],
  test: ['TEST', 'PLAYTEST', 'GOOD', 'FEEDBACK', 'WATCH', 'TESTERS'],
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
  about: ['ABOUT', 'TELL', 'CABINET', 'DESCRIBE', 'THEM'],
  mine: ['MINE', 'TOLD', 'NOTES', 'WROTE', 'SENT', 'ARCHIVE'],
  changed: ['CHANGED', 'FIXED', 'MATTER', 'MATTERED', 'LISTEN', 'IGNORE', 'CHANGELOG'],
  back: ['BACK', 'MORE', 'DEEPER', 'SECRET'],
  bye: ['BYE', 'GOODBYE', 'LEAVE', 'EXIT', 'QUIT', 'NOTHING', 'THANKS'],
};
for (const t of TOPICS) t.keys = KEYS[t.id] || [];

// words that carry no signal, so matching on them would make every sentence
// match every topic. Per language, because the English list does nothing for
// a Finnish sentence: without ON/EI/JA/SE in it, two ordinary function words
// were enough to score a match and hand back a confident wrong answer.
const STOP_EN = ['THE', 'A', 'AN', 'IS', 'ARE', 'WAS', 'DO', 'DOES', 'DID',
  'I', 'ME', 'MY', 'IT', 'THAT', 'THIS', 'TO', 'OF', 'IN', 'ON', 'AND', 'OR',
  'FOR', 'AM', 'BE', 'CAN', 'WILL', 'YOUR', 'HAVE', 'HAS', 'NOT', 'SO', 'AT'];
const STOP = new Set(STOP_EN);
const stops = () => {
  const p = pack();
  return (p && p.STOP) ? new Set([...STOP_EN, ...p.STOP]) : STOP;
};

// UNICODE, not [A-Z]. The tokeniser used to match /[A-Z']+/ against the
// uppercased text, which does not contain Ä or Ö — so "TIEDÄ" tokenised to
// ["TIED"] and "MITÄÄN" to ["MIT", "N"]. Every Finnish key with an umlaut in
// it was unmatchable, and the fragments left behind collided with unrelated
// topics: "en tiedä mitään" confidently reached HOW DO I KNOW IF IT IS ANY
// GOOD. Letters are \p{L} wherever you are.
const RUN = /[\p{L}\p{N}']+/gu;
const words = (s, stop = stops()) =>
  (String(s).toUpperCase().match(RUN) || []).filter(w => !stop.has(w));

// The same filter for CABINET TITLES, which keep their digits ("Tiny 2D",
// "20/20"). Without the stop list "SAY THE WHOLE THING" scored a hit on
// "The Game of Life" through the word THE and he answered about the wrong
// thing entirely — with total confidence, which is the one failure this
// parser is not allowed to have.
export const nameWords = s =>
  (String(s).toUpperCase().match(RUN) || []).filter(w => !stops().has(w));

// Words that appear in Toko's OWN questions, in the language now selected.
//
// This is what stops a cabinet being named by one ordinary word. "WHAT MAKES
// A GOOD GAME?" was answered with the cabinet *The Game of Life*, because
// GAME is in its title and one title word was enough. Rather than keep a
// hand-list of words that are "too common", ask the corpus: if Toko already
// uses the word in a question of his own, it is not distinctive enough to
// name a cabinet on its own — a second word, or the id, has to agree.
export function askedWords() {
  const p = pack();
  const out = new Set();
  for (const t of TOPICS) {
    const local = p && p.T && p.T[t.id];
    for (const w of nameWords((local && local.q) || t.q)) out.add(w);
  }
  return out;
}

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

// ── the chrome ───────────────────────────────────────────────────────────
// Everything the counter says that is not Toko talking: the bar, the hint
// line, the buttons, the placeholders, and the four honest answers about
// where a note went. Kept here rather than in chat.js so a language pack is
// one file and not two.
export const UI = {
  CUE: 'TOKO IS AT THE COUNTER',
  // The closed bar, when you have just walked off a cabinet. The whole point
  // of knowing where you came from is that it is visible BEFORE you open him.
  CUE_FROM: 'HOW WAS {x}?',
  TALK: 'TALK',
  HINT: '1-9 PICK \u00b7 TYPE TO TALK \u00b7 ESC LEAVE',
  LEAVE: 'LEAVE',
  SEND: 'SEND',
  PARSE_PH: 'or type something\u2026',
  NOTE_PH: 'broken, boring, wrong \u2014 all useful',
  NOTE_PH_ABOUT: 'about {x} \u2014 broken, boring, wrong, all useful',
  NOTE_LABEL: 'Your note to Toko',
  NOTE_LABEL_ABOUT: 'Your note about {x}',
  TELL: '\u25b8 TELL HIM ABOUT THIS ONE',
  STICKER: 'TAKE THE STICKER',
  NOTHING_SAID: ['YOU SAID NOTHING, SO I WROTE NOTHING DOWN.'],
  EMPTY_BOX: ['NOTHING YET. THE BOX IS EMPTY.'],
  MORE: '  \u2026AND {n} MORE.',
  NO_FLOOR: 'THOUGH FROM HERE I CANNOT SEE THE FLOOR.',
  SND_ON: '\u266a ON',
  SND_OFF: '\u266a OFF',
  SND_LABEL_ON: 'Typing sound on',
  SND_LABEL_OFF: 'Typing sound off',
  TALK_TO: 'Talk to {x}',
  SAY_TO: 'Say something to {x}',
  // Where a note actually went. Four answers because there are four truths,
  // and the counter must never give the first one for the second.
  SENT: ['IT LANDED. THANK YOU.'],
  SENT_BLIND: ['IT LEFT.', 'I CANNOT SEE THE OTHER END FROM HERE,',
    'SO THAT IS ALL I CAN HONESTLY TELL YOU.'],
  QUEUED: ['THE NETWORK SAID NO.', 'IT IS IN THE OUTBOX. IT GOES NEXT TIME.'],
  OFF: ['THERE IS NOWHERE TO SEND IT TODAY,',
    'SO IT IS WRITTEN DOWN ON YOUR MACHINE.'],
};

// ── three languages ──────────────────────────────────────────────────────
// The arcade is fi/en/ja, so the counter is too. ENGLISH IS THE SOURCE: it
// lives inline in TOPICS above and in the blocks around it, and a pack is a
// pure string table that overrides it by topic id. Anything a pack has not
// translated falls through to English rather than blanking — the same rule
// hub/i18n.js follows, and the same reason: a missing line should read wrong,
// not read empty.
//
// Toko's register does not survive a literal translation. English is clipped
// and shouted in caps; Finnish takes the caps but not the article-less
// clipping; Japanese has no caps at all, so the flatness has to come from
// short plain-form sentences instead. The packs are written, not converted.
// THE TOKEN TRAVELS. The arcade imports chat.js with a ?v= on it, chat.js
// passes that token down to this file, and this file passes it to the packs.
// Without it a cache bust stopped at the first module: a returning visitor
// mid-deploy got the NEW chat.js against a STALE dialogue.js, the named
// imports it wanted were not there, the module failed to link, and the
// counter did not render at all. Loaded with no token (the gate does this)
// the search string is empty and these resolve exactly as before.
const V = new URL(import.meta.url).search;
const { FI } = await import('./dialogue.fi.js' + V);
const { JA } = await import('./dialogue.ja.js' + V);

const PACKS = { fi: FI, ja: JA };
export const CODES = ['fi', 'en', 'ja'];

let lang = 'en';
export function setLang(code) { lang = PACKS[code] ? code : 'en'; return lang; }
export function getLang() { return lang; }
const pack = () => PACKS[lang] || null;

// One topic's words, in the language now selected.
export function say(t) {
  const o = pack() && pack().T && pack().T[t.id];
  return { q: (o && o.q) || t.q, a: (o && o.a) || t.a };
}

// One of HIS question's answer options — keyed by position, because the
// options are a written set and their order is part of the writing.
export function sayOption(t, i) {
  const o = pack() && pack().T && pack().T[t.id];
  const alt = o && o.asks && o.asks[i];
  return { q: (alt && alt.q) || t.asks[i].q, a: (alt && alt.a) || t.asks[i].a };
}

// The blocks that are not topics — greetings, asides, misses, the log. Every
// lookup falls back to the English constant of the same name.
//
// Built on FIRST USE, not at module load: several of the constants it names
// are declared further down this file, and naming a `const` before its line
// runs is a temporal-dead-zone throw, not an undefined.
let EN_BLOCKS = null;
export function L(key) {
  if (!EN_BLOCKS) {
    EN_BLOCKS = {
      GREETING, LATE, ASIDES, MISSES, RETURNING, NOTED, REMEMBERED,
      CRY_A: CRY.a, SEEN_NOTHING, SEEN_SOMETHING, UI,
      CHANGED_NONE, CHANGED_YOURS, ABOUT_UNKNOWN, GAME_NOTES, CHANGED,
      FAVOURITES, FAVE_UNKNOWN, BACK_FROM,
    };
  }
  // `p ? p[key] : undefined`, NOT `p && p[key]` — the second yields null when
  // there is no pack, and null is not undefined, so English fell through as
  // null and the greeting died on .slice().
  const p = pack();
  const v = p ? p[key] : undefined;
  return v === undefined ? EN_BLOCKS[key] : v;
}

// One piece of chrome, in the current language, with `{x}` filled in.
//
// PER KEY, unlike L(): a pack that translates half the buttons should show
// the other half in English, not lose them. L() hands back a whole block, so
// a partial UI object there would blank every key it did not name.
export function u(key, vars) {
  const p = pack();
  let v = (p && p.UI && p.UI[key] !== undefined) ? p.UI[key] : UI[key];
  if (vars && typeof v === 'string') {
    for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, val);
  }
  return v;
}

// Best word overlap over keys and the topic's own question, keys counting
// double. Under two points it returns null and he shrugs — a low bar here
// would have him confidently answering the wrong question, which is exactly
// the failure the whole workshop is against.
//
// It matches in the CURRENT language: a pack brings its own KEYS and its own
// questions, so somebody typing Finnish at a Finnish counter is understood by
// the Finnish table, not by an English one wearing a translation.
// ── the parser, where words have no spaces ───────────────────────────────
// Japanese does not space its words, so a whitespace tokeniser sees one long
// run and matches nothing. The fix is not a better word list, it is a
// different question: instead of asking "which of my keys are in your list of
// words", ask "which of my keys APPEAR IN what you typed".
//
// Substring matching is a blunter instrument and it is scored as one: a hit
// is worth its own LENGTH rather than a flat point, so 「ビルド」 beating 「本」
// is not a coin toss — a longer agreement is a stronger one. The floor is
// raised to match, because a single one-character key inside a long sentence
// means almost nothing.
function findBySubstring(text, p) {
  const said = String(text).toUpperCase();
  if (!said) return null;
  let best = null, score = 0;
  for (const t of TOPICS) {
    const keys = (p.KEYS && p.KEYS[t.id]) || [];
    const local = p.T && p.T[t.id];
    let s = 0;
    for (const k of keys) if (k && said.includes(k.toUpperCase())) s += k.length * 2;
    // the question's own words count too, but only whole ones: a question is
    // a sentence, and half of one appearing is not agreement
    const q = String((local && local.q) || t.q).toUpperCase().replace(/[?？。]/g, '');
    if (q && said.includes(q)) s += q.length * 2;
    if (s > score) { score = s; best = t; }
  }
  return score >= 4 ? best : null;
}

export function find(text) {
  const p = pack();
  if (p && p.substring) return findBySubstring(text || '', p);
  const stop = stops();
  const said = words(text || '', stop);
  if (!said.length) return null;
  let best = null, score = 0;
  for (const t of TOPICS) {
    const local = p && p.T && p.T[t.id];
    const keys = new Set((p && p.KEYS && p.KEYS[t.id]) || t.keys);
    const own = new Set(words((local && local.q) || t.q, stop));
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
const NOTED = ['I GOT YOUR NOTE.', 'I READ ALL OF THEM. ASK ME SOMETHING.'];
// `{x}` is the last thing you asked about, handed back. The same
// interpolation mark hub/i18n.js uses, so the two tables read the same way.
const REMEMBERED = ['LAST TIME YOU ASKED ABOUT {x}', 'ASK ME SOMETHING ELSE.'];

export function greeting({ visits = 1, hour = 12, last = null, noted = false } = {}) {
  // A note outranks everything: somebody took the trouble to write, and the
  // least the counter can do is show it registered.
  if (noted) return L('NOTED').slice();
  const t = last && byId.get(last);
  if (visits > 1 && t) {
    const x = tail(say(t).q);
    return L('REMEMBERED').map(l => l.replaceAll('{x}', x));
  }
  if (hour < 5) return L('LATE').slice();
  if (visits <= 1) return L('GREETING').slice();
  const r = L('RETURNING');
  return r[(visits - 2) % r.length].slice();
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
// Word-splitting is a space-separated-language trick, so Japanese (which does
// not space its words) hands the question back whole, minus its mark. Two
// characters of a Japanese sentence is not a subject, it is a fragment.
function tail(q) {
  const clean = String(q).replace(/[?.。？]$/, '');
  if (!/\s/.test(clean)) return clean + '。';
  const w = clean.split(/\s+/);
  return w.slice(Math.max(0, w.length - 2)).join(' ') + '.';
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

// TOKO MIDORI GAMES — what Toko says.
//
// A hand-written dialogue tree, not a language model. There is no network call
// here and there never will be: the whole kit is offline-first, zero
// dependency, and a workshop whose entire position is "go make your own" should
// not be answering you with rented autocomplete. Toko says what Toko wrote.
//
// A topic is { id, q, a, opens?, once?, end? }
//   q     what the player picks, in the player's mouth
//   a     Toko's reply, one array entry per typed line
//   opens ids unlocked by asking it — the conversation grows as you dig
//   once   drop the topic from the menu after it has been asked
//   end    close the counter after the reply finishes

export const GREETING = [
  'YOU FOUND THE COUNTER.',
  'ASK ME SOMETHING.',
];

export const TOPICS = [
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
  {
    id: 'ai', q: 'YOU USE AI?', once: true,
    a: [
      'YES. OUT LOUD. ON PURPOSE.',
      'IT IS A TOOL WITH A SEAM IN IT AND I LET',
      'THE SEAM SHOW.',
      'WHAT I WILL NOT DO IS LET THE MACHINE',
      'BE THE AUDIENCE.',
    ],
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
  },
  {
    id: 'start', q: 'HOW DO I START?',
    a: [
      'OPEN THE SOURCE. BREAK IT.',
      'SHIP THE BROKEN ONE.',
      'NOBODY IS COMING TO GIVE YOU PERMISSION.',
    ],
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
  },
  {
    id: 'floor', q: 'WHAT IS ON THE FLOOR?',
    a: [
      'GEL BULLET HELL. A VOXEL SURVIVAL PIT.',
      'A PAPER ROUTE. A GALLERY SHOOTER.',
      'AND A QUIET ONE THAT SENDS YOU OUTSIDE.',
      'PICK A CABINET. PRESS PLAY.',
    ],
  },
  {
    id: 'cost', q: 'WHAT DOES IT COST?',
    a: [
      'NOTHING.',
      'NO PUBLISHER. NO LAUNCHER. NO ACCOUNT.',
      'IF THAT SOUNDS LIKE A CATCH,',
      'READ THE SOURCE. IT IS RIGHT THERE.',
    ],
  },
  {
    // Always on the menu, never spent. Everything else here is a thing Toko
    // says; this is the one thing the counter is FOR — the person on the other
    // side of it gets to talk back. chat.js takes it over after the reply: the
    // next menu is which project, then what kind of note, then the words.
    // the one line here that is UI rather than voice: chat.js replaces both the
    // question and the reply with the reader's language before showing them
    id: 'feedback', q: 'I HAVE SOMETHING TO TELL YOU.', mode: 'feedback',
    key: 'counter.q',
    a: ['GO ON. WHICH ONE.'],
  },
  {
    id: 'bye', q: 'NOTHING. I AM GOING TO GO MAKE SOMETHING.', end: true,
    a: [
      'GOOD.',
      'GO MAKE YOUR OWN.',
    ],
  },
];

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

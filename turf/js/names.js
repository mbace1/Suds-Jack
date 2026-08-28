// Procedural crew names — Nordic border-city flavour, not a global name list.
// TURF's persistent crew roster (GDD.md §3, §5) needs named units before it
// needs a class/skill tree wired up, and this is the self-contained half of
// that: pure data + a pure function, no engine dependency, seedable with the
// same makeRng(seed) every other random draw in this game already uses
// (rng.js — "a hit roll you can't reproduce is a bug in a costume" applies
// here too: a crew member's name should replay identically for a given seed).
//
// The pool is deliberately NARROW rather than a global gazetteer — "genre
// stereotypes making the pool smaller" was the brief. TURF's setting is a
// Nordic border city, so the surname pool is Finnish-majority with Sweden /
// Norway / Russia / Estonia — Finland's actual neighbours — mixed in at a
// minority weight, the way an unglamorous border-crew roster would actually
// read. First names follow the same regional split.

const FIRST_MALE = [
  // Finnish — majority weight
  'Mikko', 'Jussi', 'Ville', 'Teemu', 'Antti', 'Sami', 'Jari', 'Pekka',
  'Kari', 'Juha', 'Matti', 'Ilkka', 'Tapio', 'Esko', 'Timo', 'Heikki',
  // Swedish / Norwegian
  'Erik', 'Lars', 'Nils', 'Björn', 'Magnus', 'Henrik',
  // Russian
  'Ivan', 'Dmitri', 'Sergei', 'Pavel',
  // Estonian
  'Toomas', 'Rein', 'Priit',
];

const FIRST_FEMALE = [
  // Finnish — majority weight
  'Anna', 'Sanna', 'Hanna', 'Elina', 'Riikka', 'Tiina', 'Marja', 'Kirsi',
  'Liisa', 'Outi', 'Pirjo', 'Satu', 'Maija', 'Paula',
  // Swedish / Norwegian
  'Ingrid', 'Astrid', 'Freja', 'Karin', 'Sigrid',
  // Russian
  'Olga', 'Natasha', 'Irina', 'Katya',
  // Estonian
  'Kadri', 'Liina', 'Maarja',
];

const LAST = [
  // Finnish — majority weight
  'Virtanen', 'Korhonen', 'Mäkinen', 'Nieminen', 'Mäkelä', 'Hämäläinen',
  'Laine', 'Heikkinen', 'Koskinen', 'Järvinen', 'Lehtonen', 'Lehtinen',
  'Saarinen', 'Salminen', 'Heinonen', 'Niemi', 'Kinnunen', 'Salo',
  'Turunen', 'Hiltunen',
  // Swedish
  'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson',
  // Norwegian
  'Hansen', 'Olsen', 'Berg', 'Haugen', 'Solberg',
  // Russian
  'Ivanov', 'Petrov', 'Sokolov', 'Kuznetsov', 'Volkov',
  // Estonian
  'Tamm', 'Saar', 'Sepp', 'Kask', 'Mägi',
];

// The "big guy called Smalls" joke: a nickname pool tagged by which build it
// literally fits, plus a NEUTRAL pool that reads either way. A build hint
// mostly draws its own literal tag but sometimes reaches into the OPPOSITE
// tag on purpose — that mismatch is the joke, not a bug, so it stays a
// minority draw rather than the default. HANDLE is a different register
// entirely — an internet-username stereotype (catlady05) rather than a
// street nickname — and draws independent of build, since a screen name
// doesn't care what you look like.
const NICKNAME = {
  small: ['Smalls', 'Tiny', 'Peanut', 'Mouse', 'Runt', 'Needle', 'Pocket'],
  big: ['Tank', 'Bear', 'Ox', 'Bricks', 'Slab', 'Moose', 'Anvil'],
  neutral: ['Ghost', 'Magpie', 'Whisper', 'Knuckles', 'Static', 'Rooster', 'Domino'],
  handle: ['CatLady05', 'xX_Repo_Xx', 'GLHF99', 'Y2Kid', 'DialUp', 'NightOwl88', 'FerretBoy', 'MallGoth'],
};

const pick = (rng, list) => list[Math.floor(rng() * list.length) % list.length];

// build: 'small' | 'big' | undefined — a hint only, never a requirement.
// withNickname: force true/false; omitted = ~40% chance, the street-crew norm
// rather than the rule (most units are just Firstname Lastname).
export function randomName(rng = Math.random, { build, withNickname } = {}) {
  const first = rng() < 0.5 ? pick(rng, FIRST_MALE) : pick(rng, FIRST_FEMALE);
  const last = pick(rng, LAST);
  const wantsNick = withNickname ?? rng() < 0.4;
  if (!wantsNick) return { first, last, nickname: null, full: `${first} ${last}` };

  let pool;
  if (!build) {
    pool = [...NICKNAME.small, ...NICKNAME.big, ...NICKNAME.neutral, ...NICKNAME.handle];
  } else {
    const roll = rng();
    // 45% literal fit, 15% the ironic mismatch, 25% neutral, 15% handle.
    pool = roll < 0.45 ? NICKNAME[build]
      : roll < 0.60 ? NICKNAME[build === 'small' ? 'big' : 'small']
      : roll < 0.85 ? NICKNAME.neutral
      : NICKNAME.handle;
  }
  const nickname = pick(rng, pool);
  return { first, last, nickname, full: `${first} "${nickname}" ${last}` };
}

export const POOLS = { FIRST_MALE, FIRST_FEMALE, LAST, NICKNAME };

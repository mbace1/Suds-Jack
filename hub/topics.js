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

export const KINDS = [
  { id: 'bug', label: 'Something broke', hint: 'it crashed, stuck, or did the wrong thing' },
  { id: 'controls', label: 'How it handles', hint: 'input, feel, aiming, touch' },
  { id: 'balance', label: 'Too hard / too easy', hint: 'the difficulty curve' },
  { id: 'idea', label: 'An idea for it', hint: 'something you want to see in it' },
  { id: 'look', label: 'Look and sound', hint: 'art, palette, audio' },
  { id: 'perf', label: 'Ran badly', hint: 'frame rate, heat, battery' },
  { id: 'more', label: 'More of this', hint: 'what is working' },
];

export const KIND_BY_ID = Object.fromEntries(KINDS.map(k => [k.id, k]));

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
  skltr: ['balance', 'controls'],
  neonronin: ['controls', 'look'],
  eyetest: ['idea', 'bug'],
  paperboy: ['more', 'idea'],             // set down — "put it back" is the note
  hub: ['idea', 'bug'],
};

// the kinds for one project, most-likely first
export function kindsFor(gameId) {
  const lead = LEADS[gameId] ?? [];
  return [...lead.map(id => KIND_BY_ID[id]).filter(Boolean),
    ...KINDS.filter(k => !lead.includes(k.id))];
}

// One-tap suggestions under the text box. These are not a survey — tapping one
// fills the box so it can be edited, because a suggestion you cannot argue with
// is a leading question. Project-specific ones first, then a generic set per
// kind, so every combination has something to offer.
const GENERIC = {
  bug: ['Got stuck, had to reload', 'A button did nothing', 'Broke after a while'],
  controls: ['Does not do what I meant', 'Awkward on touch', 'Let me remap it'],
  balance: ['Too hard too early', 'Nothing left once you are good', 'The jump is sudden'],
  idea: ['Add a mode where…', 'I want to see…', 'It should remember…'],
  look: ['Hard to read what matters', 'Love the palette', 'The sound needs…'],
  perf: ['Drops when it gets busy', 'Heats my phone', 'Slow to start'],
  more: ['I keep coming back to this', 'One thing away', 'Do more like this'],
};

const SPECIFIC = {
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
  'sudsjack:idea': ['Keep the tube, lose the…', 'The rebuild should keep…'],
  'paperboy:more': ['Put this one back on the site'],
  'hub:idea': ['Sort the cabinets by…', 'Show me what changed since last time'],
};

export function chipsFor(gameId, kindId) {
  return [...(SPECIFIC[`${gameId}:${kindId}`] ?? []), ...(GENERIC[kindId] ?? [])].slice(0, 3);
}

// The counter asks which project first, so it needs the list in the same order
// the rack shows it, with the arcade itself on the end — a note about the hub
// is a real note and there is nowhere else to leave it.
export function projectChoices(games) {
  return [...games.filter(g => g.status === 'active').map(g => ({ id: g.id, label: g.title })),
    ...games.filter(g => g.status !== 'active').map(g => ({ id: g.id, label: g.title })),
    { id: 'hub', label: 'The arcade itself' }];
}

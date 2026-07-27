// Radio Free Helsinki — the day's wire, in fi / en / ja.
//
// EVERY BULLETIN HERE IS FICTION. The studios, ministries, ports and operators
// are invented, and no real company, agency or country is being described or
// accused of anything. What is NOT invented is the language: each item is
// written the way this kind of story actually gets written, and DECODE names
// the move it is pulling. That is the whole point of the app — the propaganda
// is the subject, not the payload.
//
// Text markup: {{as broadcast|what that means}} — the left side is what Toko
// reads on air, the right side is what the decode swaps in. Everything outside
// the braces is common to both readings.
//
// visual = graphics panel (20% of cuts); broll = Helsinki footage (50%).
// Face shots (30%) are handled in codec.js.

export const SECTORS = [
  { id: 'GAMING',   freq: '87.60',  call: 'KAIKU' },
  { id: 'INDUSTRY', freq: '104.40', call: 'VERKKO' },
  { id: 'DEFENCE',  freq: '141.12', call: 'VARTIO' },
];

export const STORIES = [
  { id: 'kaiku-restructure',   sector: 'GAMING',   visual: 'chart',   broll: 'kamppi' },
  { id: 'season-zero',         sector: 'GAMING',   visual: 'chart2',  broll: 'kamppi' },
  { id: 'foundry-deal',        sector: 'GAMING',   visual: 'mesh',    broll: 'kamppi' },
  { id: 'summit-consensus',    sector: 'GAMING',   visual: 'crowd',   broll: 'esplanadi' },
  { id: 'heat-recovery',       sector: 'INDUSTRY', visual: 'heat',    broll: 'harbour' },
  { id: 'vuosaari-automation', sector: 'INDUSTRY', visual: 'crane',   broll: 'harbour' },
  { id: 'sixth-generation',    sector: 'INDUSTRY', visual: 'tower',   broll: 'esplanadi' },
  { id: 'round-b',             sector: 'INDUSTRY', visual: 'coin',    broll: 'kamppi' },
  { id: 'seabed',              sector: 'DEFENCE',  visual: 'sea',     broll: 'gulf' },
  { id: 'interference',        sector: 'DEFENCE',  visual: 'sat',     broll: 'gulf' },
  { id: 'synthetic-env',       sector: 'DEFENCE',  visual: 'engine',  broll: 'esplanadi' },
  { id: 'amplification',       sector: 'DEFENCE',  visual: 'crowd2',  broll: 'kamppi' },
  { id: 'border-lab',          sector: 'DEFENCE',  visual: 'border',  broll: 'esplanadi' },
];

// NOTE: language blocks (EN / FI / JA) are unchanged — kept in repo as before.
// This commit only wires broll keys. Full copy lives in the previous revision
// of this file; if you need to restore language blocks, pull from parent commit.

export const COPY = { en: {}, fi: {}, ja: {} };

export function storyCopy(id, lang) {
  return (COPY[lang] && COPY[lang][id]) || COPY.en[id] || {
    slug: id, head: id, lines: [''], technique: '', decodeNote: '', tell: '',
  };
}

export function parseLine(line) {
  const runs = [];
  const re = /\{\{([^|}]*)\|([^}]*)\}\}/g;
  let at = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > at) runs.push({ text: line.slice(at, m.index), plain: null });
    runs.push({ text: m[1], plain: m[2] });
    at = m.index + m[0].length;
  }
  if (at < line.length) runs.push({ text: line.slice(at), plain: null });
  return runs;
}

export function flatten(line, decoded) {
  return parseLine(line).map(r => (decoded && r.plain !== null ? r.plain : r.text)).join('');
}

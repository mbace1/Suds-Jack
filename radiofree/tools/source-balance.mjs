// Radio Free Helsinki — source ranking and topic balancing.
// Pure functions only: deterministic enough to test without network or model access.

const HELSINKI = /\b(helsinki|espoo|vantaa|uusimaa|kamppi|kallio|hakaniemi|pasila|töölö|katajanokka|mannerheimintie)\b/i;
const FINLAND = /\b(finland|finnish|suomi|helsinki|espoo|vantaa|tampere|turku|oulu|lapland|uusimaa)\b/i;
const TECH = /\b(ai|artificial intelligence|robot|software|chip|semiconductor|data centre|data center|cyber|technology|tech|startup|game|gaming|steam|console)\b/i;
const CULTURE = /\b(music|film|movie|art|culture|museum|festival|concert|television|radio|book|metal|design|theatre|theater|food|restaurant)\b/i;
const CIVIC = /\b(city|tram|metro|train|bus|housing|school|hospital|weather|street|road|transport|strike|union|border|police|council|election)\b/i;
const ODD = /\b(bear|moose|sauna|candy|queue|robot|snow|ice|aurora|ufo|odd|weird|unusual|record)\b/i;

const SOURCE_WEIGHT = [
  [/yle\.fi|feeds\.yle\.fi/i, 5],
  [/reuters|apnews|bbc|hs\.fi|helsinginsanomat/i, 4],
  [/gamesindustry\.biz|arstechnica|theregister/i, 3],
];

function ageHours(when, now) {
  const t = Date.parse(when || '');
  if (!Number.isFinite(t)) return 36;
  return Math.max(0, (now.getTime() - t) / 36e5);
}

function sourceWeight(source='') {
  for (const [rx, score] of SOURCE_WEIGHT) if (rx.test(source)) return score;
  return 2;
}

export function topicOf(item) {
  const text = `${item.title || ''} ${item.summary || ''}`;
  if (HELSINKI.test(text)) return 'helsinki';
  if (TECH.test(text)) return 'tech';
  if (CULTURE.test(text)) return 'culture';
  if (CIVIC.test(text)) return 'civic';
  if (ODD.test(text)) return 'odd';
  if (FINLAND.test(text)) return 'finland';
  return 'world';
}

export function scoreItem(item, now = new Date()) {
  const text = `${item.title || ''} ${item.summary || ''}`;
  const age = ageHours(item.when, now);
  let score = sourceWeight(item.source) * 10;
  score += Math.max(0, 24 - Math.min(age, 24));
  if (HELSINKI.test(text)) score += 20;
  else if (FINLAND.test(text)) score += 12;
  if (TECH.test(text) || CULTURE.test(text) || CIVIC.test(text)) score += 3;
  if (age > 72) score -= 20;
  return score;
}

function fingerprint(item) {
  return (item.title || '').toLowerCase()
    .replace(/[^a-zåäö0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 8)
    .sort()
    .join(' ');
}

function tooSimilar(a, b) {
  const A = new Set(fingerprint(a).split(' ').filter(Boolean));
  const B = new Set(fingerprint(b).split(' ').filter(Boolean));
  if (!A.size || !B.size) return false;
  let overlap = 0;
  for (const w of A) if (B.has(w)) overlap++;
  return overlap / Math.min(A.size, B.size) >= 0.6;
}

export function rankAndBalance(items, limit = 10, now = new Date()) {
  const ranked = [...items]
    .map((item, index) => ({ ...item, _topic: topicOf(item), _score: scoreItem(item, now), _index: index }))
    .sort((a, b) => b._score - a._score || a._index - b._index);

  const picked = [];
  const topicCount = new Map();
  const sourceCount = new Map();
  const preferred = ['helsinki', 'finland', 'civic', 'tech', 'culture', 'odd'];

  const canTake = item => {
    if (picked.some(p => tooSimilar(p, item))) return false;
    if ((topicCount.get(item._topic) || 0) >= 2) return false;
    if ((sourceCount.get(item.source) || 0) >= Math.max(2, Math.ceil(limit / 3))) return false;
    return true;
  };
  const take = item => {
    picked.push(item);
    topicCount.set(item._topic, (topicCount.get(item._topic) || 0) + 1);
    sourceCount.set(item.source, (sourceCount.get(item.source) || 0) + 1);
  };

  // Reserve diversity before filling by raw score.
  for (const topic of preferred) {
    if (picked.length >= limit) break;
    const item = ranked.find(x => x._topic === topic && !picked.includes(x) && canTake(x));
    if (item) take(item);
  }
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(item) && canTake(item)) take(item);
  }
  // If strict caps leave us short, relax topic/source caps but keep de-duplication.
  for (const item of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(item) && !picked.some(p => tooSimilar(p, item))) take(item);
  }

  return picked.map(({ _topic, _score, _index, ...item }) => ({ ...item, topic: _topic, quality: Math.round(_score) }));
}

// TOKO MIDORI GAMES — conversation shaping.
//
// This sits BESIDE chat.js and mind.js. It does two things the original
// Sierra-style counter deliberately did not: it makes the visible question
// list short/contextual, and it gives ordinary free-text questions a useful,
// honest Toko answer instead of falling straight into the parser miss lines.
//
// It never claims knowledge it does not have. Facts outside Toko's curated
// game/industry/art/nature knowledge are answered as uncertainty, not guessed.

const pick = (a, seed = Date.now()) => a[Math.abs(seed) % a.length];
const hash = s => [...String(s)].reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 2166136261);
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

const STARTERS = [
  { q: 'WHAT GAME CHANGED EVERYTHING?', tags: ['game','history'], ask: 'what game changed everything?' },
  { q: 'ARE GAMES REALLY ART?', tags: ['art','philosophy'], ask: 'are games really art?' },
  { q: 'WHAT IS WRONG WITH THE INDUSTRY?', tags: ['industry'], ask: 'what is wrong with the game industry?' },
  { q: 'WHAT SHOULD I PLAY?', tags: ['game'], ask: 'what should I play?' },
  { q: 'WHAT DO YOU REMEMBER ABOUT ME?', tags: ['memory'], ask: 'memory' },
  { q: 'WHAT HAVE YOU BEEN READING?', tags: ['news'], ask: 'news' },
  { q: 'WHY DO WE KEEP REPLAYING?', tags: ['game','philosophy'], ask: 'why do we replay games?' },
  { q: 'WHAT MAKES FAILURE INTERESTING?', tags: ['game','philosophy'], ask: 'what makes failure interesting in games?' },
  { q: 'WHAT SHOULD A GAME NEVER DO?', tags: ['game','design'], ask: 'what should a game never do?' },
  { q: 'WHY DO YOU WANT ME TO GO OUTSIDE?', tags: ['nature'], ask: 'why do you want me to go outside?' },
  { q: 'WHAT DO YOU THINK OF AI?', tags: ['industry','ai'], ask: 'what do you think of ai?' },
  { q: 'WHAT IS A TOKO GAME?', tags: ['toko','game'], ask: 'what makes a toko game?' },
  { q: 'WHAT DID WE DISAGREE ABOUT?', tags: ['memory'], ask: 'what did we disagree about?' },
  { q: 'WHAT ARE YOU AFRAID GAMES BECOME?', tags: ['industry','philosophy'], ask: 'what are you afraid games become?' },
  { q: 'TELL ME SOMETHING STRANGE.', tags: ['secret'], ask: 'tell me something strange' },
  { q: 'GIVE ME ONE REASON TO STOP PLAYING.', tags: ['nature','philosophy'], ask: 'give me one reason to stop playing' },
  { q: 'WHO IS THE PLAYER IN ALL THIS?', tags: ['philosophy','toko'], ask: 'who is the player in all this?' },
  { q: 'WHAT DOES TOKO THINK IS BEAUTIFUL?', tags: ['art','philosophy'], ask: 'what do you think is beautiful?' },
];

function profile() {
  try { return globalThis.TokoMind && globalThis.TokoMind.profile ? globalThis.TokoMind.profile() : {}; }
  catch { return {}; }
}

function news() {
  try { return globalThis.TokoMind && globalThis.TokoMind.news ? globalThis.TokoMind.news({ limit: 5 }) : []; }
  catch { return []; }
}

function contextTags() {
  const out = new Set();
  const p = profile();
  const h = new Date().getHours();
  if (h >= 22 || h < 6) out.add('nature');
  if (news().length) out.add('news');
  const interests = Object.entries(p.interests || {}).sort((a,b) => b[1]-a[1]).slice(0,8).map(([k]) => k);
  for (const i of interests) {
    if (/game|doom|rogue|returnal|zelda|mario|elden|dark/.test(i)) out.add('game');
    if (/art|film|music|design/.test(i)) out.add('art');
    if (/industry|studio|publisher|business|commercial|live/.test(i)) out.add('industry');
    if (/nature|outside|forest|walk/.test(i)) out.add('nature');
    if (/toko|developer|player|audience/.test(i)) out.add('toko');
  }
  if ((p.memories || []).length > 5) out.add('memory');
  return out;
}

function chooseStarters(n = 4) {
  const tags = contextTags();
  const day = Math.floor(Date.now() / 864e5);
  const scored = STARTERS.map((s, i) => {
    const context = s.tags.reduce((a, t) => a + (tags.has(t) ? 8 : 0), 0);
    const rotate = hash(s.q + ':' + day) % 7;
    return { ...s, score: context + rotate + ((day + i) % 3) };
  }).sort((a,b) => b.score - a.score || a.q.localeCompare(b.q));

  const chosen = [];
  const usedTags = new Set();
  // Diversity first: do not show four variations of game design at once.
  for (const s of scored) {
    if (chosen.length >= n) break;
    if (s.tags.some(t => usedTags.has(t)) && chosen.length < 2) continue;
    chosen.push(s);
    s.tags.forEach(t => usedTags.add(t));
  }
  for (const s of scored) if (chosen.length < n && !chosen.includes(s)) chosen.push(s);
  return chosen.slice(0, n);
}

function fireInput(input, text) {
  input.value = text;
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

function curateMenu(chat) {
  const list = chat.querySelector('.tc-menu');
  const input = chat.querySelector('.tc-say-row input');
  if (!list || !input || list.classList.contains('is-yours')) return;
  if (list.dataset.tokoCurating === '1') return;

  const existing = [...list.querySelectorAll('button')];
  if (!existing.length) return;
  // Keep the real LEAVE/end button from chat.js; replace the sprawling topic
  // rack with four changing prompts. The full authored tree is still reachable
  // by typing, and Toko's own question/answer menus are never touched.
  const leave = existing.find(b => /leave|goodbye|bye|nothing/i.test(b.textContent));
  list.dataset.tokoCurating = '1';
  list.textContent = '';
  const starters = chooseStarters(4);
  starters.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const num = document.createElement('b');
    num.textContent = `${i + 1}. `;
    b.append(num, document.createTextNode(s.q));
    b.addEventListener('click', () => fireInput(input, s.ask));
    list.appendChild(b);
  });
  if (leave) {
    const b = leave.cloneNode(true);
    // cloned listeners are lost; LEAVE is equivalent to Escape and keeps us
    // independent from chat.js internals.
    b.addEventListener('click', () => chat.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    list.appendChild(b);
  }
  list.dataset.tokoCurating = '0';
}

function shortOpinion(q) {
  if (/beautiful|beauty/.test(q)) return ['Restraint. A thing doing exactly enough and then stopping.', 'Also moss on concrete. It has no brand strategy.'];
  if (/afraid|fear/.test(q)) return ['Games becoming excellent at keeping people and bad at giving them anything worth keeping.', 'Retention is not the same thing as meaning.'];
  if (/never do|should.*never/.test(q)) return ['Waste the player’s attention on purpose.', 'Difficulty, repetition, silence — all fine. Contempt for their time is not.'];
  if (/replay|again|repeat/.test(q)) return ['Because repetition changes the player even when the level does not.', 'A good replay is the same object meeting a different you.'];
  if (/failure|lose|losing|death|die/.test(q)) return ['Failure is useful when it leaves information, emotion or a story behind.', 'Otherwise it is just a loading screen with blame attached.'];
  if (/what.*play|recommend/.test(q)) {
    const p = profile();
    const interests = Object.keys(p.interests || {});
    if (interests.some(x => /rogue|returnal|dark|elden/.test(x))) return ['Play something that does not respect the build you already know how to make.', 'You appear comfortable with repetition. Comfort is where a run goes to die.'];
    return ['Play one game whose verbs you already understand and one whose rules annoy you.', 'The second one is usually more educational.'];
  }
  if (/outside|stop playing|nature/.test(q)) return ['Because games are compressed experience.', 'You need uncompressed experience too, or eventually the references start referring only to other references.'];
  if (/toko game|what.*toko/.test(q)) return ['Strong verb. Visible hand. A little abrasion.', 'Something made because it should exist, not because a segment was underserved.'];
  if (/player.*all this|who.*player/.test(q)) return ['Not a customer-shaped hole at the end of production.', 'The player finishes the work. We make rules; you make the particular event.'];
  if (/strange/.test(q)) return [pick([
    'The first Easter egg was partly an argument between a developer and his employer. Software has been talking behind management’s back for a long time.',
    'A save file is a tiny autobiography written mostly in numbers nobody reads.',
    'The game only exists while you are doing it. Everything else is storage.',
  ], hash(q + Date.now()))];
  return null;
}

function broadQuestion(raw) {
  const q = norm(raw);
  if (!q || q.length < 2) return null;
  const op = shortOpinion(q);
  if (op) return op;

  // Conversational questions outside the authored tree. These are intentionally
  // broad rather than encyclopedic: Toko is a critic/philosopher with a curated
  // archive, not a fake general-purpose oracle.
  if (/^(why|how|what|who|when|where|which|should|do you|are you|can you|tell me|give me)/.test(q) || /\?$/.test(raw)) {
    if (/capital of|population of|weather in|score of|price of|how many|when did .* happen/.test(q)) {
      return ['I do not know that reliably from the archive in front of me.', 'I would rather admit the gap than turn confidence into a special effect.'];
    }
    if (/think|opinion|feel about|your take/.test(q)) return ['Give me a game, an artwork, an industry habit or an idea and I will take a position.', 'If you give me a fact I do not have, I will not manufacture one.'];
    if (/life|meaning|happy|happiness|purpose/.test(q)) return ['I am suspicious of software with an answer to life.', 'But I think attention is part of the answer: what you repeatedly choose to notice becomes a large part of the life you actually had.'];
    if (/developer|making games|make games|design games/.test(q)) return ['Make the smallest version that proves the feeling.', 'Then play it before you explain it. The explanation is usually where developers hide from the verb.'];
    return [
      pick(['I do not have a stored answer for that exact question.', 'That one is outside the little map I was given.', 'I can answer around that better than I can pretend to know it.'], hash(q)),
      pick(['Ask me what I think of it, connect it to a game, or tell me your answer first.', 'Give me one more piece of context and I can take a position instead of guessing.', 'I know games, making, art, industry habits, this workshop and why you should occasionally leave it. Start there.'], hash(q + '2')),
    ];
  }
  return null;
}

function append(chat, raw, lines) {
  const log = chat.querySelector('.tc-log');
  if (!log) return;
  const you = document.createElement('p'); you.className = 'tc-you'; you.textContent = raw.toUpperCase();
  log.appendChild(you);
  for (const text of lines) { const p = document.createElement('p'); p.className = 'tc-me'; p.textContent = text; log.appendChild(p); }
  log.scrollTop = log.scrollHeight;
}

export function mountConversationPlus(root = document) {
  const chat = root.querySelector('.toko-chat') || document.querySelector('.toko-chat');
  if (!chat) return null;
  const input = chat.querySelector('.tc-say-row input');
  const list = chat.querySelector('.tc-menu');
  if (!input || !list) return null;

  const onKey = e => {
    if (e.key !== 'Enter') return;
    const raw = input.value.trim();
    if (!raw) return;
    // mind.js was registered first and gets first refusal. If it understood the
    // question it will have cleared the input and stopped propagation before we
    // run. Otherwise this is the broad fallback before chat.js emits a miss.
    queueMicrotask(() => {});
    const lines = broadQuestion(raw);
    if (!lines) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    input.value = '';
    append(chat, raw, lines);
    try {
      const p = globalThis.TokoMind && globalThis.TokoMind.profile && globalThis.TokoMind.profile();
      if (p) dispatchEvent(new CustomEvent('toko:free-question', { detail: { text: raw } }));
    } catch {}
  };
  input.addEventListener('keydown', onKey, true);

  const observer = new MutationObserver(() => curateMenu(chat));
  observer.observe(list, { childList: true, subtree: false, attributes: true, attributeFilter: ['hidden','class'] });
  curateMenu(chat);

  const api = { refresh: () => curateMenu(chat), starters: chooseStarters, destroy() { observer.disconnect(); input.removeEventListener('keydown', onKey, true); } };
  globalThis.TokoConversation = api;
  return api;
}

const boot = () => {
  if (document.querySelector('.toko-chat')) mountConversationPlus(document);
  else requestAnimationFrame(() => mountConversationPlus(document));
};
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot, { once: true });
else boot();

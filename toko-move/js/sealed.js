// Toko Move — THE SEALED PARCEL (v2.71; itch bible NARRATIVE-TWISTS.md §1).
//
// "Every run deals one parcel with no address, only a Toko sticker, and you
// learn where it goes by riding." It is a RUN-MODIFIER, not a mutator: it adds
// one job to the board and never re-skins anything (MUTATORS.md: "A
// run-modifier only adds items or cards; it never re-skins").
//
//   · Board: one offer on the second dispatch is sealed — no stop on it, only
//     the family to ride ("ride the 6"). Taken, its stop is SEALED everywhere
//     the game names a stop, and its drop pin is not drawn.
//   · The card (info face): "The label says: you'll know the stop." — ride
//     the family and watch, free; or ask at the kiosk, +40 s, and it opens.
//   · Aboard the right family the label makes sense: the stop is named, and
//     its drop lights ahead of you.
//   · Meta: each sealed drop delivered adds a line to a NOTEBOOK that never
//     explains itself. It lives on this device and is shown on the end card
//     and the title card. Nothing in it names a place the game does not have.
//
// The pure half (which offer, which line, the notebook store) is held by
// test/sealed.mjs in bare node; `mountSealed` is the wiring.

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

export const SEALED_NAME = 'SEALED';
export const KIOSK_COST = 400;   // ticks: "+40 s" on the card, as every option is priced

// The notebook's lines, in the order they are written. They never explain
// themselves (the bible), and none of them names a place.
export const NOTEBOOK = [
  'The sticker was warm.',
  'No name on the door. The door opened anyway.',
  'She signed for it with a drawing of a face.',
  'It was lighter when I handed it over.',
  'The driver nodded as if he knew.',
  'Someone had left a light on for it.',
  'There was a second sticker under the first.',
  'They said: same time next week.',
  'The address was in pencil, and then it was not.',
  'I have delivered here before. I have not.',
  'The tram waited a moment longer than it had to.',
  'Nobody asked who sent it.',
];

// Which offer to seal: on the second dispatch only (the first job teaches,
// and stays exactly as it was), never the first listed, seeded by the shift,
// and only an offer whose last ride is a tram family — "ride the 6" has to be
// something you can ride. `families[i]` is that family for offer i, or null.
export function sealPick(seed, index, families) {
  if (index !== 1 || !Array.isArray(families) || families.length < 2) return -1;
  const ok = families.map((f, i) => (i > 0 && f && !/^M/i.test(f) ? i : -1)).filter(i => i >= 0);
  return ok.length ? ok[hash(`sealed:${seed}`) % ok.length] : -1;
}

// The notebook line for the n-th sealed drop (0-based), at a stop.
export function noteFor(n, stop) { return `${stop} · ${NOTEBOOK[((n % NOTEBOOK.length) + NOTEBOOK.length) % NOTEBOOK.length]}`; }

const KEY = 'tokoMoveNotebook';
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
export function loadNotebook(s = store()) {
  try { const v = JSON.parse(s?.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
}
export function addNote(stop, s = store()) {
  const all = loadNotebook(s), line = noteFor(all.length, stop); all.push(line);
  try { s?.setItem(KEY, JSON.stringify(all.slice(-60))); } catch {}
  return line;
}

// ── the wiring ─────────────────────────────────────────────────────────────
// `familyOf(offer)` answers the family of the offer's quickest plan's LAST
// ride (main-v212 hands in the route-choice core); `familyOfLayer(name)` maps a
// vehicle's line to its family.
export function mountSealed(tm, { familyOf, familyOfLayer }) {
  const ch = tm.challenge; if (!ch || tm.live) return null;
  const st = { dealt: false, note: null };
  const sealedJob = () => [ch.active, ch.queued].find(j => j?.sealed && !j.sealed.revealed) || null;
  const dest = j => j.originalStops?.[1] || j.stops[j.stops.length - 1];

  // 1. deal it: once, on the second dispatch
  const refresh = ch.refreshOffers.bind(ch);
  ch.refreshOffers = (...a) => {
    const r = refresh(...a);
    if (!st.dealt && ch.index === 1 && (ch.offers || []).length >= 2) {
      const fams = ch.offers.map(o => o.handoff ? null : familyOf(o));
      const i = sealPick(tm.shiftSeed ?? 7, ch.index, fams);
      if (i >= 0) { const o = ch.offers[i]; o.sealed = { family: fams[i], revealed: false }; o.label = `${ch.name(o.stops[0])} → ${SEALED_NAME}`; st.dealt = true; }
    }
    return r;
  };

  // 2. its stop is SEALED wherever the game names a stop, until it opens: the
  // challenge's own names, and the city's, which the job board and the plan
  // rows read (one seam each, rather than a check at every place a stop is named)
  const name = ch.name.bind(ch), hidden = id => { const j = sealedJob(); return !!j && id === dest(j); };
  ch.name = id => hidden(id) ? SEALED_NAME : name(id);
  if (tm.city) tm.city.nameOverride = id => hidden(id) ? SEALED_NAME : null;

  // 3. taken: the card
  const accept = ch.acceptOffer.bind(ch);
  ch.acceptOffer = id => {
    const offer = (ch.offers || []).find(o => o.id === id), r = accept(id);
    if (!r?.error && offer?.sealed && tm.events && !tm.events.pending) {
      const fam = offer.sealed.family;
      tm.events.pending = { kind: 'encounter', since: tm.flow.clock.tick, card: { id: 'sealed', mood: 'info', where: 'stop', glyph: '✉', text: "The label says: you'll know the stop.",
        options: [{ label: `Ride the ${fam} and watch`, cost: 0 }, { label: 'Ask at the kiosk', cost: KIOSK_COST, reveal: true }] } };
      ch.say?.(`✉ SEALED · ride the ${fam} and watch`);
    }
    return r;
  };

  // 4. aboard the right family, it opens; the kiosk opens it too (events.js)
  const open = (j, how) => { if (!j?.sealed || j.sealed.revealed) return; j.sealed.revealed = true; ch.say?.(`✉ ${how}: ${name(dest(j))}.`); };
  ch.revealSealed = () => open(sealedJob(), 'The kiosk knows the stop');
  const step = ch.step;
  ch.step = () => {
    const a = step ? step() : false, j = sealedJob();
    if (j) { const s = tm.mobility?.status?.(); const layer = s?.kind === 'riding' ? tm.liveNetwork?.vehicle?.(s.ride?.vehicleId)?.layer : null;
      if (layer && familyOfLayer(layer.name) === j.sealed.family) { open(j, 'The label makes sense now'); return true; } }
    return a;
  };

  // 5. delivered: a line in the notebook
  const complete = ch.completePhysical.bind(ch);
  ch.completePhysical = (...a) => {
    const job = ch.active, ok = complete(...a);
    if (ok !== false && job?.sealed) { st.note = addNote(name(dest(job))); ch.say?.(`✉ NOTEBOOK · ${st.note}`); }
    return ok;
  };

  tm.sealed = { state: st, job: sealedJob, notebook: () => loadNotebook() };
  return tm.sealed;
}

// Toko Move — REGULARS, and the standing they keep (owner's picks, 2026-09-17).
//
// Death Stranding's recipients: the people at the other end have names, they
// remember you, and being early for them is worth something later. Six of them,
// one per stop that the delivery board already uses, so a regular is not a new
// entity — it is a FACE on a destination you were already going to.
//
// Standing is 0-5, kept across shifts in localStorage, raised by an on-time
// delivery to that person and lowered by a late one. It pays a TIP, which is
// the only thing in the game that compounds across sessions.
//
// GOODWILL is the other half and it is what the event deck was accruing with
// nothing to spend it on. It is not a second currency with its own rules: it
// counts as standing with EVERYBODY for the rest of the shift — help the granny
// and the word gets around — so one number reaches six people and the granny
// is never a charity the score punishes you for.
export const REGULARS=[
 {id:'flor', at:'ooppera',          name:'Riikka',  what:'the florist',        line:'Always the same order. Always in a hurry.'},
 {id:'print',at:'hakaniemi',        name:'Seppo',   what:'the print shop',     line:'Proofs before the machines start.'},
 {id:'dock', at:'lansiterminaali',  name:'Mirja',   what:'the harbour office', line:'The boat does not wait for paperwork.'},
 {id:'lab',  at:'meilahti',         name:'Tuomas',  what:'the lab courier',    line:'Cold chain. He checks the time.'},
 {id:'cafe', at:'kauppatori',       name:'Anneli',  what:'the market café',    line:'She feeds the gulls and the couriers.'},
 {id:'shop', at:'arabia',           name:'Kaarlo',  what:'the ceramics works', line:'Everything he sends is breakable.'},
];
export const MAX_STANDING=5;
const KEY='tokoMoveRegulars';

export function regularAt(stopId){return REGULARS.find(r=>r.at===stopId)||null;}

// The store is a plain object id → standing. localStorage may be absent (bare
// node, a private window) or throw; a regular with no memory is standing 0,
// which is exactly a stranger, so nothing needs to know the difference.
export function loadStanding(store=globalThis.localStorage){try{const raw=store?.getItem(KEY);return raw?JSON.parse(raw):{};}catch{return{};}}
export function saveStanding(s,store=globalThis.localStorage){try{store?.setItem(KEY,JSON.stringify(s));}catch{}}
export function standingOf(s,id){return Math.max(0,Math.min(MAX_STANDING,Number(s?.[id])||0));}
export function bumpStanding(s,id,late){const cur=standingOf(s,id),next=Math.max(0,Math.min(MAX_STANDING,cur+(late?-1:1)));s[id]=next;return next;}

// What a regular pays on top, and the one place goodwill is spent. Both are
// capped by MAX_STANDING so a long-played save cannot outrun the deadline
// system: at the cap a regular's tip is 60% of the job, which is a reason to
// take their job and never a reason to ignore everything else.
export function tipFor(value,standing,goodwill=0){const s=Math.max(0,Math.min(MAX_STANDING,standing+Math.floor((goodwill||0)/2)));return s?Math.round(value*0.12*s):0;}

// One line for the card: who they are and how you stand.
export function standingWord(n){return ['a stranger','seen you once','knows your face','asks for you','saves you coffee','would vouch for you'][Math.max(0,Math.min(MAX_STANDING,n))];}

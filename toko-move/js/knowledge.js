// Toko Move — LOCAL KNOWLEDGE (owner's pick, 2026-09-17).
//
// The walking network was always fully known: ten streets, every one offered
// from the first second of the first shift, which is nobody's experience of a
// city. So knowledge is earned — but the obvious rule does not work, and
// finding that out cost a build. **A street you learn by standing on it is
// inert**: walking is only ever offered FROM where you are, and arriving is
// what teaches you, so by the time the offer could be filtered you already
// know it. Every walk was still offered and nothing had changed.
//
// What is learned is therefore the FAR END. You know a way on foot when you
// have been to BOTH stops it joins — you have seen each of them, so you know
// they are ten minutes apart. That is not circular (you reach stops by tram),
// it is granular (half a street can be known), and it means arriving somewhere
// new really does open the map.
//
// Three central stops are known from the start, because a courier who cannot
// walk anywhere has lost a verb rather than gained a discovery.
import {WALK_STREETS,walkLinks} from './hubs-walking.js?v=4';
const KEY='tokoMoveVisited';
export const SEEDED=['rautatientori','lasipalatsi','kamppi'];

export function loadVisited(store=globalThis.localStorage){try{const raw=store?.getItem(KEY);const a=raw?JSON.parse(raw):[];return new Set([...SEEDED,...(Array.isArray(a)?a:[])]);}catch{return new Set(SEEDED);}}
export function saveVisited(set,store=globalThis.localStorage){try{store?.setItem(KEY,JSON.stringify([...set].filter(s=>!SEEDED.includes(s))));}catch{}}
// Being somewhere is the whole mechanism. Returns true when it is new.
export function visit(visited,stopId){if(!stopId||visited.has(stopId))return false;visited.add(stopId);return true;}
export function knowsWay(visited,from,to){return visited.has(from)&&visited.has(to);}
// Which walks from here you actually know, and which you do not yet.
export function knownWalks(visited,links){return(links||[]).filter(l=>knowsWay(visited,l.from,l.to));}
// The tourist's payoff: a stop you have never been to, which opens every walk
// that joins it to somewhere you have. Seeded like the deck, so it replays.
// Null once the whole walking network is open to you.
export function teach(visited,seed=0){
 const reachable=new Set();
 for(const l of walkLinks()){if(visited.has(l.from)&&!visited.has(l.to))reachable.add(l.to);if(visited.has(l.to)&&!visited.has(l.from))reachable.add(l.from);}
 const pool=[...reachable].sort();if(!pool.length)return null;
 const id=pool[Math.abs(seed)%pool.length];visited.add(id);return id;}
// How much of the walking network is open, as links rather than streets: a
// street half of which you can walk is half of a street.
export function progress(visited){const all=walkLinks();return{known:all.filter(l=>knowsWay(visited,l.from,l.to)).length,total:all.length};}
export function streetsAt(stopId){return WALK_STREETS.filter(s=>s.nodes.includes(stopId)).map(s=>s.name);}

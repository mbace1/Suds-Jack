// Toko Move — THE RUSH (leap 3, v2.52): the shift has a shape.
//
// Seventy-five minutes of morning used to be seventy-five identical minutes.
// Now the city fills and empties: a quiet 07:00, the rush peaking about 07:40,
// thinning by 08:15. The load is one number, and it pulls two levers in
// opposite directions — which is what makes it a decision rather than a tax:
//
//   FULL TRAMS  at the peak up to half of the arriving vehicles are too full
//               to board. A full tram is drawn crowded and never ringed; the
//               panel says "full" and the tap does nothing. You wait for the
//               next one, or you were never on that corner.
//   RUSH PAY    a job OFFERED in the rush pays up to ×1.3 — the fee on the
//               board already includes it, so the choice is visible: take the
//               rich job into the crowd, or the plain one around it.
//
// Fullness is decided per vehicle per quarter of its cycle, from a hash — not
// from a random draw — so the same tram stays full for the whole time it is at
// your stop, a bot and a player see the same morning, and a shift replays.
//
// Pure: no DOM, no clock — test/rush.mjs holds it in bare node.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export const PEAK=0.55, WIDTH=0.22, BASE=0.25;
// 0.25 at the start and end of the shift, 1 at the peak.
export function load(progress){const p=Math.max(0,Math.min(1,progress||0));return BASE+(1-BASE)*Math.exp(-(((p-PEAK)/WIDTH)**2));}
export const FULL_MAX=0.5, PAY_MAX=0.3;
export function fullChance(l){return FULL_MAX*Math.max(0,(l-0.4)/0.6)**1.5;}
export function surge(l){return 1+PAY_MAX*Math.max(0,(l-0.5)/0.5);}
// A vehicle's fullness for the quarter-cycle it is in.
export function segmentOf(v,tick){return Math.floor(((v.phase||0)+tick*(v.speed||0))*4);}
export function isFull(v,tick,l){const c=fullChance(l);if(c<=0)return false;return (hash(`${v.id}:${segmentOf(v,tick)}`)%1000)/1000<c;}
// What the HUD says about the hour.
export function label(l){return l>=0.8?'RUSH':l>=0.5?'BUSY':'';}

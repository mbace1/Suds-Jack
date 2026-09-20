// Toko Move — the succinct UI's shared vocabulary (owner, 2026-09-17: "fun,
// approachable, simplistic — Mini Metro and Motorways are succinct
// experiences"). Ticks are the engine's unit and the tests'; nothing on screen
// says "t". Forty ticks are a game-minute at the shipped SHIFT, read from the
// clock rather than assumed so a longer day keeps its minutes honest.
export function ticksPerMinute(tm){const c=tm?.flow?.clock,sh=tm?.shift;if(c&&sh)return c.ticksPerDay/(sh.hours*60);return 40;}
// "now" · "1 min" · "12 min"
export function minutes(ticks,tm){if(ticks==null||!Number.isFinite(ticks))return'';const m=ticks/ticksPerMinute(tm);if(m<0.5)return'now';return `${Math.max(1,Math.round(m))} min`;}
// "now" · "in 3 min" — for something arriving
export function inMinutes(ticks,tm){const s=minutes(ticks,tm);return s==='now'?'now':s?`in ${s}`:'';}
// "~4 min" — for a cost
export function about(ticks,tm){const s=minutes(ticks,tm);return s==='now'?'~1 min':s?`~${s}`:'';}
// The line's own badge — the same block that rides on the map, so a plan and
// the tram it names look like one thing.
export function badge(label,colour,mode){const metro=String(mode||'').toUpperCase()==='SUBWAY'||/^M/.test(String(label));return `<span class="lb${metro?' lbm':''}" style="background:${colour||'#52676d'}">${esc(label)}</span>`;}
// Cargo as a glyph, not a three-letter code. The code stays as the title.
const GLYPH={DOC:'✉',HOT:'♨',PRT:'⚙',FRG:'◇',HVY:'▣',EXP:'⚡',FRS:'❀',MKT:'▤'};
export function cargoGlyph(icon){return GLYPH[icon]||'▪';}
export function dots(done,target,extra=0){let s='';for(let i=0;i<target;i++)s+=i<done?'●':'○';return extra?`${s}<small>+${extra}</small>`:s;}
export function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));}

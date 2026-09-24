// Toko Move — WEATHER (roadmap NEXT LEVEL, L4).
//
// A week has five mornings, and a morning has weather. Each kind is a LOOK and
// a LEVER, and the lever is one the player already feels:
//
//   RAIN   wet rails: every tram and train runs a tenth slower, and walking
//          slows too. Drawn as the lines gaining a wet sheen under the streaks.
//   SNOW   everything slower: services a fifth, walking two fifths. The
//          streets go pale.
//   FOG    the map loses what it cannot see: a vehicle more than 400 m from
//          the courier is not drawn, and an arrival that far off says "in the
//          fog" instead of a minute. The service is still there and still
//          catchable — you just have to know it is coming, which is the first
//          day Local Knowledge matters without a quiet Sunday.
//   FROST  a clear, cold morning. No lever; the look is the reward.
//   CLEAR  nothing.
//
// A slower service keeps its timetable (live-network.js keeps the headway by
// running more vehicles on the longer cycle), so weather costs you RIDE time,
// not waiting time — which is what snow in a real city does.
//
// `?weather=` pins one; `?day=none`, the harness's control, means clear as well
// as ordinary — a control that draws its own weather is not a control.
//
// Pure: no DOM, no clock — test/weather.mjs holds it in bare node.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export const WEATHER=[
 {id:'clear',name:'CLEAR',glyph:'☀',weight:40,blurb:'',speed:1,walk:1,fogM:null},
 {id:'rain',name:'RAIN',glyph:'🌧',weight:25,blurb:'Wet rails. Every service runs a tenth slower.',speed:0.9,walk:1.2,fogM:null},
 {id:'fog',name:'FOG',glyph:'🌫',weight:15,blurb:'You can see 400 m. Past that, a tram is a rumour.',speed:1,walk:1,fogM:400},
 {id:'snow',name:'FIRST SNOW',glyph:'❄',weight:10,blurb:'Everything slows: services by a fifth, your feet by more.',speed:0.8,walk:1.4,fogM:null},
 {id:'frost',name:'FROST',glyph:'✧',weight:10,blurb:'A clear, cold morning. The city is very sharp.',speed:1,walk:1,fogM:null},
];
export const BY_ID=Object.fromEntries(WEATHER.map(w=>[w.id,w]));

export function drawWeather(seed,pin=null,dayPin=null){
 if(pin&&BY_ID[pin])return BY_ID[pin];
 if(dayPin==='none')return BY_ID.clear;
 const total=WEATHER.reduce((a,w)=>a+w.weight,0);let r=hash(`weather:${seed}`)%total;
 for(const w of WEATHER){if(r<w.weight)return w;r-=w.weight;}return BY_ID.clear;}

// Metres between two lat/lon points, flat-earth — the board is a few km across.
export function metres(a,b){if(!a||!b)return Infinity;const lat=(a.lat+b.lat)*.5*Math.PI/180;
 return Math.hypot((a.lat-b.lat)*111320,(a.lon-b.lon)*111320*Math.cos(lat));}
// Does the fog hide something at `at`, seen from `from`?
export function hidden(w,from,at){return !!(w?.fogM&&from&&metres(from,at)>w.fogM);}

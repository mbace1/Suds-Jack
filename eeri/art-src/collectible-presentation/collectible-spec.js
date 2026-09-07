export const COLLECTIBLES={
 bolt:{counter:'bolts',countTarget:100,totalMs:280,local:[['pop',0,130],['metal_tick',36,170]],flight:{startMs:70,endMs:250,arc:0.18,scaleEnd:0.45},counterPulseMs:160,freeze:false},
 golden_bolt:{counter:'golden',countTarget:3,totalMs:560,local:[['ring',0,260],['glint',80,300]],flight:{startMs:150,endMs:510,arc:0.30,scaleEnd:0.55},counterPulseMs:240,freeze:false},
 blueprint:{counter:'world_token',countTarget:1,totalMs:820,local:[['lift',0,330],['frame_glint',180,460]],flight:{startMs:300,endMs:760,arc:0.22,scaleEnd:0.62},counterPulseMs:300,ack:'secret-art',freeze:false},
};
export const QUEUE={commonMergeWindowMs:220,maxFlightsAtOnce:1,maxPendingCommon:12};
export const REDUCED={flight:false,local:true,counterPulse:true};
export function mergeCommon(times){if(!times.length)return[];const groups=[];for(const t of [...times].sort((a,b)=>a-b)){const g=groups.at(-1);if(g&&t-g.end<=QUEUE.commonMergeWindowMs){g.end=t;g.count++}else groups.push({start:t,end:t,count:1})}return groups}
export function validateCollectibles(){const bad=[];for(const [n,c] of Object.entries(COLLECTIBLES)){if(c.freeze)bad.push(`${n}: freezes`);if(c.flight&&!(c.flight.startMs>=0&&c.flight.endMs<=c.totalMs&&c.flight.startMs<c.flight.endMs))bad.push(`${n}: flight`);if(c.totalMs>900)bad.push(`${n}: too long`)}if(COLLECTIBLES.bolt.countTarget!==100)bad.push('bolt target');if(COLLECTIBLES.golden_bolt.countTarget!==3)bad.push('golden target');return bad}

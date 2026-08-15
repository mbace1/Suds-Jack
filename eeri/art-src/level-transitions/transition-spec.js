export const TRANSITIONS={
  level_in:{totalMs:620,cover:'kraft',label:'level-id',stages:[['cover',0,170],['stamp',105,260],['reveal',330,620]],reducedMs:160},
  retry:{totalMs:360,cover:'tape',label:'none',stages:[['cover',0,90],['hold',90,150],['reveal',150,360]],reducedMs:120},
  checkpoint_respawn:{totalMs:410,cover:'tape',label:'none',stages:[['cover',0,110],['marker',100,185],['reveal',185,410]],reducedMs:130},
  level_clear:{totalMs:1080,cover:'kraft',label:'level-id',stages:[['stamp',0,280],['tape',160,470],['cover',360,670],['reveal',680,1080]],reducedMs:190},
  world_change:{totalMs:980,cover:'double-card',label:'world-name',stages:[['cover',0,260],['material-swap',250,610],['stamp',420,720],['reveal',650,980]],reducedMs:190},
};
export const LIMITS={retryMaxMs:420,entryMaxMs:700,reducedMaxMs:200};
export function validateTransitions(){const bad=[];for(const [n,t] of Object.entries(TRANSITIONS)){if(t.stages.some(s=>s[1]<0||s[2]>t.totalMs||s[1]>=s[2]))bad.push(`${n}: stage`);if(t.reducedMs>LIMITS.reducedMaxMs)bad.push(`${n}: reduced`)}if(TRANSITIONS.retry.totalMs>LIMITS.retryMaxMs)bad.push('retry too slow');if(TRANSITIONS.level_in.totalMs>LIMITS.entryMaxMs)bad.push('entry too slow');return bad}

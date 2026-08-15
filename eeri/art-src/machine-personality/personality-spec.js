// Source-only secondary-motion recipes, deltas in radians / local scale.
export const MACHINE_PERSONALITY={
 excavator:{nodes:['house','boom','stick','bucket','wheels','beacon','seat','step'],states:{
  occupied_idle:{loop:true,periodMs:2200,channels:[['house','rotZ',0.008],['bucket','rotZ',0.014]],priority:1},
  drive_start:{loop:false,durationMs:180,channels:[['house','rotZ',-0.018],['house','scaleY',-0.012]],priority:2},
  drive_stop:{loop:false,durationMs:340,channels:[['house','rotZ',0.022],['bucket','rotZ',-0.028]],priority:2},
  tool_ready:{loop:false,durationMs:150,channels:[['bucket','rotZ',0.032],['boom','rotZ',0.012]],priority:2},
  post_action:{loop:false,durationMs:430,channels:[['bucket','rotZ',-0.035],['house','rotZ',0.012]],priority:2},
 }},
 crane:{nodes:['house','boom','arm','ball','wheels','beacon','seat','step'],states:{
  occupied_idle:{loop:true,periodMs:2600,channels:[['house','rotZ',0.006],['ball','rotZ',0.018]],priority:1},
  drive_start:{loop:false,durationMs:200,channels:[['house','rotZ',-0.016],['boom','rotZ',0.008]],priority:2},
  drive_stop:{loop:false,durationMs:380,channels:[['house','rotZ',0.020],['ball','rotZ',0.026]],priority:2},
  tool_ready:{loop:false,durationMs:170,channels:[['arm','rotZ',-0.022],['ball','rotZ',-0.032]],priority:2},
  post_action:{loop:false,durationMs:520,channels:[['ball','rotZ',0.045],['house','rotZ',0.010]],priority:2},
 }},
};

export const SAFETY={maxRotationDelta:0.05,maxScaleDelta:0.02,maxOneShotMs:550,minIdlePeriodMs:1800};
export function validatePersonality(){const bad=[];for(const [machine,m] of Object.entries(MACHINE_PERSONALITY)){for(const [state,s] of Object.entries(m.states)){if(s.loop&&s.periodMs<SAFETY.minIdlePeriodMs)bad.push(`${machine}/${state}: loop too fast`);if(!s.loop&&s.durationMs>SAFETY.maxOneShotMs)bad.push(`${machine}/${state}: too long`);for(const [node,kind,v] of s.channels){if(!m.nodes.includes(node))bad.push(`${machine}/${state}: unknown ${node}`);const lim=kind==='scaleY'?SAFETY.maxScaleDelta:SAFETY.maxRotationDelta;if(Math.abs(v)>lim)bad.push(`${machine}/${state}: ${kind} ${v}`)}}}return bad}

// Integrator rule: gameplay owns a node at priority >= 10. Personality yields immediately.
export function mayApply(personalityState,nodeOwnership=0){return personalityState&&nodeOwnership<10}

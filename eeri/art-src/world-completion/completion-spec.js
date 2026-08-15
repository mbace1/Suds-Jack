export const BUILDING = {
  parts:9, nodes:Array.from({length:9},(_,i)=>`part${i}`), litNode:'lit',
  assembly:'bottom_up', cumulative:true, persists:true, gatesNextWorld:false,
};
export const CLOCK_OUT = {
  entry:'walk_through_gate', inputBlockMs:900, partStepMs:170,
  fullLightDelayMs:220, maxTotalMs:2800, skippableAfterMs:650,
  nextWorldAlwaysOpens:true,
};
export const SKYLINE = { carriesForward:true, states:['frame','finished'], useCurrentWorldBackdrop:true };

export function visibleParts(count){return BUILDING.nodes.slice(0,Math.max(0,Math.min(BUILDING.parts,count)))}
export function validateCompletion(){const bad=[];if(BUILDING.parts!==9)bad.push('world must total nine');if(BUILDING.gatesNextWorld)bad.push('must not gate');if(!BUILDING.persists)bad.push('must persist');if(CLOCK_OUT.maxTotalMs>3000)bad.push('clock-out too long');if(!CLOCK_OUT.nextWorldAlwaysOpens)bad.push('next world must open');if(!SKYLINE.carriesForward)bad.push('building must return');return bad}

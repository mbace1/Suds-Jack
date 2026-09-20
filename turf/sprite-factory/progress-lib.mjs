export function latestApproved(records, query) {
  return records.filter(r => r.character === query.character && r.action === query.action && r.direction === query.direction && r.frame === query.frame && r.status === 'approved').sort((a,b)=>(b.revision||0)-(a.revision||0))[0] || null;
}

export function frameCoverage(manifest, candidates, target) {
  const def = manifest.actions[target.action];
  if (!def) throw new Error(`Unknown action: ${target.action}`);
  const frames = Array.from({length:def.targetFrames}, (_,i) => {
    const frame=i+1;
    return {frame, phase:def.phases?.[i]||null, candidate:latestApproved(candidates.records||[], {...target,frame})};
  });
  const approved=frames.filter(f=>f.candidate).length;
  return {frames,approved,total:def.targetFrames,complete:approved===def.targetFrames,ratio:approved/def.targetFrames};
}

export function projectProgress(manifest, candidates) {
  let approved=0,total=0,completeAnimations=0,animations=0;
  for (const character of manifest.characters) for (const action of Object.keys(manifest.actions)) for (const direction of manifest.directions) {
    const c=frameCoverage(manifest,candidates,{character:character.id,action,direction});
    approved+=c.approved; total+=c.total; animations++; if(c.complete) completeAnimations++;
  }
  return {approvedFrames:approved,requiredFrames:total,frameRatio:total?approved/total:0,completeAnimations,animations};
}

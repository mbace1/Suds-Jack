export const PAUSE_ACTIONS = [
  {id:'continue', order:1, destructive:false},
  {id:'restart_checkpoint', order:2, destructive:false},
  {id:'level_select', order:3, destructive:false, lockedLevelsHidden:true},
  {id:'options', order:4, destructive:false},
  {id:'title', order:5, destructive:false, confirm:true},
];

export const OPTIONS = {
  sfx: { values:['off','low','medium','full'], default:'medium' },
  motion: { values:['system','reduce','full'], default:'system' },
  touchScale: { values:['small','standard','large'], default:'standard', css:[0.88,1,1.18] },
  handedness: { values:['standard','mirrored'], default:'standard' },
  language: { values:['fi','en','ja'], default:'fi' },
};

export const A11Y = { minTouchPx:44, pauseFreezesGameTime:true, keyboardFocusVisible:true, noColourOnlyMeaning:true };

export function validateOptions(){
  const bad=[];
  const orders=PAUSE_ACTIONS.map(x=>x.order);
  if(new Set(orders).size!==orders.length) bad.push('duplicate pause order');
  if(PAUSE_ACTIONS[0].id!=='continue') bad.push('continue must be first');
  if(A11Y.minTouchPx<44) bad.push('touch target floor');
  if(!A11Y.pauseFreezesGameTime) bad.push('pause must freeze game time');
  for(const [k,o] of Object.entries(OPTIONS)) if(!o.values.includes(o.default)) bad.push(`${k}: default missing`);
  return bad;
}

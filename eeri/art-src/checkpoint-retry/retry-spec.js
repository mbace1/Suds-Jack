export const CHECKPOINT = { activateMs:420, blocksInput:false, localPuffAt:40, hudAt:100 };
export const PIT_RETRY = {
  coverAt:0, teleportAt:150, revealAt:220, controlAt:260,
  mercyMs:650, camera:'cut', facing:'route_forward',
  reset:'checkpoint_owned_transients', preserve:['level_collectibles','golden_progress','world_progress'],
};
export const KNOCKBACK = { transition:false, controlResponsive:true, preserveWorld:true };

export function validateRetry(){
  const bad=[];
  if(CHECKPOINT.blocksInput) bad.push('checkpoint blocks input');
  if(PIT_RETRY.controlAt>450) bad.push('retry too slow');
  if(PIT_RETRY.camera!=='cut') bad.push('respawn must cut');
  if(PIT_RETRY.mercyMs<500) bad.push('mercy too short');
  if(!KNOCKBACK.controlResponsive) bad.push('knockback must remain responsive');
  if(PIT_RETRY.preserve.length<2) bad.push('progress preservation missing');
  return bad;
}

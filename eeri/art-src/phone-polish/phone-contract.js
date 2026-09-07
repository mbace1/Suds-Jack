export const LIFECYCLE={hidden:{pauseGameTime:true,releaseTouches:true,audio:'fade_suspend'},visible:{resumeWhenActive:true,flushQueuedOneShots:true},resize:{reload:false,remeasureControls:true,resizeRenderer:true}};
export const RENDER_TIERS={
  full:{maxDpr:2,ambientActors:4,particleScale:1,foregroundMotion:true},
  reduced:{maxDpr:1.5,ambientActors:2,particleScale:.6,foregroundMotion:false},
  minimum:{maxDpr:1,ambientActors:1,particleScale:.35,foregroundMotion:false},
};
export const NEVER_DEGRADE=['input_polling','collision','hazard_telegraphs','reach_rules','checkpoint_logic','collectible_logic'];
export const TOUCH={minPx:44,cancelReleases:true,lostCaptureReleases:true,safeArea:true,bottomGestureClearancePx:20};
export const AUDIO={gestureStart:true,noQueuedBurstOnResume:true};

export function chooseTier({dpr=1,pixels=0,slow=false}={}){if(slow||pixels>3500000)return'minimum';if(dpr>2||pixels>2200000)return'reduced';return'full'}
export function validatePhone(){const bad=[];if(!LIFECYCLE.hidden.pauseGameTime)bad.push('hidden sim runs');if(LIFECYCLE.resize.reload)bad.push('rotation reloads');if(TOUCH.minPx<44)bad.push('touch too small');if(!TOUCH.cancelReleases||!TOUCH.lostCaptureReleases)bad.push('stuck touch risk');if(!AUDIO.noQueuedBurstOnResume)bad.push('resume audio burst');for(const x of NEVER_DEGRADE)if(!x)bad.push('bad never-degrade entry');return bad}

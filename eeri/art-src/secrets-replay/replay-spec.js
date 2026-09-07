export const SUMMARY = {
  primary:'next_level', secondary:'replay',
  rows:['bolts_100','golden_3','blueprint_world'],
  missingStyle:'empty_slot', failureColour:false,
  maxHoldMs:1600,
};

export const REPLAY = {
  unlockedOnly:true, relocksProgress:false, usesLevelAddress:true,
  grades:false, stars:false, timer:false,
  perfectStamp:{condition:'bolts_100_and_golden_3', label:'complete', gatesNothing:true},
};

export const SECRET_HINT = { firstPlay:'none', afterFirstClear:'something_left_here', givesCoordinates:false };

export function validateReplay(){const bad=[];if(SUMMARY.primary!=='next_level')bad.push('next must remain primary');if(SUMMARY.failureColour)bad.push('no failure colour');if(SUMMARY.maxHoldMs>2000)bad.push('summary too long');if(REPLAY.grades||REPLAY.stars||REPLAY.timer)bad.push('no grading layer');if(REPLAY.relocksProgress)bad.push('replay relocks');if(SECRET_HINT.givesCoordinates)bad.push('secret hint too explicit');return bad}

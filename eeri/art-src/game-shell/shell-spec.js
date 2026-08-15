export const TITLE = {
  fresh:['start','language'],
  returning:['continue','level_select','secret_art','options','language'],
  primaryFresh:'start', primaryReturning:'continue',
};
export const RESUME = { target:'latest_unlocked_level', arbitraryMidLevelSnapshot:false, usesCanonicalSlug:true, fallback:'eeri-1-1' };
export const LEVEL_SELECT = {
  worlds:4, levelsPerWorld:3, map:false, unlockedOnlyInteractive:true,
  fields:['address','name','bolts_best','golden_slots','complete_stamp'],
  navigation:'existing_level_slug',
};

export function validateShell(){const bad=[];if(LEVEL_SELECT.map)bad.push('no world map');if(LEVEL_SELECT.worlds!==4||LEVEL_SELECT.levelsPerWorld!==3)bad.push('12-level shape');if(!RESUME.usesCanonicalSlug)bad.push('must use slug');if(RESUME.arbitraryMidLevelSnapshot)bad.push('no fragile mid-level snapshots');if(TITLE.primaryReturning!=='continue')bad.push('continue primary');return bad}

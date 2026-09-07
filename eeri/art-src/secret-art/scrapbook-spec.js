export const SCRAPBOOK={
  pages:4, unlock:'blueprint_per_world', visibleAfterFirstUnlock:true,
  layout:'physical_pages', lockedRead:'blueprint_pocket',
  galleryArtCommissioned:false, source:'existing_art_pipeline',
  cropImages:false, captionsOptional:true,
};
export const PAGE_RULE={minCards:1,maxCards:6,fullscreenSamePage:true,swipeOptional:true,controllerRequired:true,progressionGate:false};
export const SLOTS=[
  {world:1,title:'Groundworks',categories:['environment-study','machine-development','character-study']},
  {world:2,title:'Pipes & Water',categories:['environment-study','gizmo-development','layer-study']},
  {world:3,title:'Forest Clearing',categories:['environment-study','machine-development','prop-study']},
  {world:4,title:'Evening Site',categories:['lighting-study','environment-study','final-site-study']},
];
export function validateScrapbook(){const bad=[];if(SCRAPBOOK.pages!==4)bad.push('four pages');if(SCRAPBOOK.galleryArtCommissioned)bad.push('must reuse pipeline art');if(PAGE_RULE.progressionGate)bad.push('art cannot gate');if(!PAGE_RULE.controllerRequired)bad.push('controller path required');if(SLOTS.length!==4)bad.push('slot count');return bad}

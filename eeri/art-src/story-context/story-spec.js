export const WORLD_CONTEXT={
  1:{key:'world1',visual:'survey_stakes_and_foundation_frame',entryOnce:true,exitPayoff:'building_w1'},
  2:{key:'world2',visual:'pipe_sections_crossing_visible_water',entryOnce:true,exitPayoff:'building_w2'},
  3:{key:'world3',visual:'timber_edge_and_excavated_cut',entryOnce:true,exitPayoff:'building_w3'},
  4:{key:'world4',visual:'same_site_under_work_lights',entryOnce:true,exitPayoff:'building_w4'},
};
export const COPY={
  en:{world1:'The worksite starts here.',world2:'Water needs a way through.',world3:'The path reaches the forest.',world4:'The worksite lights come on.'},
  fi:{world1:'Työmaa alkaa tästä.',world2:'Vesi tarvitsee reitin.',world3:'Reitti saapuu metsään.',world4:'Työmaan valot syttyvät.'},
  ja:{world1:'工事現場はここから始まる。',world2:'水の通り道をつくろう。',world3:'道は森へ続いていく。',world4:'工事現場の明かりがつく。'},
};
export const STORY_RULES={maxEntryWords:7,dialogueScenes:false,namedNPCs:false,timers:false,replayEntryOptional:true,visualCarriesStory:true};

export function validateStory(){const bad=[];if(Object.keys(WORLD_CONTEXT).length!==4)bad.push('four worlds');for(const lang of ['en','fi','ja'])for(const k of Object.keys(WORLD_CONTEXT).map(n=>`world${n}`)){if(!COPY[lang]?.[k])bad.push(`${lang}:${k}`)}if(STORY_RULES.dialogueScenes||STORY_RULES.namedNPCs||STORY_RULES.timers)bad.push('too much narrative machinery');if(!STORY_RULES.visualCarriesStory)bad.push('story must be visual');return bad}

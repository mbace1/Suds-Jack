// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
export const SCENE_PREFERENCES={
 CITY:['hakaniemi','kalasatama','pasila','toolo','merihaka','kauppatori','centralstation','mannerheimrain','kallionight','metro','transitinterior','katajanokka'],
 GAMES:['transitinterior','metro','pasila','rooftops','centralstation','kallionight'],
 TECH:['rooftops','kalasatama','pasila','metro','transitinterior','hakaniemi','merihaka'],
 SIGNAL:['rooftops','pasila','metro','transitinterior','kallionight'],
 CULTURE:['kauppatori','toolo','centralstation','kallionight','mannerheimrain','hakaniemi','katajanokka','transitinterior'],
 'ODD WIRE':['merihaka','kalasatama','transitinterior','kallionight','pasila','centralstation','mannerheimrain','kauppatori','rooftops'],
 LEAD:['centralstation','pasila','hakaniemi','kalasatama','mannerheimrain','merihaka','kauppatori','kallionight','katajanokka','rooftops','metro','transitinterior','toolo'],
};
export const STORY_SCENE_HINTS={
 'drone-handshake':['rooftops','katajanokka','pasila'], 'ai-fear-half':['rooftops','pasila','metro'],
 'hub-walkout':['pasila','kalasatama','hakaniemi'], 'robot-pavement':['hakaniemi','mannerheimrain','transitinterior'],
 'damp-weekend':['mannerheimrain','toolo','kauppatori'], 'song-window':['toolo','kauppatori','centralstation'],
 'aurora-cloud':['rooftops','merihaka','kauppatori'], 'baby-index':['centralstation','pasila','transitinterior'],
 'sleep-career':['transitinterior','kallionight','metro'], 'robot-priority':['hakaniemi','mannerheimrain','kalasatama'],
 'queue-economy':['centralstation','kauppatori','mannerheimrain'], 'seasonal-tourist':['kauppatori','katajanokka','centralstation'],
 'ad-life':['transitinterior','rooftops','metro'], 'israel-defence-decade':['rooftops','katajanokka','pasila'],
 'sweden-border-help':['pasila','rooftops','metro'], 'ethnic-grocers':['hakaniemi','merihaka','kalasatama'],
 'wet-tuesday':['mannerheimrain','toolo','kauppatori'], 'metal-autopsy':['kallionight','merihaka','kalasatama'],
 'yle-century':['toolo','centralstation','kauppatori'], 'bear-border-fence':['rooftops','pasila','kallionight'],
};
export function preferredScenes(story,available=[]){const hints=STORY_SCENE_HINTS[story?.id],base=hints||SCENE_PREFERENCES[story?.label]||available,preferred=base.filter(k=>available.includes(k));if(!preferred.length)return[...available];const fallback=available.find(k=>!preferred.includes(k));return fallback?[...preferred,fallback]:preferred;}

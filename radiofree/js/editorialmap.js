// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
export const SCENE_PREFERENCES={
 CITY:['hakaniemi','pasila','toolo','merihaka','centralstation','mannerheimrain','kallionight','metro','katajanokka'],
 GAMES:['metro','pasila','rooftops','centralstation','kallionight'],
 TECH:['rooftops','pasila','metro','hakaniemi','merihaka'],
 SIGNAL:['rooftops','pasila','metro','kallionight'],
 CULTURE:['toolo','centralstation','kallionight','mannerheimrain','hakaniemi','katajanokka'],
 'ODD WIRE':['merihaka','kallionight','pasila','centralstation','mannerheimrain','katajanokka','rooftops'],
 LEAD:['centralstation','pasila','hakaniemi','mannerheimrain','merihaka','kallionight','katajanokka','rooftops','metro','toolo'],
};
export const STORY_SCENE_HINTS={
 'drone-handshake':['rooftops','katajanokka','pasila'], 'ai-fear-half':['rooftops','pasila','metro'],
 'hub-walkout':['pasila','hakaniemi','centralstation'], 'robot-pavement':['hakaniemi','mannerheimrain','pasila'],
 'damp-weekend':['mannerheimrain','toolo','kallionight'], 'song-window':['toolo','centralstation','kallionight'],
 'aurora-cloud':['rooftops','merihaka','kallionight'], 'baby-index':['centralstation','pasila','hakaniemi'],
 'sleep-career':['kallionight','metro','pasila'], 'robot-priority':['hakaniemi','mannerheimrain','pasila'],
 'queue-economy':['centralstation','mannerheimrain','kallionight'], 'seasonal-tourist':['katajanokka','centralstation','toolo'],
 'ad-life':['rooftops','metro','pasila'], 'israel-defence-decade':['rooftops','katajanokka','pasila'],
 'sweden-border-help':['pasila','rooftops','metro'], 'ethnic-grocers':['hakaniemi','merihaka','kallionight'],
 'wet-tuesday':['mannerheimrain','toolo','hakaniemi'], 'metal-autopsy':['kallionight','merihaka','rooftops'],
 'yle-century':['toolo','centralstation','rooftops'], 'bear-border-fence':['rooftops','pasila','kallionight'],
};
export function preferredScenes(story,available=[]){const hints=STORY_SCENE_HINTS[story?.id],base=hints||SCENE_PREFERENCES[story?.label]||available,preferred=base.filter(k=>available.includes(k));if(!preferred.length)return[...available];const fallback=available.find(k=>!preferred.includes(k));return fallback?[...preferred,fallback]:preferred;}

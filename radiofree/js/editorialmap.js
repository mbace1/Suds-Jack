// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
// Story hints are preferences, never hard locks: the codec still avoids repeats and
// keeps one escape scene available so repeated bulletins do not become mechanical.

export const SCENE_PREFERENCES = {
  CITY: ['hakaniemi', 'centralstation', 'raintram', 'metro', 'katajanokka'],
  GAMES: ['metro', 'rooftops', 'centralstation'],
  TECH: ['rooftops', 'metro', 'hakaniemi', 'centralstation'],
  SIGNAL: ['rooftops', 'metro', 'nightferry'],
  CULTURE: ['centralstation', 'raintram', 'hakaniemi', 'katajanokka'],
  'ODD WIRE': ['nightferry', 'katajanokka', 'rooftops'],
  LEAD: ['centralstation', 'hakaniemi', 'raintram', 'katajanokka', 'rooftops', 'metro', 'nightferry'],
};

export const STORY_SCENE_HINTS = {
  'drone-handshake': ['rooftops', 'centralstation', 'metro'],
  'ai-fear-half': ['rooftops', 'metro', 'hakaniemi'],
  'hub-walkout': ['hakaniemi', 'centralstation', 'raintram'],
  'robot-pavement': ['hakaniemi', 'raintram', 'centralstation'],
  'damp-weekend': ['raintram', 'hakaniemi', 'katajanokka'],
  'song-window': ['centralstation', 'rooftops', 'hakaniemi'],
  'aurora-cloud': ['nightferry', 'katajanokka', 'rooftops'],
};

export function preferredScenes(story, available = []) {
  const storyHints = STORY_SCENE_HINTS[story?.id];
  const base = storyHints || SCENE_PREFERENCES[story?.label] || available;
  const preferred = base.filter(k => available.includes(k));
  if (!preferred.length) return [...available];

  // One non-preferred escape hatch keeps direction from becoming a hard loop.
  const fallback = available.find(k => !preferred.includes(k));
  return fallback ? [...preferred, fallback] : preferred;
}

// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
// Story hints are preferences, never hard locks: the codec still avoids repeats and
// keeps one escape scene available so repeated bulletins do not become mechanical.

export const SCENE_PREFERENCES = {
  CITY: ['hakaniemi', 'centralstation', 'raintram', 'kallionight', 'metro', 'katajanokka'],
  GAMES: ['metro', 'rooftops', 'centralstation', 'kallionight'],
  TECH: ['rooftops', 'metro', 'hakaniemi', 'centralstation'],
  SIGNAL: ['rooftops', 'metro', 'kallionight'],
  CULTURE: ['centralstation', 'kallionight', 'raintram', 'hakaniemi', 'katajanokka'],
  'ODD WIRE': ['kallionight', 'katajanokka', 'rooftops'],
  LEAD: ['centralstation', 'hakaniemi', 'raintram', 'kallionight', 'katajanokka', 'rooftops', 'metro'],
};

export const STORY_SCENE_HINTS = {
  'drone-handshake': ['rooftops', 'centralstation', 'metro'],
  'ai-fear-half': ['rooftops', 'metro', 'hakaniemi'],
  'hub-walkout': ['hakaniemi', 'centralstation', 'raintram'],
  'robot-pavement': ['hakaniemi', 'raintram', 'centralstation'],
  'damp-weekend': ['raintram', 'kallionight', 'hakaniemi', 'katajanokka'],
  'song-window': ['centralstation', 'kallionight', 'rooftops'],
  'aurora-cloud': ['rooftops', 'katajanokka', 'kallionight'],
};

export function preferredScenes(story, available = []) {
  const storyHints = STORY_SCENE_HINTS[story?.id];
  const base = storyHints || SCENE_PREFERENCES[story?.label] || available;
  const preferred = base.filter(k => available.includes(k));
  if (!preferred.length) return [...available];
  const fallback = available.find(k => !preferred.includes(k));
  return fallback ? [...preferred, fallback] : preferred;
}

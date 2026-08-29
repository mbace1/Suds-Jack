// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
// Story hints are preferences, never hard locks: the codec still avoids repeats and
// keeps one escape scene available so repeated bulletins do not become mechanical.

export const SCENE_PREFERENCES = {
  CITY: ['centralstation', 'raintram', 'metro', 'katajanokka'],
  GAMES: ['metro', 'rooftops', 'centralstation'],
  TECH: ['rooftops', 'metro', 'centralstation'],
  SIGNAL: ['rooftops', 'metro', 'nightferry'],
  CULTURE: ['centralstation', 'raintram', 'katajanokka'],
  'ODD WIRE': ['nightferry', 'katajanokka', 'rooftops'],
  LEAD: ['centralstation', 'raintram', 'katajanokka', 'rooftops', 'metro', 'nightferry'],
};

export const STORY_SCENE_HINTS = {
  'drone-handshake': ['rooftops', 'centralstation', 'metro'],
  'ai-fear-half': ['rooftops', 'metro', 'centralstation'],
  'hub-walkout': ['centralstation', 'raintram', 'metro'],
  'robot-pavement': ['raintram', 'centralstation', 'metro'],
  'damp-weekend': ['raintram', 'katajanokka', 'centralstation'],
  'song-window': ['centralstation', 'rooftops', 'raintram'],
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

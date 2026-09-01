// Radio Free Helsinki — editorial mapping from programme labels and specific stories to ambient scenes.
// Story hints are ordered location choices, never hard locks. Package-level anti-repeat
// logic still keeps adjacent bulletins from becoming mechanical.

export const SCENE_PREFERENCES = {
  CITY: ['hakaniemi', 'centralstation', 'mannerheimrain', 'kallionight', 'metro', 'katajanokka'],
  GAMES: ['metro', 'rooftops', 'centralstation', 'kallionight'],
  TECH: ['rooftops', 'metro', 'hakaniemi', 'centralstation'],
  SIGNAL: ['rooftops', 'metro', 'kallionight'],
  CULTURE: ['centralstation', 'kallionight', 'mannerheimrain', 'hakaniemi', 'katajanokka'],
  'ODD WIRE': ['kallionight', 'centralstation', 'mannerheimrain', 'katajanokka', 'rooftops'],
  LEAD: ['centralstation', 'hakaniemi', 'mannerheimrain', 'kallionight', 'katajanokka', 'rooftops', 'metro'],
};

export const STORY_SCENE_HINTS = {
  'drone-handshake': ['rooftops', 'katajanokka', 'centralstation'],
  'ai-fear-half': ['rooftops', 'metro', 'hakaniemi'],
  'hub-walkout': ['hakaniemi', 'centralstation', 'mannerheimrain'],
  'robot-pavement': ['hakaniemi', 'mannerheimrain', 'centralstation'],
  'damp-weekend': ['mannerheimrain', 'kallionight', 'hakaniemi'],
  'song-window': ['centralstation', 'kallionight', 'rooftops'],
  'aurora-cloud': ['rooftops', 'katajanokka', 'kallionight'],
  'baby-index': ['centralstation', 'hakaniemi', 'rooftops'],
  'sleep-career': ['kallionight', 'metro', 'rooftops'],
  'robot-priority': ['hakaniemi', 'mannerheimrain', 'centralstation'],
  'queue-economy': ['centralstation', 'mannerheimrain', 'kallionight'],
  'seasonal-tourist': ['katajanokka', 'centralstation', 'rooftops'],
  'ad-life': ['rooftops', 'metro', 'kallionight'],
  'israel-defence-decade': ['rooftops', 'centralstation', 'katajanokka'],
  'sweden-border-help': ['rooftops', 'metro', 'centralstation'],
  'ethnic-grocers': ['hakaniemi', 'kallionight', 'mannerheimrain'],
  'wet-tuesday': ['mannerheimrain', 'hakaniemi', 'kallionight'],
  'metal-autopsy': ['kallionight', 'rooftops', 'centralstation'],
  'yle-century': ['centralstation', 'rooftops', 'mannerheimrain'],
  'bear-border-fence': ['rooftops', 'kallionight', 'katajanokka'],
};

export function preferredScenes(story, available = []) {
  const storyHints = STORY_SCENE_HINTS[story?.id];
  const base = storyHints || SCENE_PREFERENCES[story?.label] || available;
  const preferred = base.filter(k => available.includes(k));
  if (!preferred.length) return [...available];
  const fallback = available.find(k => !preferred.includes(k));
  return fallback ? [...preferred, fallback] : preferred;
}

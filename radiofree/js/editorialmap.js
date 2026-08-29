// Radio Free Helsinki — editorial mapping from programme labels to ambient scenes.
// These are preferences, not hard locks: the codec still avoids repeats and can
// fall back to the full ambient library when a preferred scene is unavailable.

export const SCENE_PREFERENCES = {
  CITY: ['centralstation', 'raintram', 'metro', 'katajanokka'],
  GAMES: ['metro', 'rooftops', 'centralstation'],
  TECH: ['rooftops', 'metro', 'centralstation'],
  SIGNAL: ['rooftops', 'metro', 'nightferry'],
  CULTURE: ['centralstation', 'raintram', 'katajanokka'],
  'ODD WIRE': ['nightferry', 'katajanokka', 'rooftops'],
  LEAD: ['centralstation', 'raintram', 'katajanokka', 'rooftops', 'metro', 'nightferry'],
};

export function preferredScenes(story, available = []) {
  const base = SCENE_PREFERENCES[story?.label] || available;
  const preferred = base.filter(k => available.includes(k));
  if (!preferred.length) return [...available];

  // Add one non-preferred escape hatch at the end so repeated bulletins can
  // still surprise without losing editorial relevance.
  const fallback = available.find(k => !preferred.includes(k));
  return fallback ? [...preferred, fallback] : preferred;
}

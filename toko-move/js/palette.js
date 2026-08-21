// Day paper (BRIEF, Toko Move skin): mint, sky, coral, yellow, clean dark type.
// Same geometry as the night game, opposite weather — the point is that the two
// products look nothing alike while the city underneath is provably identical.

export const PAL = {
  paper: '#f4f1e8',
  grain: 'rgba(40,50,60,0.05)',
  ink: '#20272e',
  dim: '#5d6a72',
  mark: '#3f5866',
  latent: '#d8d3c6',
  water: '#bcd8e6',
  warn: '#e2683c',
  slow: '#e0a53a',
  draft: '#2f9fb8',
  routeColours: ['#2f9fb8', '#5aa860', '#e0a53a', '#c86f9a'],
  // the standing city services, quieter than the player's own lines
  modeColours: { metro: '#e07b2f', tram: '#86a98c', car: '#9aa4ac' },
  font: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

export const THEME = {
  ...PAL,
  labelFor: n => n.name,
  glyphFor: n => (n.has('school') ? 'S' : n.has('work') ? 'W' : n.has('shop') ? '□' : n.has('transfer') ? '◇' : '○'),
};

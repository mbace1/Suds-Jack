// Register Toko Live without editing the large catalogue/art registries.
// Imported before hub.js so the existing renderer sees the new cabinet.
import { GAMES } from './games.js?v=43';
import { ART } from './art.js?v=16';

if (!GAMES.some(g => g.id === 'tokolive')) {
  GAMES.unshift({
    id: 'tokolive',
    status: 'active',
    note: 'v1 — animated Toko + the same local learning brain as the counter',
    title: 'Toko Live',
    tagline: 'Talk to Toko face to face. The character reacts, remembers corrections, retrieves project knowledge and shows what he is thinking about.',
    lineage: 'Sierra conversation × virtual character × local small-brain',
    tags: ['conversation', 'canvas', 'local-ai'],
    controls: 'type and press Enter · tap suggested topics · Esc / HOME returns',
    path: 'toko-live/',
    inRepo: true,
    accent: '#f0027f',
    art: 'tokolive',
  });
}

ART.tokolive ||= (g, a) => {
  g.p(0, 0, 128, 72, '#050507');
  // torso / shoulders
  g.p(43, 49, 42, 22, '#141419');
  g.p(35, 57, 58, 15, '#101014');
  // head disc and mask
  g.disc(64, 31, 20, a);
  g.disc(64, 31, 16, '#050507');
  // the two eye arches / stems, simplified at marquee size
  g.line(50, 28, 54, 24, '#ffffff'); g.line(54, 24, 58, 28, '#ffffff'); g.line(57, 27, 57, 33, '#ffffff');
  g.line(70, 28, 74, 24, '#ffffff'); g.line(74, 24, 78, 28, '#ffffff'); g.line(71, 27, 71, 33, '#ffffff');
  // nested smiling mask arcs
  for (let x = 51; x <= 77; x++) {
    const d = (x - 64) / 13;
    const y = 39 + Math.round((1 - d*d) * 5);
    g.p(x, y, 1, 1, '#ffffff');
  }
  // conversation cursor
  g.p(96, 18, 22, 12, '#111118'); g.p(99, 21, 3, 2, a); g.p(104, 21, 10, 2, '#666674');
  g.p(99, 25, 15, 2, '#33333d');
};

import { rng } from './goals.js?v=2';

export const NODE_INFO = {
  spot:    { label: 'SPOT', glyph: '●', reward: 35 },
  session: { label: 'SESSION', glyph: '◆', reward: 70 },
  shop:    { label: 'SHOP', glyph: '$', reward: 0 },
  event:   { label: 'EVENT', glyph: '?', reward: 0 },
  rest:    { label: 'REST', glyph: '+', reward: 0 },
  boss:    { label: 'RIVAL', glyph: '★', reward: 120 },
};

const WIDTHS = [1, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 1];
const ROW_TYPES = [
  ['spot'],
  ['spot', 'event'],
  ['spot', 'shop', 'spot'],
  ['session', 'spot'],
  ['spot', 'rest', 'spot'],
  ['event', 'spot'],
  ['session', 'spot', 'session'],
  ['shop', 'spot'],
  ['rest', 'event', 'spot'],
  ['session', 'spot'],
  ['spot', 'shop', 'spot'],
  ['rest', 'spot'],
  ['boss'],
];

export function generateTour(seed) {
  const random = rng(seed);
  const rows = WIDTHS.map((width, row) => {
    const candidates = ROW_TYPES[row].slice();
    // Swap equivalent branch positions per seed without changing the tour's
    // economy or guaranteeing a dead route.
    if (width > 1 && random() > 0.5) candidates.reverse();
    return Array.from({ length: width }, (_, column) => ({
      id: `r${row}n${column}`,
      row,
      column,
      district: Math.min(2, Math.floor(row / 4)),
      type: candidates[column % candidates.length],
      seed: `${seed}:${row}:${column}`,
      next: [],
    }));
  });

  for (let row = 0; row < rows.length - 1; row++) {
    const from = rows[row], to = rows[row + 1];
    for (let i = 0; i < from.length; i++) {
      const centre = ((i + 0.5) / from.length) * to.length - 0.5;
      const picks = new Set([Math.max(0, Math.min(to.length - 1, Math.floor(centre)))]);
      if (to.length > 1) picks.add(Math.max(0, Math.min(to.length - 1, Math.ceil(centre))));
      from[i].next = [...picks].map(index => to[index].id);
    }
    // Every node must be reachable. Give any orphan the closest parent.
    for (let j = 0; j < to.length; j++) {
      if (from.some(node => node.next.includes(to[j].id))) continue;
      const parent = Math.max(0, Math.min(from.length - 1, Math.round(((j + 0.5) / to.length) * from.length - 0.5)));
      from[parent].next.push(to[j].id);
    }
  }

  const nodes = rows.flat();
  return { seed: String(seed), rows, nodes, byId: Object.fromEntries(nodes.map(node => [node.id, node])) };
}

export function availableNodes(tour, route = []) {
  if (!route.length) return tour.rows[0].map(node => node.id);
  const last = tour.byId[route[route.length - 1].nodeId];
  return last ? last.next.slice() : [];
}

export function renderMap(container, tour, run, onSelect) {
  container.replaceChildren();
  const tree = document.createElement('div');
  tree.className = 'map-tree';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('map-links');
  tree.append(svg);

  const available = new Set(availableNodes(tour, run.route));
  const cleared = new Set(run.route.map(entry => entry.nodeId));
  for (const row of tour.rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'map-row';
    for (const node of row) {
      const info = NODE_INFO[node.type];
      const button = document.createElement('button');
      button.className = `map-node node-${node.type}`;
      button.dataset.node = node.id;
      button.disabled = !available.has(node.id);
      if (cleared.has(node.id)) button.classList.add('cleared');
      if (available.has(node.id)) button.classList.add('available');
      button.setAttribute('aria-label', `${info.label}, row ${node.row + 1}`);
      button.innerHTML = `<span>${info.glyph}</span><small>${info.label}</small>`;
      button.addEventListener('click', () => onSelect(node));
      rowEl.append(button);
    }
    tree.append(rowEl);
  }
  container.append(tree);

  requestAnimationFrame(() => {
    const root = tree.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${root.width} ${root.height}`);
    svg.replaceChildren();
    for (const node of tour.nodes) {
      const a = tree.querySelector(`[data-node="${node.id}"]`);
      if (!a) continue;
      const ar = a.getBoundingClientRect();
      for (const nextId of node.next) {
        const b = tree.querySelector(`[data-node="${nextId}"]`);
        if (!b) continue;
        const br = b.getBoundingClientRect();
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ar.left - root.left + ar.width / 2);
        line.setAttribute('y1', ar.bottom - root.top);
        line.setAttribute('x2', br.left - root.left + br.width / 2);
        line.setAttribute('y2', br.top - root.top);
        const used = cleared.has(node.id) && (cleared.has(nextId) || available.has(nextId));
        line.classList.toggle('used', used);
        svg.append(line);
      }
    }
  });
}

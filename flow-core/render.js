// The flow renderer.
//
// Draws simulation state; owns none of it. Every colour, label and glyph comes
// from a THEME the product passes in, so the same picture reads as a night
// ledger or a morning timetable without this file knowing which.
//
// Two rules from the brief are enforced here rather than left to taste:
//   · colour is never the only identifier — each route also carries a DASH
//     PATTERN and each node a GLYPH, so the map survives colour blindness and
//     a bad phone screen;
//   · the renderer may drop decorative density under load, but never route,
//     queue, warning or timing truth. `detail` thins the moving marks and
//     nothing else.

const PATTERNS = [[], [10, 6], [2, 5], [12, 4, 2, 4]];   // solid, dash, dot, dash-dot

export class FlowRenderer {
  constructor(canvas, theme) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = theme;
    this.detail = 1;
    this.reduced = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
  }

  setTheme(t) { this.theme = t; }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.dpr = dpr;
  }

  // css point -> node id, with a generous radius: this is a phone
  hit(flow, cx, cy) {
    const f = flow.graph.fit(this.canvas.width, this.canvas.height);
    const x = cx * this.dpr, y = cy * this.dpr;
    let best = null, bd = 30 * this.dpr;
    for (const n of flow.graph.nodes.values()) {
      const d = Math.hypot(f.x(n.x) - x, f.y(n.y) - y);
      if (d < bd) { best = n.id; bd = d; }
    }
    return best;
  }

  draw(flow, { draft = null, selected = null, alpha = 0 } = {}) {
    const { ctx, theme } = this;
    const W = this.canvas.width, H = this.canvas.height;
    const f = flow.graph.fit(W, H);
    const u = f.scale;                     // one design unit in device pixels

    ctx.fillStyle = theme.paper;
    ctx.fillRect(0, 0, W, H);
    this.paperGrain(W, H);

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // 1. the unbuilt network, faint — so an unserved district reads as a place
    //    you could reach rather than an absence
    ctx.strokeStyle = theme.latent;
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.setLineDash([3, 7]);
    for (const e of flow.graph.edges.values()) {
      if (e.mode !== 'tram') continue;
      const a = flow.graph.node(e.a), b = flow.graph.node(e.b);
      ctx.beginPath(); ctx.moveTo(f.x(a.x), f.y(a.y)); ctx.lineTo(f.x(b.x), f.y(b.y)); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. closed edges — a warning, drawn heavier than the latent mesh
    for (const e of flow.graph.edges.values()) {
      if (!e.closed && !e.delay) continue;
      const a = flow.graph.node(e.a), b = flow.graph.node(e.b);
      ctx.strokeStyle = e.closed ? theme.warn : theme.slow;
      ctx.lineWidth = Math.max(1.5, u * 0.09);
      ctx.setLineDash(e.closed ? [4, 4] : [9, 5]);
      ctx.beginPath(); ctx.moveTo(f.x(a.x), f.y(a.y)); ctx.lineTo(f.x(b.x), f.y(b.y)); ctx.stroke();
      ctx.setLineDash([]);
      if (e.closed) this.glyph(ctx, (f.x(a.x) + f.x(b.x)) / 2, (f.y(a.y) + f.y(b.y)) / 2, '×', theme.warn, u);
    }

    // 3. the drawn routes — width carries load, pattern carries identity
    flow.routes.list.forEach((r, i) => {
      const col = theme.routeColours[i % theme.routeColours.length];
      const pat = PATTERNS[i % PATTERNS.length];
      const loadK = Math.min(1, r.carriers.reduce((s, c) => s + c.load.length, 0)
        / Math.max(1, r.carriers.length * r.carrierCapacity));
      ctx.strokeStyle = col;
      ctx.lineWidth = u * (0.16 + loadK * 0.16);
      ctx.setLineDash(pat.map(v => v * this.dpr * 0.6));
      ctx.globalAlpha = r.id === selected ? 1 : 0.92;
      ctx.beginPath();
      r.nodes.forEach((id, k) => {
        const n = flow.graph.node(id);
        k ? ctx.lineTo(f.x(n.x), f.y(n.y)) : ctx.moveTo(f.x(n.x), f.y(n.y));
      });
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    });

    // 4. the route being dragged
    if (draft && draft.nodes.length) {
      ctx.strokeStyle = theme.draft;
      ctx.lineWidth = u * 0.14;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      draft.nodes.forEach((id, k) => {
        const n = flow.graph.node(id);
        k ? ctx.lineTo(f.x(n.x), f.y(n.y)) : ctx.moveTo(f.x(n.x), f.y(n.y));
      });
      if (draft.cursor) ctx.lineTo(draft.cursor.x * this.dpr, draft.cursor.y * this.dpr);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. carriers, and the marks riding them
    for (const r of flow.routes.list) {
      const i = flow.routes.list.indexOf(r);
      const col = theme.routeColours[i % theme.routeColours.length];
      for (const c of r.carriers) {
        const p = this.carrierPos(flow, r, c, this.reduced ? 0 : alpha, f);
        if (!p) continue;
        ctx.fillStyle = col;
        ctx.strokeStyle = theme.paper;
        ctx.lineWidth = 1.5 * this.dpr;
        const s = u * 0.5;
        ctx.beginPath();
        ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
        ctx.fill(); ctx.stroke();
        // the load, as marks on the carrier
        const n = Math.min(c.load.length, 6);
        ctx.fillStyle = theme.paper;
        for (let k = 0; k < n; k++) {
          ctx.fillRect(p.x - s / 2 + 2 * this.dpr + (k % 3) * (s / 3.4),
            p.y - s / 2 + 2 * this.dpr + Math.floor(k / 3) * (s / 2.6),
            Math.max(1, u * 0.07), Math.max(1, u * 0.07));
        }
      }
    }

    // 6. nodes, their glyphs and their queues
    for (const n of flow.graph.nodes.values()) {
      const x = f.x(n.x), y = f.y(n.y);
      const q = n.waiting.length;
      const over = q / Math.max(1, n.capacity);
      const r = u * 1.5;

      if (over > 0.7) {          // overload warns before it fails
        ctx.strokeStyle = theme.warn;
        ctx.lineWidth = 2 * this.dpr;
        ctx.globalAlpha = 0.35 + 0.4 * (this.reduced ? 1 : (Math.sin(flow.clock.tick / 3) + 1) / 2);
        ctx.beginPath(); ctx.arc(x, y, r + 5 * this.dpr, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = theme.paper;
      ctx.strokeStyle = n.closed ? theme.warn : theme.ink;
      ctx.lineWidth = 2.4 * this.dpr;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      const g = theme.glyphFor ? theme.glyphFor(n) : '·';
      this.glyph(ctx, x, y, g, theme.ink, u);

      // the queue: tiny marks, the thing you are meant to read first
      const show = Math.min(q, Math.ceil(10 * this.detail));
      ctx.fillStyle = over > 0.7 ? theme.warn : theme.mark;
      for (let k = 0; k < show; k++) {
        const a = -Math.PI / 2 + (k - show / 2) * 0.26;
        ctx.fillRect(x + Math.cos(a) * (r + 7 * this.dpr) - u * 0.08,
          y + Math.sin(a) * (r + 7 * this.dpr) - u * 0.08,
          Math.max(1.5, u * 0.16), Math.max(1.5, u * 0.16));
      }

      ctx.fillStyle = theme.dim;
      ctx.font = `${Math.max(9, u * 0.62) | 0}px ${theme.font}`;
      ctx.textAlign = 'center';
      const label = theme.labelFor ? theme.labelFor(n) : n.name;
      ctx.fillText(label, x, n.y > 52 ? y - r - 7 * this.dpr : y + r + 15 * this.dpr);
    }
  }

  carrierPos(flow, route, c, alpha, f) {
    const a = flow.graph.node(route.nodes[c.idx]);
    if (!a) return null;
    if (c.docked || !c.legTime) return { x: f.x(a.x), y: f.y(a.y) };
    const b = flow.graph.node(route.nodes[c.idx + c.dir]);
    if (!b) return { x: f.x(a.x), y: f.y(a.y) };
    const t = Math.min(1, (c.progress + alpha) / c.legTime);
    return { x: f.x(a.x + (b.x - a.x) * t), y: f.y(a.y + (b.y - a.y) * t) };
  }

  glyph(ctx, x, y, ch, col, u) {
    ctx.fillStyle = col;
    ctx.font = `bold ${Math.max(8, u * 0.8) | 0}px ${this.theme.font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  // A printed-map tooth rather than a photograph: one ordered-dither pass, kept
  // cheap and dropped entirely when detail is thinned.
  paperGrain(W, H) {
    if (this.detail < 0.9 || !this.theme.grain) return;
    const ctx = this.ctx;
    ctx.fillStyle = this.theme.grain;
    const step = 4 * this.dpr;
    for (let y = 0; y < H; y += step) {
      for (let x = ((y / step) % 2) * step; x < W; x += step * 2) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

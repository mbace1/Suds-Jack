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

  // Everything under a fingertip, by priority: a MARKER (product-owned pin)
  // beats a CARRIER (something moving) beats a NODE (somewhere). The product
  // decides what each one means; this only says what was touched.
  hitAll(flow, cx, cy, markers = []) {
    const f = flow.graph.fit(this.canvas.width, this.canvas.height);
    const x = cx * this.dpr, y = cy * this.dpr;

    let m = null, md = 24 * this.dpr;
    for (const mk of markers) {
      const p = this.markerPoint(flow, mk, f);
      if (!p) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < md) { m = mk; md = d; }
    }
    if (m) return { kind: 'marker', id: m.id, marker: m };

    let c = null, cd = 20 * this.dpr;
    for (const r of flow.routes.list) {
      for (const k of r.carriers) {
        const p = this.carrierPos(flow, r, k, 0, f);
        if (!p) continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < cd) { c = { routeId: r.id, carrierId: k.id }; cd = d; }
      }
    }
    if (c) return { kind: 'carrier', ...c };

    const nodeId = this.hit(flow, cx, cy);
    return nodeId ? { kind: 'node', id: nodeId } : null;
  }

  // Where a marker sits: on its node (stacked around the disc by slot) or at
  // an edge's midpoint. Design-unit `pos` is also allowed.
  markerPoint(flow, mk, f) {
    if (mk.pos) return { x: f.x(mk.pos.x), y: f.y(mk.pos.y) };
    if (mk.edge) {
      const e = flow.graph.edge(mk.edge);
      if (!e) return null;
      const a = flow.graph.node(e.a), b = flow.graph.node(e.b);
      return { x: (f.x(a.x) + f.x(b.x)) / 2, y: (f.y(a.y) + f.y(b.y)) / 2 };
    }
    const n = flow.graph.node(mk.node);
    if (!n) return null;
    const slot = mk.slot ?? 0;
    const ang = -Math.PI / 2 + slot * (Math.PI / 3);
    const r = f.scale * 1.5 + 13 * this.dpr;
    return { x: f.x(n.x) + Math.cos(ang) * r, y: f.y(n.y) + Math.sin(ang) * r };
  }

  draw(flow, { draft = null, selected = null, alpha = 0, markers = [] } = {}) {
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

    // 2b. the city's own services, under the player's ink: metro heavy and
    //     straight, trams thin, car corridors as a faint doubled line
    for (const r of flow.routes.list) {
      if (!r.fixed) continue;
      const col = theme.modeColours?.[r.mode] || theme.latent;
      ctx.strokeStyle = col;
      ctx.globalAlpha = r.mode === 'car' ? 0.35 : 0.65;
      ctx.lineWidth = u * (r.mode === 'metro' ? 0.22 : r.mode === 'car' ? 0.07 : 0.10);
      ctx.setLineDash(r.mode === 'car' ? [7, 5] : []);
      ctx.beginPath();
      r.nodes.forEach((id, k) => {
        const n = flow.graph.node(id);
        k ? ctx.lineTo(f.x(n.x), f.y(n.y)) : ctx.moveTo(f.x(n.x), f.y(n.y));
      });
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }

    // 3. the drawn routes — width carries load, pattern carries identity
    flow.routes.drawn.forEach((r, i) => {
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

    // 5. carriers, and the marks riding them. The silhouette says the mode
    //    before any colour does: the metro is a long car, a tram a box, a car
    //    a small lozenge.
    for (const r of flow.routes.list) {
      const di = flow.routes.drawn.indexOf(r);
      const col = r.fixed
        ? (theme.modeColours?.[r.mode] || theme.latent)
        : theme.routeColours[di % theme.routeColours.length];
      for (const c of r.carriers) {
        const p = this.carrierPos(flow, r, c, this.reduced ? 0 : alpha, f);
        if (!p) continue;
        ctx.fillStyle = col;
        ctx.strokeStyle = theme.paper;
        ctx.lineWidth = 1.5 * this.dpr;
        const s = u * 0.5;
        const w = r.mode === 'metro' ? s * 1.9 : r.mode === 'car' ? s * 0.8 : s;
        const h = r.mode === 'car' ? s * 0.5 : s;
        ctx.beginPath();
        ctx.rect(p.x - w / 2, p.y - h / 2, w, h);
        ctx.fill(); ctx.stroke();
        // the load, as marks on the carrier
        const n = Math.min(c.load.length, 6);
        ctx.fillStyle = theme.paper;
        for (let k = 0; k < n; k++) {
          ctx.fillRect(p.x - w / 2 + 2 * this.dpr + (k % 3) * (w / 3.4),
            p.y - h / 2 + 2 * this.dpr + Math.floor(k / 3) * (h / 2.6),
            Math.max(1, u * 0.07), Math.max(1, u * 0.07));
        }
      }
    }

    // 5b. the product's markers — pins with a glyph, stacked around their
    //     node so several can share one place and stay tappable
    for (const mk of markers) {
      const p = this.markerPoint(flow, mk, f);
      if (!p) continue;
      const r = 9 * this.dpr;
      ctx.globalAlpha = mk.dim ? 0.45 : 1;
      // the targets hang a badge on a short stalk above its node, so a pin
      // points at a place instead of covering it
      if (theme.relief) {
        ctx.strokeStyle = mk.color || theme.ink;
        ctx.lineWidth = 1.5 * this.dpr;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + r); ctx.lineTo(p.x, p.y + r + 5 * this.dpr);
        ctx.stroke();
      }
      ctx.fillStyle = theme.paper;
      ctx.strokeStyle = mk.color || theme.ink;
      ctx.lineWidth = 2 * this.dpr;
      this.lift(ctx);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      this.flat(ctx);
      ctx.fillStyle = mk.color || theme.ink;
      ctx.font = `bold ${Math.round(10 * this.dpr)}px ${theme.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(mk.glyph || '•', p.x, p.y + 0.5);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
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
      this.lift(ctx);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      this.flat(ctx);

      const g = theme.glyphFor ? theme.glyphFor(n) : '·';
      this.glyph(ctx, x, y, g, theme.ink, u);

      // the torn name tag. A stop the player can trade at is worth naming ON
      // the board — the targets do it, and until now the only way to learn a
      // stop's name was to tap it. Drawn for the SELECTED stop and for
      // anywhere a marker stands, so the board never becomes a wall of text.
      const tagged = theme.relief && theme.labelFor
        && (selected === n.id || markers.some(m => m.node === n.id));
      if (tagged) {
        const t = theme.labelFor(n).toUpperCase();
        ctx.font = `${Math.round(9 * this.dpr)}px ${theme.font}`;
        const tw = ctx.measureText(t).width + 8 * this.dpr;
        const th = 13 * this.dpr, ty = y + r + 7 * this.dpr;   // below, always:
        // a marker's badge hangs ABOVE its node, so the two never fight
        this.lift(ctx, 0.7);
        ctx.fillStyle = theme.latent;
        ctx.beginPath();
        // a torn edge rather than a rectangle: three shallow notches, seeded
        // off the name so a stop's tag is the same shape every frame
        const seed = t.charCodeAt(0) + t.length;
        ctx.moveTo(x - tw / 2, ty);
        ctx.lineTo(x + tw / 2, ty - (seed % 3) * 0.6 * this.dpr);
        ctx.lineTo(x + tw / 2 - (seed % 2) * this.dpr, ty + th);
        ctx.lineTo(x - tw / 2 + ((seed + 1) % 3) * this.dpr, ty + th - 0.8 * this.dpr);
        ctx.closePath(); ctx.fill();
        this.flat(ctx);
        ctx.fillStyle = theme.ink;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(t, x, ty + th / 2);
        ctx.textBaseline = 'alphabetic';
      }

      // the queue: tiny marks, the thing you are meant to read first
      const show = Math.min(q, Math.ceil(10 * this.detail));
      ctx.fillStyle = over > 0.7 ? theme.warn : theme.mark;
      for (let k = 0; k < show; k++) {
        const a = -Math.PI / 2 + (k - show / 2) * 0.26;
        ctx.fillRect(x + Math.cos(a) * (r + 7 * this.dpr) - u * 0.08,
          y + Math.sin(a) * (r + 7 * this.dpr) - u * 0.08,
          Math.max(1.5, u * 0.16), Math.max(1.5, u * 0.16));
      }

      // the plain label, for anywhere that did not earn a tag. Two renderings
      // of one name is how "Hakaniemi" ended up on the board twice.
      if (!tagged) {
        ctx.fillStyle = theme.dim;
        ctx.font = `${Math.max(9, u * 0.62) | 0}px ${theme.font}`;
        ctx.textAlign = 'center';
        const label = theme.labelFor ? theme.labelFor(n) : n.name;
        ctx.fillText(label, x, n.y > 52 ? y - r - 7 * this.dpr : y + r + 15 * this.dpr);
      }
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

  // RELIEF. `theme.relief` is a product's opt-in to the cut-paper look: every
  // laid-on element gets the drop shadow of a piece of card sitting above the
  // one below it. It lives here rather than in the product because only the
  // renderer knows the draw order, and it lives behind a THEME FLAG rather than
  // a constant because flow-core carries no product's look — Toko Move's day
  // map is flat paper and must stay flat by saying nothing.
  lift(ctx, k = 1) {
    if (!this.theme.relief) return;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 5 * this.dpr * k;
    ctx.shadowOffsetY = 2.5 * this.dpr * k;
  }
  flat(ctx) { ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'transparent'; }

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

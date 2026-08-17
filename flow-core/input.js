// Pointer gestures: tap a node for its local state, drag between nodes to
// propose a route. Nothing else, on purpose.
//
// Pointer events only, and every commit fires on `pointerup` AND `touchend` —
// the trap this repo has already paid for twice (hub/shell.js, the Toko
// signature): a page that cancels touches to stop scrolling kills the
// synthesised click, and cancelling `touchstart` in the capture phase also
// cancels the pointer stream, so the element never sees `pointerup` either.
// `touchend` survives both.

export class RouteDrawer {
  constructor(canvas, renderer, flow, { onCommit, onTap, onDraft } = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.flow = flow;
    this.onCommit = onCommit; this.onTap = onTap; this.onDraft = onDraft;
    this.draft = null;
    this.mode = 'tram';
    this.moved = false;

    const local = ev => {
      const r = canvas.getBoundingClientRect();
      const p = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    this._local = local;

    canvas.addEventListener('pointerdown', e => this.down(local(e)));
    canvas.addEventListener('pointermove', e => this.move(local(e)));
    canvas.addEventListener('pointerup', e => this.up(local(e)));
    canvas.addEventListener('pointercancel', () => this.cancel());
    canvas.addEventListener('touchend', e => { this.up(local(e)); }, { passive: true });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  }

  setMode(m) { this.mode = m; }

  down(p) {
    const id = this.renderer.hit(this.flow, p.x, p.y);
    this.moved = false;
    if (!id) { this.draft = null; this.onDraft?.(null); return; }
    this.draft = { mode: this.mode, nodes: [id], cursor: p };
    this.onDraft?.(this.draft);
  }

  move(p) {
    if (!this.draft) return;
    this.moved = true;
    this.draft.cursor = p;
    const id = this.renderer.hit(this.flow, p.x, p.y);
    const last = this.draft.nodes[this.draft.nodes.length - 1];
    if (id && id !== last) {
      // stepping back onto the previous stop un-draws that leg
      if (this.draft.nodes.length > 1 && id === this.draft.nodes[this.draft.nodes.length - 2]) {
        this.draft.nodes.pop();
      } else if (!this.draft.nodes.includes(id)
        && this.flow.graph.edgeBetween(last, id, this.draft.mode)) {
        this.draft.nodes.push(id);
      }
    }
    this.onDraft?.(this.draft);
  }

  up(p) {
    if (!this.draft) return;
    const d = this.draft;
    this.draft = null;
    this.onDraft?.(null);
    if (!this.moved || d.nodes.length < 2) { this.onTap?.(d.nodes[0]); return; }
    this.onCommit?.(d.mode, d.nodes);
  }

  cancel() { this.draft = null; this.onDraft?.(null); }
}

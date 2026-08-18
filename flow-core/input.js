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
  constructor(canvas, renderer, flow, { onCommit, onTap, onDraft, markersProvider } = {}) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.flow = flow;
    this.onCommit = onCommit; this.onTap = onTap; this.onDraft = onDraft;
    // the product's live pins, so a tap can land on one; a drag still only
    // ever starts from a node — you draw lines between places, not onto cars
    this.markersProvider = markersProvider || (() => []);
    this.draft = null;
    this.mode = 'tram';
    this.moved = false;

    // Every listener goes on one signal so the whole drawer can be detached in
    // a single call. Without this, re-booting a product left the previous
    // drawer attached to the same canvas and one drag fired BOTH onCommit
    // callbacks — a route added twice, two slots spent.
    this.abort = new AbortController();
    const sig = { signal: this.abort.signal };

    const local = ev => {
      const r = canvas.getBoundingClientRect();
      const p = ev.touches?.[0] || ev.changedTouches?.[0] || ev;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    this._local = local;

    canvas.addEventListener('pointerdown', e => this.down(local(e)), sig);
    canvas.addEventListener('pointermove', e => this.move(local(e)), sig);
    canvas.addEventListener('pointerup', e => this.up(local(e)), sig);
    canvas.addEventListener('pointercancel', () => this.cancel(), sig);
    canvas.addEventListener('touchend', e => { this.up(local(e)); }, { passive: true, ...sig });
    canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false, ...sig });
  }

  // Detach every listener. Call before constructing a replacement on the
  // same canvas.
  destroy() { this.abort.abort(); this.draft = null; }

  setMode(m) { this.mode = m; }

  down(p) {
    this.moved = false;
    this.downHit = this.renderer.hitAll(this.flow, p.x, p.y, this.markersProvider());
    // only a NODE can anchor a new line; a press on a pin or a carrier is the
    // start of a tap, never of a route
    if (this.downHit?.kind !== 'node') { this.draft = null; this.onDraft?.(null); return; }
    this.draft = { mode: this.mode, nodes: [this.downHit.id], cursor: p };
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
    const d = this.draft;
    const downHit = this.downHit;
    this.draft = null; this.downHit = null;
    this.onDraft?.(null);
    if (d && this.moved && d.nodes.length >= 2) { this.onCommit?.(d.mode, d.nodes); return; }
    // a tap: report whatever was under the finger, with the point so the
    // product can hang a small window off it
    if (downHit) this.onTap?.(downHit, p);
  }

  cancel() { this.draft = null; this.onDraft?.(null); }
}

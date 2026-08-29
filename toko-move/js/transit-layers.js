// Toko Move v2.4 — exact HSL transit display layers.
// Geometry is never simplified here. This module renders the committed GTFS paths as-is.

export class TransitLayers {
  constructor(pack) {
    this.pack = pack;
    this.layers = pack.lines.map((line, index) => ({
      id: line.id,
      name: line.name,
      mode: line.mode,
      colour: line.mode === 'SUBWAY' ? '#ff6319' : colourFor(index),
      path: line.path,
      visible: true,
    }));
  }

  static async load(url = './cities/kallio.json') {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Transit pack ${response.status}`);
    const pack = await response.json();
    return new TransitLayers(pack);
  }

  get source() {
    return {
      source: this.pack.source,
      licence: this.pack.licence,
      fetched: this.pack.fetched,
      feed: this.pack.feed,
      clippedTo: this.pack.clippedTo,
      note: this.pack.note,
    };
  }

  setVisible(id, visible) {
    const layer = this.layers.find(line => line.id === id);
    if (layer) layer.visible = Boolean(visible);
  }

  toggle(id) {
    const layer = this.layers.find(line => line.id === id);
    if (layer) layer.visible = !layer.visible;
    return layer?.visible ?? false;
  }

  solo(id) {
    for (const layer of this.layers) layer.visible = layer.id === id;
  }

  showAll(mode = null) {
    for (const layer of this.layers) {
      layer.visible = !mode || layer.mode === mode;
    }
  }

  hideAll() {
    for (const layer of this.layers) layer.visible = false;
  }

  visibleLines() {
    return this.layers.filter(line => line.visible);
  }

  // Draw the raw street-view geometry. `fit` may be supplied by the host so
  // transit shares exactly the same projection as stops/roads. With no fit,
  // the committed GTFS bounding box is fitted north-up to the canvas.
  draw(ctx, width, height, { fit = null, alpha = 0.9, lineWidth = 3 } = {}) {
    const project = fit || bboxFit(this.pack.clippedTo, width, height);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const layer of this.layers) {
      if (!layer.visible || layer.path.length < 2) continue;
      ctx.strokeStyle = layer.colour;
      ctx.lineWidth = layer.mode === 'SUBWAY' ? lineWidth * 1.45 : lineWidth;
      ctx.beginPath();
      for (let i = 0; i < layer.path.length; i++) {
        const [lat, lon] = layer.path[i];
        const p = project(lat, lon);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function bboxFit(box, width, height, pad = 14) {
  const usableW = Math.max(1, width - pad * 2);
  const usableH = Math.max(1, height - pad * 2);
  const lonSpan = Math.max(1e-9, box.e - box.w);
  const latSpan = Math.max(1e-9, box.n - box.s);
  // Longitude is compressed at Helsinki latitude so street geometry is not stretched.
  const kx = Math.cos(((box.n + box.s) * 0.5) * Math.PI / 180);
  const scale = Math.min(usableW / (lonSpan * kx), usableH / latSpan);
  const drawnW = lonSpan * kx * scale;
  const drawnH = latSpan * scale;
  const ox = (width - drawnW) * 0.5;
  const oy = (height - drawnH) * 0.5;
  return (lat, lon) => ({
    x: ox + (lon - box.w) * kx * scale,
    y: oy + (box.n - lat) * scale,
  });
}

// HSL uses mode colour for trams rather than official per-route colours.
// Distinct display colours are only a UI aid; geometry and line identity remain source data.
const SWATCH = ['#006eb6','#00985f','#7a4b9e','#d04a72','#c58a00','#2d7d73','#7d5b3e','#5670c1','#9b6b31','#5b8e3d','#9f5277','#437a9c'];
function colourFor(index) { return SWATCH[index % SWATCH.length]; }

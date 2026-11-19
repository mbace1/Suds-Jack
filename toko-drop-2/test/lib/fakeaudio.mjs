// fakeaudio.mjs — just enough of the Web Audio API to run the music in bare
// node, and to see what it did: every node made, what it is connected to,
// when each source starts and stops, every automation call on a param. It is
// as strict as a browser where a browser would throw: a source started twice
// or stopped before it started, an exponential ramp to zero, a time that is
// not a number.
export class FakeParam {
  constructor(owner, name, value) { this.owner = owner; this.name = name; this.value = value; this.events = []; }
  _ev(type, v, t, c) {
    if (!Number.isFinite(v) || !Number.isFinite(t)) throw new TypeError(`${this.name}.${type}(${v}, ${t}): not a finite number`);
    this.events.push({ type, v, t, c });
    return this;
  }
  setValueAtTime(v, t) { return this._ev('set', v, t); }
  linearRampToValueAtTime(v, t) { return this._ev('lin', v, t); }
  exponentialRampToValueAtTime(v, t) { if (!(v > 0)) throw new RangeError(`${this.name}: an exponential ramp to ${v}`); return this._ev('exp', v, t); }
  setTargetAtTime(v, t, c) { if (!(c >= 0)) throw new RangeError(`${this.name}: a time constant of ${c}`); return this._ev('target', v, t, c); }
  cancelScheduledValues(t) { this.events.push({ type: 'cancel', t }); return this; }
  // the last value written at or before context time t (a target counts as reached)
  at(t) { let v = this.value; for (const e of this.events) if (e.type !== 'cancel' && e.t <= t) v = e.v; return v; }
}

class FakeNode {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.outs = []; this.born = ctx.currentTime; ctx.nodes.push(this); }
  connect(dest) { if (!dest) throw new TypeError(`${this.kind}.connect(nothing)`); this.outs.push(dest); return dest; }
  disconnect() { this.outs = []; }
}
class FakeSource extends FakeNode {
  start(t = 0) {
    if (this.started != null) throw new Error(`InvalidStateError: ${this.kind} started twice`);
    if (!Number.isFinite(t)) throw new TypeError(`${this.kind}.start(${t})`);
    this.started = t; this.ctx.sources.push(this);
  }
  stop(t = 0) {
    if (this.started == null) throw new Error(`InvalidStateError: ${this.kind} stopped before it started`);
    if (!Number.isFinite(t)) throw new TypeError(`${this.kind}.stop(${t})`);
    this.stopped = t;
  }
}

export class FakeAudioContext {
  constructor({ sampleRate = 48000 } = {}) {
    this.sampleRate = sampleRate; this.currentTime = 0; this.state = 'running';
    this.nodes = []; this.sources = [];
    this.destination = new FakeNode(this, 'destination');
  }
  createGain() { const n = new FakeNode(this, 'gain'); n.gain = new FakeParam(n, 'gain', 1); return n; }
  createOscillator() {
    const n = new FakeSource(this, 'osc');
    n.type = 'sine'; n.frequency = new FakeParam(n, 'frequency', 440); n.detune = new FakeParam(n, 'detune', 0);
    n.setPeriodicWave = (w) => { n.wave = w; n.type = 'custom'; };
    return n;
  }
  createBiquadFilter() {
    const n = new FakeNode(this, 'filter');
    n.type = 'lowpass'; n.frequency = new FakeParam(n, 'frequency', 350); n.Q = new FakeParam(n, 'Q', 1); n.gain = new FakeParam(n, 'gain', 0);
    return n;
  }
  createBufferSource() { const n = new FakeSource(this, 'buffer'); n.buffer = null; n.loop = false; n.playbackRate = new FakeParam(n, 'playbackRate', 1); return n; }
  createBuffer(channels, length, rate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate: rate, duration: length / rate, getChannelData: (i) => data[i] };
  }
  createPeriodicWave(re, im) { return { kind: 'wave', re, im }; }
  createDelay(max = 1) { const n = new FakeNode(this, 'delay'); n.delayTime = new FakeParam(n, 'delayTime', 0); n.max = max; return n; }
  createStereoPanner() { const n = new FakeNode(this, 'panner'); n.pan = new FakeParam(n, 'pan', 0); return n; }
}

// whether `node` reaches `target` along its connections (a param leads on to its node)
export function reaches(node, target, seen = new Set()) {
  if (node === target) return true;
  if (!node || seen.has(node)) return false;
  seen.add(node);
  return (node.outs ?? []).some((d) => reaches(d.owner ?? d, target, seen));
}

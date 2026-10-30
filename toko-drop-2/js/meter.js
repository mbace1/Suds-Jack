// meter.js — how the phone ran a room or a run (v63), kept with it in the
// play record (js/record.js), so a person's record is a measurement of their
// phone as well as of their play: the scorecard's A10 waited on "no device
// measurement" (docs/COMPLETION.md), and every record a person sends is one.
// ?fps and ?bench (readout.js) show a phone's frame times live, for a
// screenshot; this keeps a whole run's, at a cost too small to see: one
// histogram of the frame intervals while playing, a tenth of a millisecond
// a bin, and the game time those frames moved.
//
//   p50 p95  the frame interval's median and 95th percentile, ms
//   late     the share of frames that took longer than one and a half of the
//            refresh: a frame the phone could not make in time, %
//   hz       the refresh the browser allows: the fastest 5% of frames (as
//            readout.js; Safari's 60 Hz on a ProMotion iPad, Low Power Mode's 30)
//   sim      game time over wall time: under 1 the phone could not keep up,
//            and a slow frame dropped its backlog (TUNING.sim.maxSteps)
// Pure: no DOM, no clock; main.js hands it each frame's interval.

const BIN = 0.1, BINS = 1000;   // 0 … 100 ms, and one more bin for anything slower, which keeps its own mean

export class Meter {
  constructor() { this.h = new Uint32Array(BINS + 1); this.reset(); }

  reset() { this.h.fill(0); this.n = 0; this.wall = 0; this.sim = 0; this.slow = 0; }

  // a frame while playing: its interval (ms) and the game time it moved (s)
  frame(ms, simS) {
    if (!(ms > 0) || ms > 1000) return;   // a hidden tab, a breakpoint: no frame anyone saw
    const i = Math.floor(ms / BIN);
    if (i < BINS) this.h[i]++; else { this.h[BINS]++; this.slow += ms; }
    this.n++; this.wall += ms / 1000; this.sim += simS;
  }

  // the interval under which a share p of the frames fell: a bin's middle,
  // or past 100 ms the slow frames' own mean (a phone at 3 frames a second
  // reads 330, not 100)
  q(p) {
    const want = Math.max(1, Math.ceil(p * this.n));
    for (let i = 0, c = 0; i < BINS; i++) if ((c += this.h[i]) >= want) return (i + 0.5) * BIN;
    return this.slow / this.h[BINS];
  }

  // [p50, p95, drop %, hz, sim] for the record, or null for fewer than
  // `least` frames (a run left in its first second says nothing)
  summary(least = 60) {
    if (this.n < least) return null;
    // a frame over 100 ms is late on any screen, however slow the refresh reads
    const hz = 1000 / this.q(0.05), late = Math.min(BINS, Math.ceil((1.5 * 1000) / hz / BIN));
    let over = 0;
    for (let i = late; i <= BINS; i++) over += this.h[i];
    const r1 = (x) => Math.round(x * 10) / 10;
    return [r1(this.q(0.5)), r1(this.q(0.95)), r1((100 * over) / this.n), Math.round(hz), Math.round((100 * this.sim) / this.wall) / 100];
  }
}

// what the phone is, in a few words for the record: its kind, the canvas in
// device pixels and the ratio, the renderer, and the two settings that cost
// the most to draw (the gel style and the goo)
export function device({ ua = '', touchPoints = 0, width, height, ratio, backend, gels, goo }) {
  const kind = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1) ? 'ios'
    : /Android/.test(ua) ? 'android' : /CrOS/.test(ua) ? 'chromeos' : /Macintosh/.test(ua) ? 'mac'
      : /Windows/.test(ua) ? 'windows' : /Linux/.test(ua) ? 'linux' : '?';
  return `${kind} ${width}x${height}@${+Number(ratio).toFixed(2)} ${backend} ${gels}${goo ? ' goo' : ''}`;
}

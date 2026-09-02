// Tiny Hawk physics A/B metrics. Browser-safe and engine-agnostic: both the
// production heightfield solver and the cannon-es probe can feed the same
// observation shape without sharing physics implementation.
export class PhysicsBenchmark {
  constructor(label = 'solver') { this.reset(label); }
  reset(label = this.label) {
    this.label = label; this.frames = 0; this.time = 0; this.contacts = 0;
    this.contactFlips = 0; this.wasGrounded = null; this.popSpeeds = [];
    this.landingSpeeds = []; this.airPeaks = []; this.peakY = -Infinity;
    this.entrySpeed = null; this.exitRatios = []; this.lastSpeed = 0;
  }
  sample({ dt = 0, grounded = false, speed = 0, y = 0, event = null } = {}) {
    this.frames++; this.time += dt; this.lastSpeed = speed; this.peakY = Math.max(this.peakY, y);
    if (this.wasGrounded !== null && grounded !== this.wasGrounded) this.contactFlips++;
    if (grounded) this.contacts++;
    if (event === 'pop') { this.popSpeeds.push(speed); this.peakY = y; }
    if (event === 'land') { this.landingSpeeds.push(speed); this.airPeaks.push(this.peakY); this.peakY = y; }
    if (event === 'transition-entry') this.entrySpeed = Math.max(speed, 0.001);
    if (event === 'transition-exit' && this.entrySpeed) { this.exitRatios.push(speed / this.entrySpeed); this.entrySpeed = null; }
    this.wasGrounded = grounded;
  }
  summary() {
    const mean = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const variance = a => { const m=mean(a); return a.length ? mean(a.map(v=>(v-m)**2)) : 0; };
    return {
      label: this.label, frames: this.frames,
      contactChatterHz: this.time ? this.contactFlips / this.time : 0,
      popSpeedMean: mean(this.popSpeeds), popSpeedStd: Math.sqrt(variance(this.popSpeeds)),
      landingSpeedMean: mean(this.landingSpeeds),
      transitionRetention: mean(this.exitRatios),
      airPeakMean: mean(this.airPeaks),
      samples: { pops:this.popSpeeds.length, landings:this.landingSpeeds.length, transitions:this.exitRatios.length },
    };
  }
}

export function comparePhysics(a, b) {
  // Lower chatter/pop variance is better; higher transition retention is better.
  const score = s => (s.contactChatterHz * 2) + s.popSpeedStd - (s.transitionRetention || 0);
  return { winner: score(a) <= score(b) ? a.label : b.label, aScore: score(a), bScore: score(b) };
}

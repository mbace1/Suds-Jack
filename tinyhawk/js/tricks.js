// Tiny Hawk's scoring contract: nothing pays until the skater rolls away.
// The combo owns all pending value, repetition, insurance and banking so the
// physics layer never needs to know what a point is worth.

export const TRICK_FAMILIES = {
  up:    [{ name: 'Indy Grab', base: 320 }, { name: 'Method', base: 460 }, { name: 'Stalefish', base: 620 }],
  left:  [{ name: 'Kickflip', base: 380 }, { name: 'Varial Kickflip', base: 540 }, { name: 'Hardflip', base: 720 }],
  right: [{ name: 'Heelflip', base: 380 }, { name: 'Varial Heelflip', base: 540 }, { name: 'Laser Flip', base: 720 }],
  down:  [{ name: 'Pop Shuvit', base: 340 }, { name: '360 Shuvit', base: 500 }, { name: 'Impossible', base: 680 }],
};

export const SPECIAL_TRICKS = {
  up:    { name: 'Wingspan Grab', base: 1400 },
  left:  { name: 'Featherflip', base: 1250 },
  right: { name: 'Talonflip', base: 1250 },
  down:  { name: 'Eggplant Impossible', base: 1600 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class ComboSystem {
  constructor(build = {}) {
    this.setBuild(build);
    this.resetSession();
  }

  setBuild(build = {}) {
    this.build = {
      repeatPenalty: build.repeatPenalty ?? 0.55,
      vocabulary: clamp(build.vocabulary ?? 0, 0, 2),
      insurance: !!build.insurance,
      scoreRate: build.scoreRate ?? 1,
    };
  }

  resetSession() {
    this.score = 0;
    this.bestMult = 1;
    this.bestBank = 0;
    this.insuranceUsed = false;
    this.special = 0;
    this.specialLive = false;
    this._resetChain();
  }

  _resetChain() {
    this.open = false;
    this.pending = 0;
    this.parts = [];
    this.grace = 0;
    this.counts = new Map();
    this.familySteps = { up: 0, down: 0, left: 0, right: 0 };
  }

  begin() {
    if (!this.open) {
      this.open = true;
      this.pending = 0;
      this.parts = [];
      this.grace = 0;
      this.counts = new Map();
    }
  }

  addTrick(dir) {
    this.begin();
    let trick, special = false;
    if (this.specialLive && this.special >= 25) {
      trick = SPECIAL_TRICKS[dir] || SPECIAL_TRICKS.up;
      special = true;
      this.special = Math.max(0, this.special - 25);
      if (this.special <= 0) this.specialLive = false;
    } else {
      const family = TRICK_FAMILIES[dir] || TRICK_FAMILIES.up;
      const step = this.familySteps[dir] || 0;
      const unlocked = this.build.vocabulary + 1;
      trick = family[step % unlocked];
      this.familySteps[dir] = step + 1;
    }

    const repeats = this.counts.get(trick.name) || 0;
    const penalty = 1 / (1 + repeats * this.build.repeatPenalty);
    const points = Math.round(trick.base * penalty * this.build.scoreRate);
    this.counts.set(trick.name, repeats + 1);
    this.parts.push(trick.name);
    this.pending += points;
    this.grace = 0;
    return { name: trick.name, points, penalty, special };
  }

  addLink(name, points = 0) {
    this.begin();
    if (name && this.parts[this.parts.length - 1] !== name) this.parts.push(name);
    this.pending += points * this.build.scoreRate;
    this.grace = 0;
  }

  addPoints(points) {
    if (this.open) this.pending += points * this.build.scoreRate;
  }

  land(info) {
    if (!this.open) return null;
    const spins = Math.floor(info.spin / (Math.PI * 0.95));
    this.pending += (Math.round(info.airTime * 220) + spins * 150 + 60) * this.build.scoreRate;
    if (spins) this.parts.push(`${spins * 180}°`);
    if (info.fakie) {
      this.parts.push('Fakie');
      this.pending *= 1.18;
    }
    this.grace = 0;
    return { spins, fakie: !!info.fakie };
  }

  tick(dt, active, grind = false, manual = false) {
    if (!this.open) return null;
    if (grind) this.pending += 90 * dt * this.build.scoreRate;
    if (manual) this.pending += 45 * dt * this.build.scoreRate;
    if (active) this.grace = 0;
    else this.grace += dt;
    return this.grace >= 0.28 ? this.bank() : null;
  }

  tickSpecial(dt, active) {
    if (this.specialLive && !active) {
      this.special = Math.max(0, this.special - dt * 4);
      if (this.special <= 0) this.specialLive = false;
    }
  }

  bank() {
    if (!this.open) return null;
    const mult = Math.max(1, this.parts.length);
    const total = Math.max(0, Math.round(this.pending * mult));
    const wasLive = this.specialLive;
    this.special = clamp(this.special + Math.min(34, 12 + mult * 5 + total / 600), 0, 100);
    if (this.special >= 100) this.specialLive = true;
    const result = {
      type: 'bank', total, base: Math.round(this.pending), mult, parts: this.parts.slice(),
      specialReady: !wasLive && this.specialLive,
    };
    this.score += total;
    this.bestMult = Math.max(this.bestMult, mult);
    this.bestBank = Math.max(this.bestBank, total);
    this._resetChain();
    return result;
  }

  bail() {
    if (!this.open) return { type: 'bail', saved: 0, lost: 0, insured: false };
    const lost = Math.round(this.pending * Math.max(1, this.parts.length));
    let saved = 0;
    if (this.build.insurance && !this.insuranceUsed) {
      saved = Math.round(lost * 0.5);
      this.insuranceUsed = true;
      this.score += saved;
    }
    const result = { type: 'bail', saved, lost: Math.max(0, lost - saved), insured: saved > 0 };
    this.special *= 0.45;
    this.specialLive = false;
    this._resetChain();
    return result;
  }

  discard() {
    const lost = Math.round(this.pending * Math.max(1, this.parts.length));
    this._resetChain();
    return lost;
  }

  snapshot() {
    return {
      score: Math.round(this.score),
      open: this.open,
      pending: Math.round(this.pending),
      mult: Math.max(1, this.parts.length),
      parts: this.parts.slice(),
      bestMult: this.bestMult,
      bestBank: this.bestBank,
      insuranceUsed: this.insuranceUsed,
      special: this.special,
      specialLive: this.specialLive,
    };
  }
}

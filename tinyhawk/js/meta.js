import { generateTour } from './map.js?v=2';
import { hashSeed } from './goals.js?v=2';

const SAVE_KEY = 'tinyHawkPartV2';

export const PARTS = [
  {
    id: 'soft-wheels', name: 'Soft wheels', cost: 60,
    text: '+22% grind correction · −5% top speed',
    mods: { grindCorrect: 1.22, maxSpeed: 0.95 },
  },
  {
    id: 'steezy-grip', name: 'Steezy grip', cost: 75,
    text: 'repeat-trick penalty nearly halved · −5% base scoring',
    mods: { repeatPenalty: 0.28, scoreRate: 0.95 },
  },
  {
    id: 'insurance-clip', name: 'Insurance clip', cost: 80,
    text: 'first bail each node banks half the lost combo · −4% speed',
    mods: { insurance: true, maxSpeed: 0.96 },
  },
  {
    id: 'hollow-trucks', name: 'Hollow trucks', cost: 70,
    text: '+18% carve rate · landing window 10% tighter',
    mods: { turn: 1.18, landingTolerance: 0.9 },
  },
  {
    id: 'ceramic-bearings', name: 'Ceramic bearings', cost: 90,
    text: '+10% top speed · grinds lose speed faster',
    mods: { maxSpeed: 1.1, grindFriction: 1.22 },
  },
];

const defaults = () => ({
  sponsorQuota: 1,
  sponsorPay: 1,
  rivalBonus: 0,
  stoppers: 0,
  kneeNodes: 0,
});

export class PartRun {
  constructor(seed = `${Date.now()}`) {
    this.seed = String(seed);
    this.tour = generateTour(this.seed);
    this.film = 5;
    this.footage = 0;
    this.route = [];
    this.pendingNodeId = null;
    this.parts = [];
    this.vocabulary = 0;
    this.insuranceUsedNodes = [];
    this.flags = defaults();
    this.seenEvents = [];
    this.finished = false;
  }

  get maxFilm() { return this.flags.kneeNodes > 0 ? 4 : 5; }
  get district() { return Math.min(2, Math.floor(this.route.length / 4)); }
  get alive() { return this.film > 0; }

  modifiers(nodeId = null) {
    const out = {
      repeatPenalty: 0.55,
      vocabulary: this.vocabulary,
      insurance: false,
      scoreRate: 1,
      grindCorrect: 1,
      maxSpeed: 1,
      turn: 1,
      landingTolerance: 1,
      grindFriction: 1,
      hazards: this.flags.stoppers,
    };
    for (const id of this.parts) {
      const part = PARTS.find(item => item.id === id);
      if (!part) continue;
      for (const [key, value] of Object.entries(part.mods)) {
        if (typeof value === 'boolean') out[key] = out[key] || value;
        else if (key === 'repeatPenalty') out[key] = Math.min(out[key], value);
        else out[key] *= value;
      }
    }
    if (nodeId && this.insuranceUsedNodes.includes(nodeId)) out.insurance = false;
    return out;
  }

  commitNode(nodeId) {
    if (this.pendingNodeId) return this.pendingNodeId === nodeId;
    const node = this.tour.byId[nodeId];
    if (!node) return false;
    const available = this.route.length
      ? this.tour.byId[this.route[this.route.length - 1].nodeId]?.next || []
      : this.tour.rows[0].map(item => item.id);
    if (!available.includes(nodeId)) return false;
    this.pendingNodeId = nodeId;
    this.save();
    return true;
  }

  markInsuranceUsed(nodeId) {
    if (nodeId && !this.insuranceUsedNodes.includes(nodeId)) {
      this.insuranceUsedNodes.push(nodeId);
      this.save();
    }
  }

  failAttempt() {
    this.film = Math.max(0, this.film - 1);
    this.save();
    return this.film;
  }

  clearNode(node, result = {}) {
    const base = node.type === 'boss' ? 120 : node.type === 'session' ? 70 : node.type === 'spot' ? 35 : 0;
    let reward = Math.round((base + (result.bonus || 0)) * this.flags.sponsorPay);
    let partReward = null;
    if (node.type === 'session') {
      const available = PARTS.filter(item => !this.parts.includes(item.id));
      if (available.length) {
        const part = available[hashSeed(node.seed) % available.length];
        this.parts.push(part.id);
        partReward = part.name;
      } else {
        reward += 50;
        partReward = '50 footage · board already complete';
      }
    }
    this.footage += reward;
    this.route.push({
      nodeId: node.id,
      type: node.type,
      district: node.district,
      score: Math.round(result.score || 0),
      bestMult: result.bestMult || 1,
      line: result.line || '—',
      reward,
      partReward,
    });
    this.pendingNodeId = null;
    if (this.flags.kneeNodes > 0) this.flags.kneeNodes--;
    if (this.film > this.maxFilm) this.film = this.maxFilm;
    if (node.type === 'boss') this.finished = true;
    this.save();
    return reward;
  }

  restFilm() {
    this.film = Math.min(this.maxFilm, this.film + 2);
    this.save();
  }

  practise() {
    this.vocabulary = Math.min(2, this.vocabulary + 1);
    this.save();
  }

  buy(id) {
    if (id === 'lesson') {
      const cost = 65 + this.vocabulary * 35;
      if (this.vocabulary >= 2 || this.footage < cost) return false;
      this.footage -= cost;
      this.vocabulary++;
      this.save();
      return true;
    }
    const part = PARTS.find(item => item.id === id);
    if (!part || this.parts.includes(id) || this.footage < part.cost) return false;
    this.footage -= part.cost;
    this.parts.push(id);
    this.save();
    return true;
  }

  rank() {
    const total = this.route.reduce((sum, entry) => sum + (entry.score || 0), 0);
    if (this.finished && total >= 180000) return 'S';
    if (this.finished && total >= 120000) return 'A';
    if (this.finished && total >= 70000) return 'B';
    if (this.finished) return 'C';
    return 'UNFINISHED';
  }

  serialize() {
    return {
      seed: this.seed,
      film: this.film,
      footage: this.footage,
      route: this.route,
      pendingNodeId: this.pendingNodeId,
      parts: this.parts,
      vocabulary: this.vocabulary,
      insuranceUsedNodes: this.insuranceUsedNodes,
      flags: this.flags,
      seenEvents: this.seenEvents,
      finished: this.finished,
    };
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.serialize())); } catch (error) { /* private mode */ }
  }

  erase() {
    try { localStorage.removeItem(SAVE_KEY); } catch (error) { /* private mode */ }
  }

  static load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (error) { return null; }
    if (!data || !data.seed || !Array.isArray(data.route)) return null;
    const run = new PartRun(data.seed);
    run.film = Math.max(0, Number(data.film) || 0);
    run.footage = Math.max(0, Number(data.footage) || 0);
    run.route = data.route;
    run.pendingNodeId = typeof data.pendingNodeId === 'string' && run.tour.byId[data.pendingNodeId]
      ? data.pendingNodeId : null;
    run.parts = Array.isArray(data.parts) ? data.parts.filter(id => PARTS.some(part => part.id === id)) : [];
    run.vocabulary = Math.max(0, Math.min(2, Number(data.vocabulary) || 0));
    run.insuranceUsedNodes = Array.isArray(data.insuranceUsedNodes)
      ? data.insuranceUsedNodes.filter(id => typeof id === 'string') : [];
    run.flags = { ...defaults(), ...(data.flags || {}) };
    run.seenEvents = Array.isArray(data.seenEvents) ? data.seenEvents : [];
    run.finished = !!data.finished;
    return run;
  }
}

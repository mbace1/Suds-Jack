import { Player } from './player.js?v=12';

// SKLTR v33 — movement-first auto-melee.
// Dash contact guarantees a regular-enemy kill. A very fast near-touch also kills.
// No lunge, camera pull, pause, or trajectory correction: movement remains uninterrupted.
const oldMoveOffense = Player.prototype._movementOffense;

Player.prototype._movementOffense = function(dt, enemies) {
  oldMoveOffense.call(this, dt, enemies);
  if (!this.alive) return;
  if (!this._meleeTagged) this._meleeTagged = new WeakSet();

  const speed = Math.hypot(this.vx || 0, this.vz || 0);
  const fastSkim = speed >= 13.5;
  if (!this.dashing && !fastSkim) return;

  for (const e of enemies) {
    if (!e || !e.alive || e.boss || this._meleeTagged.has(e)) continue;

    const dx = e.x - this.x, dz = e.z - this.z;
    const horizontal = Math.hypot(dx, dz);
    const vertical = Math.abs((this.y + 0.9) - (e.y || 0));
    if (vertical > 1.45) continue;

    // Deliberately razor-thin. Dash is a little more forgiving because the player
    // explicitly committed to the offensive movement; passive high-speed skims
    // require an almost-touching line.
    const reach = (e.r || 0.7) + (this.dashing ? 0.42 : 0.18);
    if (horizontal > reach) continue;

    this._meleeTagged.add(e);
    const killed = e.takeDamage((e.hp || 1) + 1);
    if (!killed) continue;

    this.addKill();
    this.flowStacks = Math.min(3, (this.flowStacks || 0) + 1);
    this.flowT = Math.max(this.flowT || 0, 3.2);
    this.flowPulse = true;
    this._meleePulse = 1;
    window.dispatchEvent(new CustomEvent('skltr-melee-kill', {detail:{x:e.x,y:e.y,z:e.z,type:e.type}}));
  }
};

const oldUpdate = Player.prototype.update;
Player.prototype.update = function(...args) {
  const out = oldUpdate.apply(this, args);
  this._meleePulse = Math.max(0, (this._meleePulse || 0) - (args[0] || 0) * 7);
  if (this._meleePulse > 0 && this.fig?.group) {
    const k = this._meleePulse;
    this.fig.group.scale.setScalar(1 + 0.08 * k);
  } else if (this.fig?.group) {
    this.fig.group.scale.setScalar(1);
  }
  return out;
};

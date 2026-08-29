import { Enemy } from './enemy.js?v=12';
import { Player } from './player.js?v=12';

// Combat-readability layer shared by the same Enemy/Player module instances main.js uses.
const oldEnemyUpdate = Enemy.prototype.update;
Enemy.prototype.update = function(dt, player, pool, heightAt, bound) {
  oldEnemyUpdate.call(this, dt, player, pool, heightAt, bound);
  if (!this.alive) return;

  // Telegraph the final fraction of each attack cooldown. Regular enemies only:
  // bosses retain their existing bespoke animation language.
  if (!this.boss && this.flash <= 0) {
    const window = this.type === 'chaser' ? 0.22 : 0.34;
    if (this.cd > 0 && this.cd < window) {
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() * 0.035);
      const hot = this.type === 'turret' ? 0xffb347 : this.type === 'flyer' ? 0xd88cff : 0xff5c5c;
      this.edge.color.setHex(hot);
      this.edge.opacity = 0.65 + pulse * 0.35;
      this.edge.transparent = true;
    } else {
      this.edge.opacity = 1;
      this.edge.transparent = false;
      this.edge.color.setHex(this.restColor);
    }
  }
};

const oldTakeDamage = Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage = function(d) {
  const dead = oldTakeDamage.call(this, d);
  this.g.scale.setScalar(dead ? 1.22 : 1.07);
  if (dead) {
    this.edge.color.setHex(0xffffff);
  } else {
    setTimeout(() => { if (this.alive) this.g.scale.setScalar(1); }, 45);
  }
  return dead;
};

const oldPlayerUpdate = Player.prototype.update;
Player.prototype.update = function(...args) {
  const out = oldPlayerUpdate.apply(this, args);
  const el = document.getElementById('flow-state');
  if (el) {
    const n = this.flowStacks || 0;
    el.textContent = n ? `FLOW ${'◆'.repeat(n)}${'◇'.repeat(Math.max(0,3-n))}` : 'FLOW ◇◇◇';
    el.dataset.active = n ? '1' : '0';
    const life = Math.max(0, Math.min(1, (this.flowT || 0) / 2.4));
    el.style.opacity = n ? String(.45 + life * .55) : '.28';
    el.style.transform = n ? `scale(${1 + n * .025})` : 'scale(1)';
  }
  if (this.flowPulse) {
    const el2 = document.getElementById('flow-state');
    if (el2) { el2.classList.remove('pulse'); void el2.offsetWidth; el2.classList.add('pulse'); }
    this.flowPulse = false;
  }
  return out;
};

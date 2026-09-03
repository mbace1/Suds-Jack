import assert from 'node:assert/strict';
import { MovementHeroV3 } from '../js/movement-hero-v3.js';

const T = 16;
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const near = (actual, expected, tolerance, message) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}±${tolerance}, got ${actual}`);
  checks++;
};
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };

class GridWorld {
  constructor(rows) { this.g = rows.map(r => [...r]); this.h = this.g.length; this.w = this.g[0].length; }
  tile(x, y) { return x < 0 || x >= this.w || y < 0 || y >= this.h ? ' ' : this.g[y][x]; }
  solidTile(x, y) { return this.tile(x, y) === '#'; }
  boxSolid(x, y, w, h) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 1) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + h - 1) / T);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (this.solidTile(xx, yy)) return true;
    return false;
  }
  ledgeAhead(x, y, face) {
    const tx = Math.floor((x + face * 7) / T), target = y - 26;
    for (let ty = Math.floor((target - 11) / T); ty <= Math.floor((target + 11) / T); ty++) {
      if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1) || this.solidTile(tx - face, ty)) continue;
      const lipY = ty * T;
      if (Math.abs(lipY - target) > 10) continue;
      const hx = tx * T + (face > 0 ? -5 : T + 5);
      if (!this.boxSolid(hx - 4, lipY + 3, 8, 22)) return { x: hx, y: lipY, face };
    }
    return null;
  }
  ledgeBehind(x, y, face) {
    const tx = Math.floor((x - face * 7) / T), ty = Math.floor((y + 2) / T);
    if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) return null;
    const lipY = ty * T;
    if (Math.abs(lipY - y) > 6) return null;
    const edge = face > 0 ? (tx + 1) * T : tx * T, hx = edge + face * 5;
    return this.boxSolid(hx - 4, lipY + 3, 8, 22) ? null : { x: hx, y: lipY, face: -face };
  }
}

const blankInput = () => ({ dir: 0, dirHeld: 0, up: false, down: false, jumpPress: false, buffer: { jump: 0 }, consume() {} });
const game = { kill() {}, hurt() {} };

// One-tile low mantle: exactly 16 px rise in exactly 22 movement frames.
{
  const world = new GridWorld([
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '          ',
    '   #      ',
    '##########',
  ]);
  const hero = new MovementHeroV3(40, 176);
  equal(hero.canLowMantle(world), true, 'one-tile obstacle is recognized as a low mantle');
  const startY = hero.y;
  hero.beginLowMantle();
  for (let i = 0; i < 22; i++) hero.update(world, blankInput(), game);
  equal(hero.state, 'stand', 'low mantle completes to stand without held direction');
  near(hero.y, startY - 16, 0.01, 'low mantle gains exactly one tile');
  equal(hero.transitionFaults, 0, 'low mantle geometry produces no transition faults');
}

// Pull-up: feet finish exactly on the ledge lip after the authored 42-frame move.
{
  const world = new GridWorld(Array(12).fill('          '));
  const hero = new MovementHeroV3(60, 100);
  hero.ledgeY = 64;
  hero.y = 90;
  hero.go('hang');
  hero.go('pullUp');
  const startX = hero.x;
  for (let i = 0; i < 42; i++) hero.update(world, blankInput(), game);
  equal(hero.state, 'stand', 'pull-up completes to stand');
  near(hero.y, 64, 0.01, 'pull-up finishes with feet on ledge lip');
  ok(hero.x > startX + 8, 'pull-up carries body onto platform rather than rising in place');
  equal(hero.transitionFaults, 0, 'pull-up geometry produces no transition faults');
}

// Deliberate climb-down: 30 frames moves from floor edge to a stable hang 26 px below it.
{
  const world = new GridWorld(Array(12).fill('          '));
  const hero = new MovementHeroV3(80, 128);
  hero.beginClimbDown({ edgeX: 88, y: 128, out: 1 });
  for (let i = 0; i < 30; i++) hero.update(world, blankInput(), game);
  equal(hero.state, 'hang', 'climb-down completes to hang');
  near(hero.y, 154, 0.01, 'climb-down hang is 26 px below lip');
  near(hero.x, 93, 0.01, 'climb-down finishes at authored hand position');
  equal(hero.face, -1, 'climb-down turns hero back toward the ledge');
  equal(hero.transitionFaults, 0, 'climb-down geometry produces no transition faults');
}

// Ledge catch placement: hands lock to lip and feet are always 26 px below.
{
  const hero = new MovementHeroV3(10, 10);
  hero.grab({ x: 117, y: 80, face: -1 });
  equal(hero.state, 'ledgeCatch', 'grab enters ledgeCatch presentation state');
  equal(hero.x, 117, 'ledge catch snaps horizontally to hand anchor');
  equal(hero.y, 106, 'ledge catch places feet 26 px below lip');
  equal(hero.face, -1, 'ledge catch adopts ledge-facing direction');
  near(hero.vx, 0, 0, 'ledge catch clears horizontal velocity');
  near(hero.vy, 0, 0, 'ledge catch clears vertical velocity');
}

console.log(`Flash Prince movement geometry: ${checks} checks passed`);

// Flash Prince — movement laboratory.
//
// This is deliberately not a level. It is a stripped-back place to tune the
// body contract before campaign rooms, scenery or combat can hide a bad feel.
// The real Hero and Input classes run here unchanged; only the world is a tiny
// deterministic collision grid.

import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js';
import { Hero, HERO_H } from './hero.js';
import { Input } from './input.js';
import { drawFigure } from './figure.js';

const TILE = 16, RW = 20, RH = 12;

const LABS = [
  {
    name: '01 FLOW',
    note: 'STEP → RUN → SKID → PIVOT · BUFFER JUMP AT END OF STEP',
    spawn: { x: 40, y: 160 },
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '####################',
    ],
  },
  {
    name: '02 GAP + LEDGE',
    note: '3-TILE RUNNING GAP · HIGH LIP · CATCH WITH TOWARD / UP',
    spawn: { x: 40, y: 144 },
    map: [
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '                    ',
      '              ######',
      '              ######',
      '######   ###########',
      '######   ###########',
      '######   ###########',
    ],
  },
  {
    name: '03 FALL LADDER',
    note: 'ONE STOREY FREE · TWO HURT · THREE KILL · PRACTISE CONTROLLED DROP',
    spawn: { x: 40, y: 80 },
    map: [
      '                    ',
      '                    ',
      ' #####              ',
      ' #####              ',
      ' #####   #####      ',
      ' #####   #####      ',
      ' #####   #####   ###',
      ' #####   #####   ###',
      ' #####   #####   ###',
      ' #####   #####   ###',
      ' #####   #####   ###',
      '####################',
    ],
  },
];

class LabWorld {
  constructor() { this.load(0); }

  load(i) {
    this.index = (i + LABS.length) % LABS.length;
    this.lab = LABS[this.index];
    this.grid = this.lab.map.map(r => r.split(''));
  }

  tile(tx, ty) {
    if (tx < 0 || tx >= RW || ty < 0 || ty >= RH) return ' ';
    return this.grid[ty][tx];
  }

  solidTile(tx, ty) { return this.tile(tx, ty) === '#'; }

  boxSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
    }
    return false;
  }

  ledgeAhead(x, y, face) {
    const tx = Math.floor((x + face * 7) / TILE);
    const target = y - 26;
    for (let ty = Math.floor((target - 11) / TILE); ty <= Math.floor((target + 11) / TILE); ty++) {
      if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) continue;
      if (this.solidTile(tx - face, ty)) continue;
      const lipY = ty * TILE;
      if (Math.abs(lipY - target) > 10) continue;
      const hx = tx * TILE + (face > 0 ? -5 : TILE + 5);
      if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) continue;
      return { x: hx, y: lipY, face };
    }
    return null;
  }

  ledgeBehind(x, y, face) {
    const tx = Math.floor((x - face * 7) / TILE);
    const ty = Math.floor((y + 2) / TILE);
    if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) return null;
    const lipY = ty * TILE;
    if (Math.abs(lipY - y) > 6) return null;
    const edge = face > 0 ? (tx + 1) * TILE : tx * TILE;
    const hx = edge + face * 5;
    if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) return null;
    return { x: hx, y: lipY, face: -face };
  }

  draw(scr) {
    scr.clear(C.VOID);

    // Registration lines: intentionally clinical rather than scenic. They make
    // root motion, storey height and foot placement visible while tuning.
    for (let x = 0; x <= W; x += TILE) scr.line(x, 0, x, H, C.FAR, 0.35);
    for (let y = 0; y <= H; y += TILE) scr.line(0, y, W, y, C.FAR, 0.35);

    for (let ty = 0; ty < RH; ty++) {
      for (let tx = 0; tx < RW; tx++) {
        if (!this.solidTile(tx, ty)) continue;
        const x = tx * TILE, y = ty * TILE;
        scr.rect(x, y, TILE, TILE, C.SOLID);
        if (!this.solidTile(tx, ty - 1)) scr.rect(x, y, TILE, 2, C.EDGE);
        if (!this.solidTile(tx - 1, ty)) scr.rect(x, y, 1, TILE, C.DARK);
        if (!this.solidTile(tx + 1, ty)) scr.rect(x + TILE - 1, y, 1, TILE, C.DARK);
      }
    }
  }
}

class Lab {
  constructor() {
    this.scr = new Screen(document.getElementById('screen'));
    this.scr.setPalette(paletteAt(2.15));
    this.input = new Input(this.scr);
    this.world = new LabWorld();
    this.hero = new Hero(40, 160);
    this.deaths = 0;
    this.flash = 0;
    this.load(0);

    addEventListener('keydown', e => {
      if (e.code === 'Digit1') this.load(0);
      if (e.code === 'Digit2') this.load(1);
      if (e.code === 'Digit3') this.load(2);
      if (e.code === 'KeyR') this.resetHero();
    });

    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame(t => this.frame(t));
  }

  load(i) {
    this.world.load(i);
    this.resetHero();
  }

  resetHero() {
    const s = this.world.lab.spawn;
    this.hero = new Hero(s.x, s.y);
    this.hero.health = 3;
    this.hero.hasGun = false;
    this.hero.go('stand');
    this.flash = 0;
  }

  kill() {
    if (this.hero.dead) return;
    this.hero.dead = true;
    this.hero.go('dead');
    this.hero.health = 0;
    this.deaths++;
    this.flash = 8;
  }

  hurt(n) {
    if (this.hero.dead) return;
    this.hero.health -= n;
    this.flash = 5;
    if (this.hero.health <= 0) this.kill();
  }

  step() {
    this.input.poll();

    if (this.input.pausePress) this.resetHero();
    if (!this.hero.dead) {
      this.hero.update(this.world, this.input, this);
      if (this.hero.y > H + 40) this.kill('fall');
    } else if (this.input.anyPress) {
      this.resetHero();
    }

    if (this.flash > 0) this.flash--;
    this.input.flush();
  }

  controls() {
    const z = [
      { name: 'left', x: 8, y: 148, w: 34, h: 34 },
      { name: 'right', x: 46, y: 148, w: 34, h: 34 },
      { name: 'down', x: 84, y: 148, w: 34, h: 34 },
      { name: 'jump', x: 258, y: 142, w: 54, h: 40 },
    ];
    this.input.setZones(z);
    return z;
  }

  paint() {
    const s = this.scr;
    this.world.draw(s);

    const pose = this.hero.pose();
    const col = {
      far: C.SUIT,
      body: C.SUIT_HI,
      legs: C.SUIT,
      arms: C.SUIT_HI,
      skin: C.SKIN,
      hair: C.HAIR,
      eye: null,
      gun: C.HAIR,
    };
    drawFigure(s, this.hero.x, this.hero.y, this.hero.face, pose, col);

    const lab = this.world.lab;
    s.text(lab.name, 8, 6, C.LUX2, 8);
    s.text(lab.note, 8, 17, C.EDGE, 6);
    s.text(`STATE ${this.hero.state.toUpperCase()}  F ${this.hero.f}`, 8, 28, C.SUIT_HI, 6);
    s.text(`X ${this.hero.x.toFixed(1)}  Y ${this.hero.y.toFixed(1)}  HP ${this.hero.health}`, 8, 36, C.SUIT_HI, 6);
    s.text(`BUFFER J:${this.input.buffer.jump} F:${this.input.buffer.fire} G:${this.input.buffer.gun}`, 8, 44, C.LUX, 6);
    s.text('1/2/3 LAB · R RESET · ARROWS/WASD · SPACE/UP JUMP', 8, 54, C.NEAR, 6);

    // one-storey ruler next to the right edge: 48 px exactly.
    s.line(310, 80, 310, 128, C.ALERT, 1);
    s.line(306, 80, 314, 80, C.ALERT, 1);
    s.line(306, 128, 314, 128, C.ALERT, 1);
    s.text('48', 296, 100, C.ALERT, 6);

    for (const z of this.controls()) {
      s.rect(z.x, z.y, z.w, z.h, C.DARK);
      s.rect(z.x + 1, z.y + 1, z.w - 2, 1, C.EDGE);
      const label = z.name === 'left' ? '<' : z.name === 'right' ? '>' : z.name === 'down' ? 'V' : 'JUMP';
      s.text(label, z.x + (z.w - s.textW(label, 7)) / 2, z.y + 13, C.SUIT_HI, 7);
    }

    if (this.flash > 0) s.veil([0, 0, W, 0, W, H, 0, H], C.ALERT, 0.18);
    s.present();
  }

  frame(t) {
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.acc += dt;
    const tick = 1000 / 60;
    while (this.acc >= tick) {
      this.step();
      this.acc -= tick;
    }
    this.paint();
    requestAnimationFrame(n => this.frame(n));
  }
}

new Lab();

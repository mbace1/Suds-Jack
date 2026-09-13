// The snow, as a simulation. A fixed pool in typed arrays: position, velocity,
// age, life and size per particle, stepped on the CPU with gravity, air drag,
// wind, and a collision with the terrain function — a flake below the snow
// is snow again. Pure, so the node gate can run it; the renderer only reads
// the arrays into a Points geometry.

export class SnowSim {
  constructor(max = 4000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.size = new Float32Array(max);
    this.kind = new Float32Array(max);     // 0 spray, 1 powder cloud, 2 ambient flake
    this.count = 0;
    this.wind = [0, 0, 0];
    this.seed = 1;
  }
  rand() {                               // a tiny LCG so a test is repeatable
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  emit(x, y, z, vx, vy, vz, life, size, kind = 0) {
    let i = this.count;
    if (i >= this.max) i = Math.floor(this.rand() * this.max);   // full: recycle a random one
    else this.count++;
    const p = i * 3;
    this.pos[p] = x; this.pos[p + 1] = y; this.pos[p + 2] = z;
    this.vel[p] = vx; this.vel[p + 1] = vy; this.vel[p + 2] = vz;
    this.age[i] = 0; this.life[i] = life; this.size[i] = size; this.kind[i] = kind;
    return i;
  }
  // a cone of spray from a point: `dir` is the throw direction, `spread` its cone
  burst(n, x, y, z, dx, dy, dz, speed, spread, life, size, kind = 0) {
    for (let k = 0; k < n; k++) {
      const a = this.rand() * Math.PI * 2, r = spread * Math.sqrt(this.rand());
      // an orthonormal pair around dir, cheaply
      const ax = Math.abs(dx) < 0.9 ? 1 : 0, ay = ax ? 0 : 1;
      let ux = ay * dz - 0 * dy, uy = 0 * dx - ax * dz, uz = ax * dy - ay * dx;
      const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
      const wx = dy * uz - dz * uy, wy = dz * ux - dx * uz, wz = dx * uy - dy * ux;
      const ox = Math.cos(a) * r, oy = Math.sin(a) * r;
      const s = speed * (0.55 + this.rand() * 0.6);
      this.emit(x + (this.rand() - 0.5) * 0.3, y, z + (this.rand() - 0.5) * 0.3,
        (dx + ux * ox + wx * oy) * s, (dy + uy * ox + wy * oy) * s, (dz + uz * ox + wz * oy) * s,
        life * (0.6 + this.rand() * 0.8), size * (0.6 + this.rand() * 0.8), kind);
    }
  }
  kill(i) {
    const last = --this.count;
    if (i !== last) {
      const p = i * 3, q = last * 3;
      this.pos[p] = this.pos[q]; this.pos[p + 1] = this.pos[q + 1]; this.pos[p + 2] = this.pos[q + 2];
      this.vel[p] = this.vel[q]; this.vel[p + 1] = this.vel[q + 1]; this.vel[p + 2] = this.vel[q + 2];
      this.age[i] = this.age[last]; this.life[i] = this.life[last];
      this.size[i] = this.size[last]; this.kind[i] = this.kind[last];
    }
  }
  step(dt, terrain) {
    const { pos, vel, age, life, kind } = this;
    const [wx, wy, wz] = this.wind;
    for (let i = this.count - 1; i >= 0; i--) {
      age[i] += dt;
      if (age[i] >= life[i]) { this.kill(i); continue; }
      const p = i * 3;
      const k = kind[i];
      // fine snow falls slowly: drag wins over gravity quickly
      const g = k === 2 ? 1.2 : k === 1 ? 3.0 : 7.5;
      const drag = k === 2 ? 0.8 : k === 1 ? 2.6 : 1.7;
      const dk = Math.exp(-drag * dt);
      vel[p] = (vel[p] - wx) * dk + wx;
      vel[p + 1] = (vel[p + 1] - g * dt - wy) * dk + wy;
      vel[p + 2] = (vel[p + 2] - wz) * dk + wz;
      pos[p] += vel[p] * dt; pos[p + 1] += vel[p + 1] * dt; pos[p + 2] += vel[p + 2] * dt;
      if (k !== 2 && vel[p + 1] < 0 && pos[p + 1] < terrain.height(pos[p], pos[p + 2]) + 0.02) {
        // back into the snow: the last of the life is a fade on the surface
        pos[p + 1] = terrain.height(pos[p], pos[p + 2]) + 0.04;
        vel[p] *= 0.2; vel[p + 1] = 0; vel[p + 2] *= 0.2;
        if (life[i] - age[i] > 0.35) age[i] = life[i] - 0.35;
      }
    }
  }
}

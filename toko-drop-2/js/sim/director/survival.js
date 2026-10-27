// survival.js — SURVIVAL's director: endless, and it only gets worse.
//
// Pressure rises over TUNING.director.ramp seconds and then holds. The roster
// unlocks along ARCADE's own table (tuning/waves.js pool), read as if a wave
// passed every `secondsPerWave`; that same wave number drives the bodies'
// speed and fire-rate escalation, the swarm's current and HARDCADE's caps.
import { TUNING } from '../../tuning.js?v=50';

const T = TUNING;
const lerp = (a, b, t) => a + (b - a) * t;

export function waveScale(wave) {
  const S = T.waves.scale, ramp = Math.min(wave, S.knee) - 1, post = Math.max(0, wave - S.knee);
  const ease = wave < S.speed.easeUntil ? (S.speed.easeUntil - wave) * S.speed.ease : 0;
  return {
    speedMult: Math.min(S.speed.base + S.speed.ramp * ramp + S.speed.post * post - ease, S.speed.max),
    intervalMult: Math.max(1 - S.interval.ramp * ramp - S.interval.post * post, S.interval.min),
  };
}

export default {
  create(w) { return { spawnCd: T.director.firstSpawn }; },
  step(w, dt, api) {
    const N = T.director, d = w.dir, f = Math.min(1, w.time / N.ramp);
    w.wave = 1 + Math.floor(w.time / N.secondsPerWave);
    if ((d.spawnCd -= dt) > 0) return;
    const alive = w.gels.filter((g) => g.alive).length;
    const max = Math.round(lerp(N.maxAlive[0], N.maxAlive[1], f));
    d.spawnCd = lerp(N.spawnEvery[0], N.spawnEvery[1], f) * w.rng.range(0.8, 1.2);
    if (alive >= max) return;
    const pool = T.waves.pool.filter(([, min]) => min <= w.wave);
    const [kind] = pool[w.rng.int(0, pool.length - 1)];
    const group = Math.min(max - alive, w.rng.int(N.groupOf[0], Math.round(lerp(N.groupOf[0], N.groupOf[1], f))));
    const sc = waveScale(w.wave);
    for (let i = 0; i < group; i++) {
      const p = api.ringPoint(w, w.rng.range(0, Math.PI * 2), N.ring, N.clearOfHero);
      api.spawn(w, kind, p.x, p.z, { speedMult: sc.speedMult, intervalMult: sc.intervalMult });
    }
  },
};

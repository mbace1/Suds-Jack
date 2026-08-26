import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locks = JSON.parse(readFileSync(path.join(ROOT, 'animation-locks.json'), 'utf8'));
const run = locks.approvedFamilies.run;
const source = readFileSync(path.join(ROOT, run.dataPath), 'utf8');
const digest = createHash('sha256').update(source).digest('hex');
if (digest !== run.sha256) throw new Error(`Locked run data changed: ${digest}`);

const data = await import(pathToFileURL(path.join(ROOT, run.dataPath)).href);
const lock = await import(pathToFileURL(path.join(ROOT, 'js/run-lock.js')).href);
if (!Array.isArray(data.default) || data.default.length !== run.frameCount) throw new Error('Locked run frame count changed');
if (lock.runSignature() !== run.runtimeSignature) throw new Error('Locked run signature changed');
if (lock.RUN_SPEED !== run.speed || lock.START_N !== run.startFrames || JSON.stringify(lock.RUN_HOLD) !== JSON.stringify(run.holds)) throw new Error('Locked run timing changed');

const hero = readFileSync(path.join(ROOT, 'js/hero.js'), 'utf8');
const sprite = readFileSync(path.join(ROOT, 'js/sprite.js'), 'utf8');
if (!hero.includes("speed: RUN_SPEED") || !hero.includes("frameFromHolds(this.f, RUN_HOLD, true)")) throw new Error('Playable hero is not using the locked run timing');
if (!sprite.includes("lockedRun: true") || !sprite.includes("lockedFrame(j)")) throw new Error('Playable renderer is not using the locked run pixels');
console.log(`animation locks ok — run ${run.runtimeSignature}, ${run.frameCount} frames`);

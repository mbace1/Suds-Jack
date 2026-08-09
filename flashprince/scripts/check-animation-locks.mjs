import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locks = JSON.parse(readFileSync(path.join(ROOT, 'animation-locks.json'), 'utf8'));
const run = locks.approvedFamilies.run;
const runPath = path.join(ROOT, run.dataPath);
const source = readFileSync(runPath, 'utf8');
const digest = createHash('sha256').update(source).digest('hex');
if (digest !== run.sha256) throw new Error(`Locked run data changed: ${digest}`);

const baselinePath = path.join(ROOT, run.baselineRuntimePath);
const baseline = readFileSync(baselinePath, 'utf8');
const baselineDigest = createHash('sha256').update(baseline).digest('hex');
if (baselineDigest !== run.baselineRuntimeSha256) {
  throw new Error(`v18 run baseline changed: ${baselineDigest}`);
}

const module = await import(pathToFileURL(runPath).href);
if (!Array.isArray(module.default) || module.default.length !== run.frameCount) {
  throw new Error(`Locked run frame count changed: ${module.default?.length}`);
}

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const entry = html.match(/src="js\/(sprite-proof-v\d+\.js)\?v=\d+"/)?.[1];
if (!entry) throw new Error('Cannot resolve the playable Flash Prince entrypoint');
const runtime = readFileSync(path.join(ROOT, 'js', entry), 'utf8');
const compact = runtime.replace(/\s+/g, '');
const holds = JSON.stringify(run.holds);
const required = [
  `importRUNfrom'./run-v15-data.js';`,
  `constSTART_N=${run.startFrames};`,
  `constRUN_HOLD=${holds};`,
  `constRUN_SPEED=${run.speed};`,
  `constLOCKED_RUN_SIGNATURE='${run.runtimeSignature}';`,
  `constsourceFacesRight=this.state!=='run'&&this.state!=='start';`,
];
for (const invariant of required) {
  if (!compact.includes(invariant)) throw new Error(`Playable run invariant missing: ${invariant}`);
}

console.log(`animation locks ok — run ${run.runtimeSignature}, ${run.frameCount} frames`);

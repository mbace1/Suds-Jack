import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const locks = JSON.parse(readFileSync(path.join(ROOT, 'animation-locks.json'), 'utf8'));
const run = locks.approvedFamilies.run;
const runPath = path.join(ROOT, run.dataPath);
const module = await import(pathToFileURL(runPath).href);
const runFrames = module[run.exportName || 'default'];
const startFrames = module[run.startExportName];
if (!Array.isArray(runFrames) || runFrames.length !== run.frameCount) {
  throw new Error(`Locked run frame count changed: ${runFrames?.length}`);
}
if (!Array.isArray(startFrames) || startFrames.length < run.startFrames) {
  throw new Error(`Locked run-start frame count changed: ${startFrames?.length}`);
}
const digestSource = run.digestMode === 'selected-exports-json'
  ? JSON.stringify({ run: runFrames, start: startFrames.slice(0, run.startFrames) })
  : readFileSync(runPath, 'utf8');
const digest = createHash('sha256').update(digestSource).digest('hex');
if (digest !== run.sha256) throw new Error(`Locked run artwork changed: ${digest}`);

const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const entry = html.match(/src="js\/(sprite-proof-v\d+\.js)\?v=\d+"/)?.[1];
if (!entry) throw new Error('Cannot resolve the playable Flash Prince entrypoint');
const runtime = readFileSync(path.join(ROOT, 'js', entry), 'utf8');
const compact = runtime.replace(/\s+/g, '');
const holds = JSON.stringify(run.holds);
const dataFile = path.basename(run.dataPath);
const required = [
  `from'./${dataFile}';`,
  `IDLE,START,RUN,STOP`,
  `constSTART_N=${run.startFrames};`,
  `constRUN_HOLD=${holds};`,
  `constRUN_SPEED=${run.speed};`,
  `constLOCKED_RUN_SIGNATURE='${run.runtimeSignature}';`,
  `returnSTART[Math.min(this.frame,START_N-1)];`,
  `constsourceFacesRight=${run.sourceFacesRight};`,
];
for (const invariant of required) {
  if (!compact.includes(invariant)) throw new Error(`Playable run invariant missing: ${invariant}`);
}

console.log(`animation locks ok — run ${run.runtimeSignature}, ${run.frameCount} frames`);

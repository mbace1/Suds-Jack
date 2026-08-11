// The asset pipeline's front door.
//
//   node scripts/assets.mjs status            what exists, what is missing, what drifted
//   node scripts/assets.mjs gen [--only x]    make what is missing (costs money)
//   node scripts/assets.mjs gen --dry         say what it WOULD make, call nothing
//   node scripts/assets.mjs index             rebuild assets/index.json from disk
//   node scripts/assets.mjs list              the asset URLs, for a worker precache
//   node scripts/assets.mjs prune             delete outputs no live spec claims
//
// Everything except `gen` runs with no API key and no network. That is on
// purpose and it is most of the value: the manifest is the design document,
// and you should be able to read the state of the whole batch — including
// which prompts have drifted from their bytes — without spending a cent or
// waiting on a mesh. `gen` is the only command that reaches out, it only ever
// makes what is MISSING, and `--dry` tells you the bill first.
//
// Keys, when you do run it:
//   GEMINI_API_KEY   (or GOOGLE_API_KEY)   2D — Nano Banana
//   MESHY_API_KEY                          3D — Meshy

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveAll } from './lib/assets-core.mjs';
import * as banana from './lib/nano-banana.mjs';
import * as meshy from './lib/meshy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ASSETS = path.join(ROOT, 'assets');
const OUT = path.join(ASSETS, 'out');
const INDEX = path.join(ASSETS, 'index.json');

const argv = process.argv.slice(2);
const cmd = argv.find(a => !a.startsWith('-')) ?? 'status';
const flag = f => argv.includes(f);
const opt = f => { const i = argv.indexOf(f); return i < 0 ? null : argv[i + 1]; };

const manifest = await import(pathToFileURL(path.join(ASSETS, 'manifest.mjs')).href);
const specs = resolveAll(manifest);

const outPath = spec => path.join(OUT, spec.file);
const have = spec => fs.existsSync(outPath(spec));

// A spec is STALE when an output for its id exists at some other hash — the
// prompt moved and the bytes did not follow. That is a different state from
// missing, and it is the one worth showing loudly: missing art is obvious the
// moment you look at the game, drifted art looks completely fine.
function staleFiles(spec) {
  const dir = path.join(OUT, spec.kind === '3d' ? '3d' : '2d');
  if (!fs.existsSync(dir)) return [];
  const stem = spec.id.replace(/\//g, '-');
  return fs.readdirSync(dir)
    .filter(f => f.startsWith(stem + '.') && f !== path.basename(spec.file));
}

const C = { dim: s => `\x1b[2m${s}\x1b[0m`, ok: s => `\x1b[32m${s}\x1b[0m`, warn: s => `\x1b[33m${s}\x1b[0m`, bad: s => `\x1b[31m${s}\x1b[0m` };

function stateOf(spec) {
  if (have(spec)) return 'ok';
  return staleFiles(spec).length ? 'stale' : 'missing';
}

function cmdStatus() {
  const width = Math.max(...specs.map(s => s.id.length)) + 2;
  let missing = 0, stale = 0;
  let game = null;
  // resolveAll returns 2D-then-3D (a mesh cannot be hashed before its plate),
  // so display has to regroup or a game with both appears twice.
  const order = [...new Set(specs.map(s => s.game))];
  const shown = [...specs].sort((a, b) => order.indexOf(a.game) - order.indexOf(b.game));
  for (const s of shown) {
    if (s.game !== game) { game = s.game; console.log(`\n${C.dim(game)}`); }
    const st = stateOf(s);
    if (st === 'missing') missing++;
    if (st === 'stale') stale++;
    const badge = st === 'ok' ? C.ok('ok     ') : st === 'stale' ? C.warn('stale  ') : C.bad('missing');
    console.log(`  ${badge} ${s.id.padEnd(width)} ${C.dim(`${s.kind} ${s.use ?? ''} ${s.hash}`)}`);
  }
  const orphans = orphanFiles();
  console.log(`\n${specs.length} assets — ${specs.length - missing - stale} ok, ${missing} missing, ${stale} stale${orphans.length ? `, ${orphans.length} orphaned files` : ''}`);
  if (missing || stale) console.log(C.dim('run `node scripts/assets.mjs gen --dry` to see what that would generate'));
  if (orphans.length) console.log(C.dim('run `node scripts/assets.mjs prune` to delete outputs no spec claims'));
}

function orphanFiles() {
  const want = new Set(specs.map(s => s.file));
  const found = [];
  for (const sub of ['2d', '3d']) {
    const dir = path.join(OUT, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('.')) continue;
      if (!want.has(`${sub}/${f}`)) found.push(`${sub}/${f}`);
    }
  }
  return found;
}

// index.json is what the BROWSER reads — id → file, so no runtime ever has to
// know how a hash is computed. Same shape of idea as hub/versions.json: a
// generated file the page fetches, rather than every consumer re-deriving it.
function writeIndex() {
  const entries = {};
  for (const s of specs) {
    if (!have(s)) continue;
    entries[s.id] = { file: s.file, kind: s.kind, use: s.use ?? null, game: s.game, hash: s.hash };
  }
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.writeFileSync(INDEX, JSON.stringify({ generated: entries }, null, 2) + '\n');
  return Object.keys(entries).length;
}

function cmdList() {
  for (const s of specs) if (have(s)) console.log(`assets/out/${s.file}`);
}

function cmdPrune() {
  const orphans = orphanFiles();
  for (const f of orphans) {
    fs.unlinkSync(path.join(OUT, f));
    console.log(`removed ${f}`);
  }
  console.log(orphans.length ? `pruned ${orphans.length}` : 'nothing to prune');
  writeIndex();
}

async function cmdGen() {
  const only = opt('--only');
  const dry = flag('--dry');
  const force = flag('--force');
  const todo = specs.filter(s => (force || !have(s)) && (!only || s.id.includes(only)));

  if (!todo.length) { console.log('nothing to generate — everything on disk matches the manifest'); return; }

  const n2 = todo.filter(s => s.kind === '2d').length;
  const n3 = todo.filter(s => s.kind === '3d').length;
  console.log(`${todo.length} to generate — ${n2} image${n2 === 1 ? '' : 's'} (nano banana), ${n3} mesh${n3 === 1 ? '' : 'es'} (meshy)`);
  for (const s of todo) console.log(`  ${s.kind}  ${s.id}  ${C.dim(s.file)}`);
  if (dry) { console.log('\n--dry: called nothing'); return; }

  const gKey = banana.keyFrom();
  const mKey = meshy.keyFrom();
  if (n2 && !gKey) throw new Error('2D assets to generate but no GEMINI_API_KEY set');
  if (n3 && !mKey) throw new Error('3D assets to generate but no MESHY_API_KEY set');

  fs.mkdirSync(path.join(OUT, '2d'), { recursive: true });
  fs.mkdirSync(path.join(OUT, '3d'), { recursive: true });

  // 2D first, always: a mesh is cut from a plate, and on a fresh checkout the
  // plate it names may be one of the images in this very batch.
  let made = 0, failed = 0;
  for (const s of todo.filter(x => x.kind === '2d')) {
    process.stdout.write(`  ${s.id} … `);
    try {
      const { bytes } = await banana.generateImage({
        prompt: s.resolved.prompt, model: s.resolved.model, aspect: s.resolved.aspect, apiKey: gKey,
      });
      fs.writeFileSync(outPath(s), bytes);
      console.log(C.ok(`${(bytes.length / 1024).toFixed(0)}kb`));
      made++;
    } catch (e) { console.log(C.bad('failed')); console.log(`      ${e.message.replace(/\n/g, '\n      ')}`); failed++; }
  }

  for (const s of todo.filter(x => x.kind === '3d')) {
    const parent = specs.find(p => p.id === s.resolved.from);
    if (!have(parent)) { console.log(`  ${s.id} ${C.bad('skipped')} — its plate ${parent.id} is not on disk`); failed++; continue; }
    process.stdout.write(`  ${s.id} … `);
    try {
      const { glb } = await meshy.imageTo3D({
        image: { bytes: fs.readFileSync(outPath(parent)), mime: 'image/png' },
        model: s.resolved.model, topology: s.resolved.topology,
        targetPolycount: s.resolved.targetPolycount, texture: s.resolved.texture,
        symmetry: s.resolved.symmetry, apiKey: mKey,
        onProgress: (p, st) => process.stdout.write(`\r  ${s.id} … ${st} ${p}%   `),
      });
      fs.writeFileSync(outPath(s), glb);
      console.log(`\r  ${s.id} … ${C.ok(`${(glb.length / 1024).toFixed(0)}kb`)}        `);
      made++;
    } catch (e) { console.log(C.bad('failed')); console.log(`      ${e.message.replace(/\n/g, '\n      ')}`); failed++; }
  }

  const n = writeIndex();
  console.log(`\n${made} generated, ${failed} failed — assets/index.json now lists ${n}`);
  if (failed) process.exitCode = 1;
}

try {
  if (cmd === 'status') cmdStatus();
  else if (cmd === 'gen') await cmdGen();
  else if (cmd === 'index') console.log(`assets/index.json lists ${writeIndex()}`);
  else if (cmd === 'list') cmdList();
  else if (cmd === 'prune') cmdPrune();
  else { console.error(`unknown command "${cmd}" — try status | gen | index | list | prune`); process.exitCode = 2; }
} catch (e) {
  console.error(C.bad(`assets: ${e.message}`));
  process.exitCode = 1;
}

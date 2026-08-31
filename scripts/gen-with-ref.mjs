// A real reference image, attached to a manifest asset's prompt.
//
//   node scripts/gen-with-ref.mjs <asset-id> <ref-image.png> [out.png]
//
// WHY THIS EXISTS. `assets.mjs`'s own `ref` field only chains to another
// asset THIS PIPELINE ALREADY GENERATED — it resolves an id through the
// manifest (`assets-core.mjs`'s `resolveAll`), so it cannot point at an
// arbitrary local file. That is right for "draw ten poses of the body we
// already generated," and wrong for the case that actually came up first:
// an owner-supplied casting sheet, made outside this pipeline entirely, that
// a batch needs to match. Before this script, matching one meant hand-writing
// a disposable one-off — which is what happened for TURF's first real use of
// this (see `turf/art-src/sprites/README.md`) — and a disposable script is a
// script nobody can run the same way twice.
//
// WHAT IT DOES. Resolves the asset's prompt exactly the way `assets.mjs gen`
// would (same `resolveAll`, so the style block + per-asset prompt compose
// identically), then calls the same `generateImage` `assets.mjs` calls
// internally — but with the reference image's bytes attached as an input
// image, which turns the call into an edit-style generation
// (`nano-banana.mjs`'s own doc comment: "An input image makes this an EDIT
// rather than a generation"). The prompt itself has to ask the model to copy
// only the reference's TECHNIQUE and not its specific character/pose/
// background — this script does not add that instruction for you, because
// what to copy is a content decision that belongs in the manifest prompt,
// not hidden in a tool flag.
//
// WHAT IT DOES NOT DO. It does not touch `assets/index.json` or place the
// output at its content-hashed filename — `assets.mjs index` does that from
// whatever is already on disk, so run this, then move the output to
// `assets/out/2d/<id-with-slashes-as-dashes>.<hash>.png` (the hash `assets.mjs
// status --only <game>` reports for that asset), then `node scripts/assets.mjs
// index`. Kept separate rather than folded in because a script that both
// calls a paid API AND rewrites the index is a script you cannot safely dry-
// run — `assets.mjs gen --dry` earns its keep by calling nothing, and this
// tool should not quietly lose that property for its one caller.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveAll } from './lib/assets-core.mjs';
import * as banana from './lib/nano-banana.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const [, , id, refPath, outArg] = process.argv;
if (!id || !refPath) {
  console.log(`node scripts/gen-with-ref.mjs <asset-id> <ref-image.png> [out.png]

  Resolves <asset-id>'s composed prompt from assets/manifest.mjs (style block
  + the asset's own prompt, identical to what "gen" would send), attaches
  <ref-image.png> as an input image, and writes the result to [out.png] or
  ./<id-with-slashes-as-dashes>.png in the current directory.

  Does NOT write assets/index.json or place the file at its content-hashed
  name — see the file's own header comment for why, and the two follow-up
  commands to run after.`);
  process.exit(1);
}

const key = banana.keyFrom(process.env);
if (!key) { console.log('no GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment'); process.exit(1); }

const manifest = await import(pathToFileURL(path.join(ROOT, 'assets', 'manifest.mjs')).href);
const specs = resolveAll(manifest);
const spec = specs.find((s) => s.id === id);
if (!spec) { console.log(`no such asset id in the manifest: ${id}`); process.exit(1); }
if (spec.kind !== '2d') { console.log(`${id} is a ${spec.kind} asset — this tool is 2D-only (Nano Banana takes the image, Meshy takes the model)`); process.exit(1); }

const refBytes = readFileSync(refPath);
const out = outArg ?? path.join(process.cwd(), `${id.replace(/\//g, '-')}.png`);

console.log(`${id} (+ ${path.basename(refPath)} as reference) … `);
const { bytes } = await banana.generateImage({
  prompt: spec.resolved.prompt,
  model: spec.resolved.model,
  aspect: spec.resolved.aspect,
  apiKey: key,
  image: { bytes: refBytes, mime: 'image/png' },
});
writeFileSync(out, bytes);
console.log(`→ ${out}  ${(bytes.length / 1024).toFixed(0)}kb`);
console.log(`\nnext: move it to assets/out/2d/${id.replace(/\//g, '-')}.<hash>.png`
  + ` (the hash "assets.mjs status" reports) then run "node scripts/assets.mjs index"`);

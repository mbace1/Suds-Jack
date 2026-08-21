// The asset pipeline's shared middle: what an asset is NAMED, and when it is STALE.
//
// Everything else in this pipeline (the two API clients, the CLI, the browser
// loader, the gate) is downstream of the two functions here. They are in their
// own file because the CLI and the test must agree about them exactly — a
// generator and a checker that each decide a filename for themselves is the
// same bug this repo has paid for four times already: a number in one file
// disagreeing with a number in another.
//
// THE RULE: an asset's filename carries the hash of the SPEC THAT MADE IT.
//
//   globbo.a1b2c3d4.png
//         ^^^^^^^^ sha256(prompt + model + every param), first 8
//
// That is the same job `?v=N` does for modules, minus the hand. Nobody bumps
// it; you cannot forget to bump it; you cannot bump it without changing the
// thing it describes. Edit one word of a prompt and the output lands at a new
// URL, so a cache-first service worker physically cannot serve the old art,
// and `status` can tell you a spec has drifted from its bytes without calling
// an API or diffing an image. The prompts are the source, the bytes are the
// build output, and the hash is the link between them.

import { createHash } from 'node:crypto';

// A spec's identity is everything that could change the pixels. Order matters
// for a hash, so this walks a FIXED key list rather than JSON.stringify(spec):
// stringify follows insertion order, so re-ordering two keys in the manifest
// while editing would silently restage every asset in the batch.
// `ref` is deliberately NOT in this list. It is carried by `parentHash` below
// instead — which is present only when a spec actually has a reference, so
// adding the feature does not restage the twenty assets that do not use it.
// Putting the field in here restaged the entire 2D catalogue on the first run,
// which is exactly the drift the comment above is about.
const HASHED_2D = ['prompt', 'negative', 'model', 'aspect', 'seed'];
const HASHED_3D = ['from', 'model', 'topology', 'targetPolycount', 'texture', 'symmetry'];

export function specHash(spec, resolved) {
  const keys = spec.kind === '3d' ? HASHED_3D : HASHED_2D;
  const h = createHash('sha256');
  h.update(spec.kind + '\0' + spec.id + '\0');
  for (const k of keys) h.update(k + '=' + String(resolved[k] ?? '') + '\0');
  // A 3D asset is lifted from a 2D one, so it inherits its parent's identity:
  // regenerate the source image and the mesh cut from it is stale too, even
  // though not one field of the 3D spec changed. A 2D asset drawn FROM another
  // 2D asset (`ref`) inherits it for exactly the same reason — redraw the base
  // body and the ten poses built on it are no longer poses of that body.
  if (resolved.parentHash) h.update('parent=' + resolved.parentHash);
  return h.digest('hex').slice(0, 8);
}

// The house style lives with the pipeline, not with each prompt, so that
// "everything this workshop makes looks related" is one edit and not forty.
// A spec's own words are appended to its game's block, never the other way
// round — the subject is what varies and it should read last, closest to the
// model's attention.
export function composePrompt(spec, styles) {
  if (spec.kind === '3d') return null;             // meshy is fed an image, not words
  const style = styles[spec.style] ?? '';
  return [style.trim(), spec.prompt.trim()].filter(Boolean).join('\n\n');
}

export function fileFor(spec, hash) {
  const ext = spec.kind === '3d' ? 'glb' : 'png';
  const dir = spec.kind === '3d' ? '3d' : '2d';
  return `${dir}/${spec.id.replace(/\//g, '-')}.${hash}.${ext}`;
}

// Resolve the whole manifest in dependency order: a 3D spec cannot be hashed
// until its parent has been, and a missing parent is a manifest bug rather
// than something to discover halfway through a paid API run.
export function resolveAll(manifest) {
  const { ASSETS, STYLES, DEFAULTS } = manifest;
  const byId = new Map();
  const out = [];

  for (const spec of ASSETS) {
    if (byId.has(spec.id)) throw new Error(`duplicate asset id: ${spec.id}`);
    byId.set(spec.id, null);
  }

  // 2D first — every 3D asset hangs off one.
  for (const pass of ['2d', '3d']) {
    for (const spec of ASSETS) {
      if ((spec.kind ?? '2d') !== pass) continue;
      const kind = spec.kind ?? '2d';
      let resolved;

      if (kind === '2d') {
        // `ref` attaches another 2D asset as a REFERENCE IMAGE. It is the one
        // way a character survives a re-pose (NANO_BANANA.md §1): generate the
        // group's anchor first — the base body, the first arena, the night map
        // — and hand it to everything else in that group, because the model
        // drifts on palette and proportion between runs and ten poses drawn
        // independently are ten different men.
        let refEntry;
        if (spec.ref) {
          refEntry = byId.get(spec.ref);
          if (refEntry === undefined) throw new Error(`${spec.id}: ref points at unknown asset "${spec.ref}"`);
          if (refEntry === null) throw new Error(`${spec.id}: ref "${spec.ref}" is not resolved yet — a reference must appear EARLIER in ASSETS than the assets that use it, since the manifest is walked once in order`);
        }
        resolved = {
          prompt: composePrompt({ ...spec, kind }, STYLES),
          negative: spec.negative ?? '',
          model: spec.model ?? DEFAULTS.imageModel,
          aspect: spec.aspect ?? DEFAULTS.aspect,
          seed: spec.seed ?? '',
          ref: spec.ref ?? '',
          parentHash: refEntry?.hash,
        };
      } else {
        const parent = byId.get(spec.from);
        if (parent === undefined) {
          throw new Error(`${spec.id}: 3d asset points at unknown parent "${spec.from}"`);
        }
        if (parent === null) throw new Error(`${spec.id}: parent "${spec.from}" is not a 2d asset`);
        resolved = {
          from: spec.from,
          model: spec.model ?? DEFAULTS.meshModel,
          topology: spec.topology ?? DEFAULTS.topology,
          targetPolycount: spec.targetPolycount ?? DEFAULTS.targetPolycount,
          texture: spec.texture ?? true,
          symmetry: spec.symmetry ?? 'auto',
          parentHash: parent.hash,
        };
      }

      const entry = { ...spec, kind, resolved };
      entry.hash = specHash(entry, resolved);
      entry.file = fileFor(entry, entry.hash);
      byId.set(spec.id, entry);
      out.push(entry);
    }
  }
  return out;
}

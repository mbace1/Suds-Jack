// The whole chain, one command.
//   node make.mjs <clip> <identity.txt> <reference.png> <outDir>
//
//   clip = move | move12 | melee | ranged | react | idle
//
// This exists to answer one question: is the recipe stable enough to wrap in an
// app? Everything below is what a UI would call. The parts that still need an
// EYE are marked, and they are the reason this is a driver and not a product:
// no gate here can tell you a pose is good, only that it is distinct, in scale
// and on the ground. The chain ends in a GIF because a person has to watch it.
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CUT = resolve(HERE, '../../../kindling/tools/cut.mjs');
const NODE_PATH = process.env.NODE_PATH || '';

// Each clip declares its phases, its builder, the canvas it wants, how it is
// normalised, and which gate reads it. Those four choices are the entire body
// of knowledge in this toolchain — everything else is plumbing.
const CLIPS = {
  move:    { build: 'build.mjs',        phases: ['contact-left', 'pass-right', 'contact-right', 'pass-left'],
             aspect: () => '2:3', norm: [],                gate: 'phase', region: 'lower' },
  move12:  { build: 'build12.mjs',      phases: ['left_contact','left_compression','left_push','left_pass','left_reach','left_precontact','right_contact','right_compression','right_push','right_pass','right_reach','right_precontact'],
             aspect: () => '2:3', norm: [],                gate: 'phase', region: 'lower' },
  melee:   { build: 'build-melee.mjs',  phases: ['ready', 'anticipation', 'contact', 'followthrough', 'recover'],
             aspect: () => '2:3', norm: ['--origin-only'], gate: 'reach',  mirrorRef: true },
  ranged:  { build: 'build-ranged.mjs', phases: ['ready', 'raise', 'aim', 'fire', 'recover'],
             aspect: () => '2:3', norm: ['--origin-only'], gate: 'reach',  mirrorRef: true },
  // the down phases want a square canvas: a 2:3 portrait frame fights a
  // horizontal pose and returns a figure standing on its head
  react:   { build: 'build-react.mjs',  phases: ['impact','recoil','catch','stagger','buckle','fall','ko_impact','settled'],
             aspect: p => ['fall','ko_impact','settled'].includes(p) ? '1:1' : '2:3',
             norm: ['--origin-only'], gate: 'phase', region: 'full', gateArgs: ['--no-scale', '--no-rhythm'] },
  // one generation, then the breath is computed — see breathe.cjs for why
  idle:    { build: 'build-idle.mjs',   phases: ['settle'], aspect: () => '2:3', norm: [], gate: 'none', breathe: true },
};

const rear = process.argv.includes('--rear');
const [, , clipName, identity, refIn, outDir] = process.argv.filter(a => a !== '--rear');
const clip = CLIPS[clipName];
if (!clip || !identity || !refIn || !outDir) {
  console.log(`usage: node make.mjs <${Object.keys(CLIPS).join('|')}> <identity.txt> <reference.png> <outDir> [--rear]`);
  process.exit(1);
}
const run = (cmd, args, env = {}) => execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, NODE_PATH, ...env } });
const node = (script, args, env) => run(process.execPath, [resolve(HERE, script), ...args], env);

const raw = join(outDir, '_raw'), cut = join(outDir, '_cut');
for (const d of [outDir, raw, cut]) mkdirSync(d, { recursive: true });

// An attack clip takes a MIRRORED reference. Facing is set by the reference
// image, not by the prompt: a weapon carried on the character's screen-left
// drags the whole body round with it and no facing lock in words beats it.
// --rear expects a REAR reference image. Rear is a separate generation, never a
// flipped front (Bible 15), and that applies to the reference as much as to the
// frames — a flipped front reference shows a face that must not be visible.
let ref = refIn;
if (clip.mirrorRef) {
  ref = join(outDir, '_ref-mirrored.png');
  if (!existsSync(ref)) node('flip.cjs', [refIn, ref]);
}

clip.phases.forEach((p, i) => {
  const prompt = join(raw, `${p}.txt`);
  execFileSync(process.execPath, [resolve(HERE, clip.build), identity, p, ...(rear ? ['--rear'] : [])],
    { stdio: ['ignore', openSync(prompt, 'w'), 'inherit'] });
  node('gen.mjs', [prompt, join(raw, `${p}.png`), ref], { ASPECT: clip.aspect(p) });
  run(process.execPath, [CUT, 'key', join(raw, `${p}.png`), join(raw, `${p}_k.png`)]);
  run(process.execPath, [CUT, 'fit', join(raw, `${p}_k.png`),
    join(cut, `${String(i + 1).padStart(2, '0')}_${p}.png`), '192x288', '--no-quantise']);
});

const frames = readdirSync(cut).filter(f => f.endsWith('.png')).sort();

if (clip.breathe) {
  node('breathe.cjs', [join(cut, frames[0]), outDir, '2', '8']);
} else {
  // register first (search-based scale, no anchor feature), then normalise for
  // the ground line. normalise's own rescale is skipped — register has already
  // done that job without a proxy that can break.
  node('register.cjs', [cut, join(outDir, '_reg'), ...frames]);
  node('normalise.cjs', [join(outDir, '_reg'), outDir, ...frames, '--origin-only']);
  if (clip.gate === 'reach') {
    node('reach.cjs', [outDir, ...frames]);
    // an attack clip still needs its scale and ground line checked, and
    // --no-scale is right here for the same reason --origin-only is: the
    // weapon swings through the top-of-ink band and is measured as head
    node('drift.cjs', [outDir, ...frames, '--no-scale', '--no-rhythm']);
  }
  if (clip.gate === 'phase') node('drift.cjs', [outDir, ...frames, ...(clip.gateArgs || [])]);
}

// files beginning with _ are working files (the mirrored reference, previews),
// not frames — sweeping them into the GIF put the reference in the animation
const out = readdirSync(outDir).filter(f => f.endsWith('.png') && !f.startsWith('_')).sort();
node('anim.cjs', [join(outDir, '_preview.gif'), outDir, '2', '120', ...out]);
console.log(`\nWATCH ${join(outDir, '_preview.gif')} — no gate above can tell you a pose is GOOD.`);

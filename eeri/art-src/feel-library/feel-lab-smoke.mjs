import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUDIO_CUES } from './audio-cues.js';
import { VFX_CUES } from './vfx-cues.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(HERE, name), 'utf8');
const html = read('feel-lab.html');
const js = read('feel-lab.js');
const css = read('feel-lab.css');

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log('ok  ', name); } else { fail++; console.log('FAIL', name); } };

const audioNames = Object.keys(AUDIO_CUES).sort();
const vfxNames = Object.keys(VFX_CUES).sort();
ok('audio and VFX cue names still match', JSON.stringify(audioNames) === JSON.stringify(vfxNames));
ok('every authored cue is exposed by the lab', audioNames.every((name) => js.includes(`'${name}'`)));
ok('lab imports the source recipes rather than copying them', js.includes("from './audio-cues.js'") && js.includes("from './vfx-cues.js'"));
ok('lab has audio and VFX independent toggles', html.includes('id="audioOn"') && html.includes('id="vfxOn"'));
ok('lab exposes reduced-motion auditioning', html.includes('id="reduced"') && js.includes("policy==='single'"));
ok('lab shows the shared contact timeline', html.includes('contact = 0 ms') && js.includes('renderTimeline'));
ok('machine idle is the only repeating audition cue', js.includes("name==='machine_idle'") && !js.includes("name==='machine_start' && idleTimer"));
ok('the preview is touch-friendly', html.includes('viewport-fit=cover') && css.includes('min-height:44px'));
ok('nothing in the lab references shipping Eeri modules', !/\.\.\/\.\.\/js\//.test(js));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

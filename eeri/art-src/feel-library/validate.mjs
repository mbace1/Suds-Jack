import { AUDIO_VOICES, AUDIO_CUES, cueDurationMs, validateAudioLibrary } from './audio-cues.js';
import { VFX_CUES, cueEndMs, validateVfxLibrary } from './vfx-cues.js';

let pass=0, fail=0;
const ok=(name,cond,note='')=>{ if(cond){pass++;console.log('ok  ',name);} else {fail++;console.log('FAIL',name,note);} };

ok('audio library validates', validateAudioLibrary().length===0, validateAudioLibrary().join(' | '));
ok('vfx library validates', validateVfxLibrary().length===0, validateVfxLibrary().join(' | '));

const aKeys=Object.keys(AUDIO_CUES), vKeys=Object.keys(VFX_CUES);
ok('every audio cue has a matching visual timing entry', aKeys.every(k=>VFX_CUES[k]), aKeys.filter(k=>!VFX_CUES[k]).join(','));
ok('every vfx cue has matching audio', vKeys.every(k=>AUDIO_CUES[k]), vKeys.filter(k=>!AUDIO_CUES[k]).join(','));
ok('at least 20 authored gameplay cues', aKeys.length>=20, String(aKeys.length));
ok('material voices stay below phone-shrill range', Object.values(AUDIO_VOICES).every(v=>[v.f0,v.f1,v.f,...(v.notes||[])].filter(Number.isFinite).every(f=>f<=3500)));

for (const name of ['stomp','dig_hit','girder_place','machine_start','pipe_enter','robot_notice','clear']) {
  const a0=Math.min(...AUDIO_CUES[name].layers.map(l=>l.at));
  const v0=VFX_CUES[name].stages.length ? Math.min(...VFX_CUES[name].stages.map(s=>s.at)) : 0;
  ok(`${name} audio and vfx share contact frame`, a0===0 && v0===0);
}

ok('jump stays tiny', cueDurationMs('jump')<180 && cueEndMs('jump')<300);
ok('clear is allowed to breathe', cueDurationMs('clear')>300 && cueEndMs('clear')>700);
ok('idle pulse is less busy than action cues', AUDIO_CUES.machine_idle.repeatMs >= 650);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);

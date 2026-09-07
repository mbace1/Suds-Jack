// EERI FEEL LIBRARY — procedural audio source recipes.
// Source-only. Nothing in the shipping game imports this file.
//
// Every voice uses the same primitives already supported by eeri/js/audio-fx.js:
// tone, noise and arp. Frequencies are Hz, times are seconds, cue offsets are ms.
// The intent is that an approved cue can be ported without inventing a new audio engine.

export const AUDIO_VOICES = {
  felt_pop:      { type:'tone', wave:'triangle', f0:520, f1:330, dur:0.085, gain:0.085, attack:0.003 },
  wood_tick:     { type:'tone', wave:'triangle', f0:760, f1:620, dur:0.055, gain:0.070, attack:0.002 },
  wood_body:     { type:'tone', wave:'triangle', f0:230, f1:145, dur:0.150, gain:0.125, attack:0.003 },
  card_thump:    { type:'noise', f:360, q:0.75, dur:0.120, gain:0.095, attack:0.002 },
  dirt_crunch:   { type:'noise', f:520, q:0.85, dur:0.210, gain:0.115, attack:0.002 },
  grit_tick:     { type:'noise', f:1450, q:1.7, dur:0.075, gain:0.060, attack:0.001 },
  brick_clack:   { type:'noise', f:1180, q:1.35, dur:0.145, gain:0.125, attack:0.001 },
  steel_tick:    { type:'tone', wave:'sine', f0:1180, f1:980, dur:0.150, gain:0.075, attack:0.002 },
  steel_ring:    { type:'tone', wave:'sine', f0:680, f1:590, dur:0.330, gain:0.090, attack:0.003 },
  ratchet:       { type:'tone', wave:'square', f0:930, f1:710, dur:0.055, gain:0.060, attack:0.001 },
  engine_pulse:  { type:'tone', wave:'triangle', f0:185, f1:150, dur:0.180, gain:0.090, attack:0.008 },
  motor_down:    { type:'tone', wave:'triangle', f0:330, f1:155, dur:0.260, gain:0.075, attack:0.006 },
  tube_pop:      { type:'tone', wave:'sine', f0:410, f1:235, dur:0.110, gain:0.090, attack:0.003 },
  air_whoosh:    { type:'noise', f:1050, q:0.6, dur:0.240, gain:0.070, attack:0.015 },
  splash:        { type:'noise', f:1350, q:0.85, dur:0.170, gain:0.080, attack:0.002 },
  notice_up:     { type:'tone', wave:'triangle', f0:470, f1:620, dur:0.135, gain:0.070, attack:0.004 },
  notice_answer: { type:'tone', wave:'triangle', f0:620, f1:740, dur:0.120, gain:0.060, attack:0.004 },
  bolt_ping:     { type:'tone', wave:'triangle', f0:880, f1:1320, dur:0.105, gain:0.105, attack:0.003 },
  warm_ping:     { type:'tone', wave:'triangle', f0:660, f1:880, dur:0.150, gain:0.090, attack:0.004 },
  tiny_back:     { type:'tone', wave:'triangle', f0:520, f1:420, dur:0.080, gain:0.055, attack:0.002 },
  golden_arp:    { type:'arp', wave:'triangle', notes:[880,1109,1320], step:0.070, dur:0.170, gain:0.105, attack:0.003 },
  tame_arp:      { type:'arp', wave:'triangle', notes:[523,659,784], step:0.075, dur:0.170, gain:0.090, attack:0.004 },
  clear_arp:     { type:'arp', wave:'triangle', notes:[523,659,784,1047], step:0.085, dur:0.190, gain:0.110, attack:0.004 },
};

// `class`: frequency tier. Frequent cues must be short and quiet enough to repeat.
// `cooldownMs`: minimum re-trigger interval; protects phones and small ears from chatter.
// `layers`: one or more procedural voices, deliberately offset so material reads in sequence.
export const AUDIO_CUES = {
  jump:          { class:'frequent', cooldownMs:90,  layers:[{at:0, voice:'felt_pop'},{at:24, voice:'wood_tick', gain:0.72}] },
  land_soft:     { class:'frequent', cooldownMs:110, layers:[{at:0, voice:'card_thump'},{at:26, voice:'felt_pop', gain:0.55}] },
  stomp:         { class:'action',   cooldownMs:120, layers:[{at:0, voice:'wood_body'},{at:28, voice:'steel_tick', gain:0.85},{at:44, voice:'card_thump', gain:0.75}] },
  hurt:          { class:'rare',     cooldownMs:300, layers:[{at:0, voice:'wood_body', gain:0.90},{at:55, voice:'tiny_back', gain:0.80}] },

  pickup:        { class:'frequent', cooldownMs:65,  layers:[{at:0, voice:'bolt_ping'},{at:35, voice:'steel_tick', gain:0.42}] },
  golden_pickup: { class:'rare',     cooldownMs:250, layers:[{at:0, voice:'golden_arp'},{at:75, voice:'steel_ring', gain:0.42}] },
  checkpoint:    { class:'rare',     cooldownMs:400, layers:[{at:0, voice:'warm_ping'},{at:85, voice:'notice_answer', gain:0.72}] },
  clear:         { class:'rare',     cooldownMs:800, layers:[{at:0, voice:'clear_arp'},{at:110, voice:'wood_tick', gain:0.70},{at:205, voice:'steel_ring', gain:0.55}] },

  dig_start:     { class:'action',   cooldownMs:180, layers:[{at:0, voice:'ratchet'},{at:48, voice:'dirt_crunch', gain:0.72}] },
  dig_hit:       { class:'action',   cooldownMs:125, layers:[{at:0, voice:'dirt_crunch'},{at:62, voice:'grit_tick', gain:0.78}] },
  brick_hit:     { class:'action',   cooldownMs:150, layers:[{at:0, voice:'brick_clack'},{at:24, voice:'grit_tick', gain:0.70}] },
  build_step:    { class:'action',   cooldownMs:150, layers:[{at:0, voice:'ratchet'},{at:72, voice:'wood_tick'}] },
  girder_place:  { class:'rare',     cooldownMs:450, layers:[{at:0, voice:'wood_body'},{at:34, voice:'steel_ring'},{at:118, voice:'card_thump', gain:0.62}] },

  machine_mount: { class:'rare',     cooldownMs:300, layers:[{at:0, voice:'wood_tick'},{at:72, voice:'warm_ping', gain:0.82}] },
  machine_start: { class:'rare',     cooldownMs:450, layers:[{at:0, voice:'ratchet'},{at:52, voice:'engine_pulse'},{at:168, voice:'engine_pulse', gain:0.72}] },
  machine_stop:  { class:'rare',     cooldownMs:350, layers:[{at:0, voice:'engine_pulse', gain:0.62},{at:92, voice:'motor_down'}] },
  machine_idle:  { class:'loop',     cooldownMs:620, repeatMs:720, jitterMs:55, layers:[{at:0, voice:'engine_pulse', gain:0.42},{at:118, voice:'wood_tick', gain:0.32}] },
  hoist_arrive:  { class:'action',   cooldownMs:350, layers:[{at:0, voice:'wood_body', gain:0.72},{at:58, voice:'steel_tick', gain:0.70}] },

  pipe_enter:    { class:'action',   cooldownMs:220, layers:[{at:0, voice:'tube_pop'},{at:52, voice:'air_whoosh'}] },
  pipe_exit:     { class:'action',   cooldownMs:220, layers:[{at:0, voice:'air_whoosh', gain:0.70},{at:74, voice:'tube_pop', gain:0.86}] },
  water_step:    { class:'frequent', cooldownMs:140, layers:[{at:0, voice:'splash', gain:0.72}] },

  robot_notice:  { class:'rare',     cooldownMs:500, layers:[{at:0, voice:'notice_up'},{at:118, voice:'notice_answer', gain:0.78}] },
  robot_tamed:   { class:'rare',     cooldownMs:500, layers:[{at:0, voice:'tame_arp'},{at:160, voice:'steel_tick', gain:0.46}] },

  ui_move:       { class:'ui',       cooldownMs:55,  layers:[{at:0, voice:'wood_tick', gain:0.48}] },
  ui_confirm:    { class:'ui',       cooldownMs:90,  layers:[{at:0, voice:'warm_ping', gain:0.62}] },
  ui_back:       { class:'ui',       cooldownMs:90,  layers:[{at:0, voice:'tiny_back', gain:0.62}] },
};

export const MACHINE_LOOP_POLICY = {
  principle: 'pulse, do not drone',
  // Continuous motor noise is tiring on a phone. A small periodic pulse reads as "alive"
  // while leaving space for the kid, the music and construction hits.
  machine_idle: { cue:'machine_idle', startDelayMs:180, stopFadeMs:140 },
};

export function voiceTailMs(v) {
  if (v.type === 'arp') return Math.round(((v.notes.length - 1) * v.step + v.dur) * 1000);
  return Math.round(v.dur * 1000);
}

export function cueDurationMs(name) {
  const cue = AUDIO_CUES[name];
  if (!cue) return 0;
  return Math.max(...cue.layers.map(l => l.at + voiceTailMs(AUDIO_VOICES[l.voice])));
}

export function validateAudioLibrary() {
  const bad = [];
  for (const [name,v] of Object.entries(AUDIO_VOICES)) {
    if (!['tone','noise','arp'].includes(v.type)) bad.push(`${name}: bad type`);
    if (!(v.gain > 0 && v.gain <= 0.16)) bad.push(`${name}: gain ${v.gain}`);
    if (!(v.dur > 0 && v.dur <= 0.5)) bad.push(`${name}: dur ${v.dur}`);
    const freqs = [v.f0,v.f1,v.f,...(v.notes||[])].filter(Number.isFinite);
    if (freqs.some(f => f <= 0 || f > 3500)) bad.push(`${name}: frequency outside 0..3500`);
  }
  for (const [name,c] of Object.entries(AUDIO_CUES)) {
    if (!c.layers?.length) bad.push(`${name}: no layers`);
    for (const l of c.layers || []) {
      if (!AUDIO_VOICES[l.voice]) bad.push(`${name}: missing voice ${l.voice}`);
      if (!(l.at >= 0 && l.at <= 350)) bad.push(`${name}: layer at ${l.at}`);
      if (l.gain != null && !(l.gain > 0 && l.gain <= 1)) bad.push(`${name}: gain scale ${l.gain}`);
    }
    const d = cueDurationMs(name);
    if (d > 900) bad.push(`${name}: cue ${d}ms too long`);
    if (c.class === 'frequent' && d > 300) bad.push(`${name}: frequent cue ${d}ms too long`);
  }
  return bad;
}

import { AUDIO_CUES, AUDIO_VOICES, cueDurationMs } from './audio-cues.js';
import { VFX_CUES, cueEndMs } from './vfx-cues.js';

const GROUPS = {
  'Movement': ['jump','land_soft','stomp','hurt'],
  'Rewards': ['pickup','golden_pickup','checkpoint','clear'],
  'Construction': ['dig_start','dig_hit','brick_hit','build_step','girder_place'],
  'Machines': ['machine_mount','machine_start','machine_stop','machine_idle','hoist_arrive'],
  'Traversal': ['pipe_enter','pipe_exit','water_step'],
  'Robots': ['robot_notice','robot_tamed'],
  'UI': ['ui_move','ui_confirm','ui_back'],
};

const PALETTE = {
  MACHINE:'#f5b83e', STEEL1:'#d8d5c5', STEEL2:'#908f86',
  EARTH1:'#9e7449', EARTH2:'#725039', WATER:'#78b9c7', WATER_DK:'#477d8b',
};

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const ctx2 = stage.getContext('2d');
const cueName = $('cueName');
const cueMeta = $('cueMeta');
const groups = $('groups');
const timeline = $('timeline');
const volume = $('volume');
const audioOn = $('audioOn');
const vfxOn = $('vfxOn');
const reduced = $('reduced');

let audioCtx = null;
let master = null;
let current = null;
let active = [];
let pending = [];
let lastFrame = performance.now();
let idleTimer = null;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    master = audioCtx.createGain();
    master.gain.value = Number(volume.value);
    master.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
volume.addEventListener('input', () => { if (master) master.gain.value = Number(volume.value); });

function env(g, gain, at, dur, attack=.004) {
  const t = audioCtx.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function tone(v, at, scale=1, frequency=null) {
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  const t=audioCtx.currentTime+at;
  o.type=v.wave || 'triangle';
  const f0=frequency ?? v.f0, f1=frequency ?? v.f1;
  o.frequency.setValueAtTime(f0,t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+v.dur);
  env(g,v.gain*scale,at,v.dur,v.attack);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+v.dur+.03);
}
function noise(v, at, scale=1) {
  const n=Math.max(1,Math.ceil(audioCtx.sampleRate*v.dur));
  const b=audioCtx.createBuffer(1,n,audioCtx.sampleRate);
  const d=b.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
  const src=audioCtx.createBufferSource(), bp=audioCtx.createBiquadFilter(), g=audioCtx.createGain();
  src.buffer=b; bp.type='bandpass'; bp.frequency.value=v.f; bp.Q.value=v.q ?? 1;
  env(g,v.gain*scale,at,v.dur,v.attack);
  src.connect(bp); bp.connect(g); g.connect(master);
  const t=audioCtx.currentTime+at; src.start(t); src.stop(t+v.dur+.03);
}
function playAudio(name) {
  if (!audioOn.checked) return;
  if (!ensureAudio()) return;
  const cue=AUDIO_CUES[name];
  for (const layer of cue.layers) {
    const v=AUDIO_VOICES[layer.voice], at=layer.at/1000, scale=layer.gain ?? 1;
    if (v.type==='noise') noise(v,at,scale);
    else if (v.type==='arp') v.notes.forEach((f,i)=>tone(v,at+i*v.step,scale,f));
    else tone(v,at,scale);
  }
}

function spawn(stageSpec) {
  const cx=stage.width*0.5, cy=stage.height*0.64;
  const colour=PALETTE[stageSpec.colour] || '#fff';
  const ring=/ring|halo|ripple/.test(stageSpec.kind);
  for (let i=0;i<stageSpec.n;i++) {
    const a=(Math.PI*2*i/Math.max(1,stageSpec.n)) + Math.random()*.45;
    const speed=(stageSpec.spread||1)*32*(.55+Math.random()*.7);
    active.push({
      x:cx, y:cy, vx:Math.cos(a)*speed, vy:-Math.abs(Math.sin(a))*speed*.7 - 18,
      life:stageSpec.lifeMs, age:0, size:Math.max(2,stageSpec.size*55),
      colour, kind:stageSpec.kind, ring, rot:Math.random()*6.28,
    });
  }
}
function queueVfx(name) {
  if (!vfxOn.checked) return;
  let stages=VFX_CUES[name]?.stages || [];
  if (reduced.checked) {
    const policy=VFX_CUES[name]?.reduce;
    stages = policy==='single' ? stages.slice(0,1) : policy==='none' ? [] : stages;
  }
  const now=performance.now();
  pending.push(...stages.map(s=>({due:now+s.at,s})));
}
function draw(dt, now) {
  ctx2.clearRect(0,0,stage.width,stage.height);
  const g=ctx2.createLinearGradient(0,0,0,stage.height);
  g.addColorStop(0,'#3a3a33'); g.addColorStop(1,'#1f1f1b');
  ctx2.fillStyle=g; ctx2.fillRect(0,0,stage.width,stage.height);
  ctx2.fillStyle='#8c7251'; ctx2.fillRect(0,stage.height*.68,stage.width,stage.height*.32);
  ctx2.fillStyle='#5f8b54'; ctx2.fillRect(0,stage.height*.665,stage.width,8);

  pending = pending.filter(p => {
    if (p.due <= now) { spawn(p.s); return false; }
    return true;
  });

  for (let i=active.length-1;i>=0;i--) {
    const p=active[i]; p.age+=dt;
    if (p.age>=p.life) { active.splice(i,1); continue; }
    const f=1-p.age/p.life;
    p.x+=p.vx*dt/1000; p.y+=p.vy*dt/1000; p.vy+=120*dt/1000;
    ctx2.globalAlpha=Math.max(0,f);
    ctx2.strokeStyle=p.colour; ctx2.fillStyle=p.colour;
    if (p.ring) {
      ctx2.lineWidth=Math.max(2,p.size*.18);
      ctx2.beginPath(); ctx2.arc(p.x,p.y,p.size*(1+(1-f)*3),0,Math.PI*2); ctx2.stroke();
    } else if (/streak|arc/.test(p.kind)) {
      ctx2.lineWidth=Math.max(2,p.size*.35); ctx2.beginPath(); ctx2.moveTo(p.x,p.y); ctx2.lineTo(p.x-p.vx*.035,p.y-p.vy*.035); ctx2.stroke();
    } else {
      ctx2.save(); ctx2.translate(p.x,p.y); ctx2.rotate(p.rot+p.age*.006);
      ctx2.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx2.restore();
    }
  }
  ctx2.globalAlpha=1;
  requestAnimationFrame((t)=>{ const delta=Math.min(32,t-lastFrame); lastFrame=t; draw(delta,t); });
}
requestAnimationFrame((t)=>{ lastFrame=t; draw(16,t); });

function renderTimeline(name) {
  timeline.innerHTML='';
  const lanes=[
    ['AUDIO', AUDIO_CUES[name]?.layers.map(l=>({at:l.at,label:l.voice})) || [], 'audio'],
    ['VFX', VFX_CUES[name]?.stages.map(s=>({at:s.at,label:s.kind})) || [], 'vfx'],
  ];
  for (const [label,items,cls] of lanes) {
    const lab=document.createElement('div'); lab.className='lane-label'; lab.textContent=label;
    const lane=document.createElement('div'); lane.className='lane';
    for (const item of items) {
      const tick=document.createElement('div'); tick.className=`tick ${cls}`;
      tick.style.left=`${Math.min(100,item.at/3)}%`;
      const text=document.createElement('span'); text.textContent=`${item.at}ms ${item.label}`;
      tick.appendChild(text); lane.appendChild(tick);
    }
    timeline.append(lab,lane);
  }
}
function stopIdle() { if (idleTimer) clearInterval(idleTimer); idleTimer=null; }
function trigger(name) {
  current=name; stopIdle(); active=[]; pending=[];
  document.querySelectorAll('.cue').forEach(b=>b.classList.toggle('active',b.dataset.cue===name));
  cueName.textContent=name;
  cueMeta.textContent=`audio ${cueDurationMs(name)} ms • vfx ${cueEndMs(name)} ms • ${AUDIO_CUES[name].class}`;
  renderTimeline(name);
  playAudio(name); queueVfx(name);
  if (name==='machine_idle') idleTimer=setInterval(()=>{ playAudio(name); queueVfx(name); }, AUDIO_CUES[name].repeatMs || 720);
}

for (const [title,names] of Object.entries(GROUPS)) {
  const section=document.createElement('section'); section.className='group';
  const h=document.createElement('h2'); h.textContent=title;
  const wrap=document.createElement('div'); wrap.className='buttons';
  for (const name of names) {
    const b=document.createElement('button'); b.className='cue'; b.dataset.cue=name;
    b.textContent=name.replaceAll('_',' '); b.addEventListener('click',()=>trigger(name)); wrap.appendChild(b);
  }
  section.append(h,wrap); groups.appendChild(section);
}
stage.addEventListener('pointerdown',()=>trigger(current || 'pickup'));
renderTimeline('pickup');
cueMeta.textContent=`audio ${cueDurationMs('pickup')} ms • vfx ${cueEndMs('pickup')} ms • frequent`;

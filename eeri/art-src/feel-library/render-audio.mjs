// Dependency-free offline preview renderer for the source recipes.
// Usage: node render-audio.mjs [cue-name] [output.wav]
// Default output goes to /tmp so generated binaries never enter the repo by accident.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AUDIO_VOICES, AUDIO_CUES, cueDurationMs } from './audio-cues.js';

const cueName = process.argv[2] || 'girder_place';
const cue = AUDIO_CUES[cueName];
if (!cue) throw new Error(`unknown cue ${cueName}`);
const sr=44100;
const totalMs=cueDurationMs(cueName)+120;
const pcm=new Float64Array(Math.ceil(sr*totalMs/1000));
let seed=0xE311;
const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/0xffffffff)*2-1;
const env=(t,d,a)=> t<a ? t/Math.max(a,1e-6) : Math.max(0,1-(t-a)/Math.max(d-a,1e-6));
const add=(voice,atMs,scale=1)=>{
  const v=AUDIO_VOICES[voice]; const start=Math.round(sr*atMs/1000);
  const renderTone=(f0,f1,dur,gain,wave='triangle')=>{
    const n=Math.round(sr*dur); let phase=0;
    for(let i=0;i<n && start+i<pcm.length;i++){
      const t=i/sr, p=t/dur, f=f0+(f1-f0)*p; phase+=2*Math.PI*f/sr;
      let s=Math.sin(phase); if(wave==='square') s=Math.sign(s); else if(wave==='triangle') s=2/Math.PI*Math.asin(Math.sin(phase));
      pcm[start+i]+=s*gain*scale*env(t,dur,v.attack??0.003);
    }
  };
  if(v.type==='tone') renderTone(v.f0,v.f1,v.dur,v.gain,v.wave);
  else if(v.type==='noise'){
    const n=Math.round(sr*v.dur), alpha=Math.exp(-2*Math.PI*Math.min(v.f,6000)/sr); let lp=0, prev=0;
    for(let i=0;i<n && start+i<pcm.length;i++){
      const t=i/sr; lp=(1-alpha)*rand()+alpha*lp; const hp=lp-prev; prev=lp;
      pcm[start+i]+=hp*v.gain*scale*3.0*env(t,v.dur,v.attack??0.002);
    }
  } else if(v.type==='arp') {
    v.notes.forEach((f,i)=>{
      const sub={...v,type:'tone',f0:f,f1:f}; AUDIO_VOICES.__tmp=sub; add('__tmp',atMs+i*v.step*1000,scale); delete AUDIO_VOICES.__tmp;
    });
  }
};
cue.layers.forEach(l=>add(l.voice,l.at,l.gain??1));
let peak=0; for(const x of pcm) peak=Math.max(peak,Math.abs(x)); const norm=peak>0.92?0.92/peak:1;
const data=Buffer.alloc(pcm.length*2); for(let i=0;i<pcm.length;i++) data.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(pcm[i]*norm*32767))),i*2);
const header=Buffer.alloc(44); header.write('RIFF',0); header.writeUInt32LE(36+data.length,4); header.write('WAVEfmt ',8); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(1,22); header.writeUInt32LE(sr,24); header.writeUInt32LE(sr*2,28); header.writeUInt16LE(2,32); header.writeUInt16LE(16,34); header.write('data',36); header.writeUInt32LE(data.length,40);
const out=process.argv[3] || path.join(os.tmpdir(),`eeri-${cueName}.wav`); fs.writeFileSync(out,Buffer.concat([header,data])); console.log(out);

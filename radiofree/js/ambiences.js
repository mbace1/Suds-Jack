// Radio Free Helsinki — tiny procedural ambience layer.
// No audio assets: scene families are synthesized from low-cost loops and one-shots.
import * as audio from './audio.js?v=61';
let ctx=null,master=null,bed=null;
const state={family:'city',intensity:.5};
const clamp=v=>Math.max(0,Math.min(1,v));
function ensure(){audio.init();ctx=audio.__ambientContext();master=audio.__ambientOut();return !!ctx&&!!master;}
function loopNoise(freq,q,gain,period=2){if(!ensure()||bed)return;const buf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*period),ctx.sampleRate),d=buf.getChannelData(0);let z=0;for(let i=0;i<d.length;i++){z=z*.985+(Math.random()*2-1)*.03;d[i]=z;}const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();g.gain.value=0;src.connect(f).connect(g).connect(master);src.start();g.gain.linearRampToValueAtTime(gain,ctx.currentTime+.8);bed={src,g};}
function stopBed(){if(!bed)return;const b=bed;bed=null;try{b.g.gain.linearRampToValueAtTime(0,ctx.currentTime+.35);b.src.stop(ctx.currentTime+.45);}catch{}}
export function initAmbient(){return ensure();}
export function setAmbient(family='city',intensity=.5){state.family=family;state.intensity=clamp(intensity);stopBed();const f={city:[115,.7,.12],rail:[175,.9,.16],harbour:[80,.55,.11],interior:[260,1.1,.08],rooftop:[95,.8,.075]}[family]||[115,.7,.1];loopNoise(f[0],f[1],f[2]*state.intensity);}
export function tick(){if(!ctx||!bed||ctx.state==='suspended')return;const wobble=1+Math.sin(performance.now()*.0007)*.035;bed.g.gain.value=.045*state.intensity*wobble;}
export function pulse(kind='tram'){if(!ensure())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=kind==='tram'?72:kind==='metro'?58:120;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035*state.intensity,t+.035);g.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(g).connect(master);o.start(t);o.stop(t+.55);}
export function weatherPulse(kind='rain'){if(!ensure())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='triangle';o.frequency.value=kind==='snow'?2100:kind==='wind'?180:1450;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.012*state.intensity,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g).connect(master);o.start(t);o.stop(t+.25);}
export function stopAmbient(){stopBed();}

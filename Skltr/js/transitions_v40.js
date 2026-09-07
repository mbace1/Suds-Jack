// SKLTR v40 — authored arena handoff. Pure presentation: no gameplay pause.
let veil=null,label=null,audio=null,lastTheme='wire';
function ensure(){
  if(veil)return;
  veil=document.createElement('div');veil.id='skltr-transition';
  Object.assign(veil.style,{position:'fixed',inset:'0',zIndex:'9',pointerEvents:'none',opacity:'0',background:'radial-gradient(circle at 50% 55%, transparent 0 18%, #000 82%)',transition:'opacity .28s ease',mixBlendMode:'screen'});
  label=document.createElement('div');Object.assign(label.style,{position:'absolute',left:'50%',top:'18%',transform:'translateX(-50%)',font:'700 13px/1 monospace',letterSpacing:'4px',color:'#fff',textShadow:'0 0 14px currentColor'});veil.appendChild(label);document.body.appendChild(veil);
}
function tone(theme){try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value={paper:220,signal:330,physical:130,kill:82,wire:260}[theme]||220;g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.055,audio.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.34);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.36)}catch{}}
addEventListener('skltr-theme',e=>{
  ensure();const theme=e.detail?.theme||'wire';if(theme===lastTheme)return;lastTheme=theme;
  label.textContent=theme.toUpperCase();veil.style.opacity='.42';tone(theme);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{veil.style.opacity='0'}));
  dispatchEvent(new CustomEvent('skltr-transition-complete',{detail:{theme}}));
});

function append(text,cls='tc-me'){const log=document.querySelector('.toko-chat .tc-log');if(!log)return;const d=document.createElement('div');d.className=cls;d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
const commands={
'DIR':'MIND.JS  PROJECTS/  MEMORY/  NEWS/  MANIFESTO.TXT  NATURE.EXE  MIRROR.EXE',
'WHOAMI':'TOKO MIDORI. ARTIST, DEVELOPER, AUDIENCE, MASK.',
'MEMORY':'Local memory is active. I keep corrections, decisions and project context on this device.',
'TYPE MANIFESTO.TXT':'Games should be art. Systems should have a point of view. Go outside sometimes; not to earn anything, just to remember scale.',
'NATURE.EXE':'No streak. No proof. Just leave the screen for a bit when you need to.',
'MIRROR.EXE':'You are also the developer, the audience and the critic. The project changes because you look at it.'};
addEventListener('keydown',e=>{const i=document.querySelector('.toko-chat .tc-say-row input');if(e.key!=='Enter'||e.target!==i)return;const q=i.value.trim(),u=q.toUpperCase();if(commands[u]){e.stopImmediatePropagation();e.preventDefault();i.value='';append(commands[u]);window.dispatchEvent(new CustomEvent('toko:mode',{detail:{mode:u==='MIRROR.EXE'?'mirror':u==='NATURE.EXE'?'nature':'dos'}}));return}if(/latest news|news|industry/i.test(q)&&window.TokoNewsConversation){return}if(/disagree|i disagree|no,|actually/i.test(q))window.dispatchEvent(new CustomEvent('toko:mode',{detail:{mode:'disagreement'}}))},true);
window.TokoPersonalityBridge={commands};
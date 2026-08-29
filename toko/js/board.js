// TOKO MIDORI GAMES — live board wrapper.
// Keep the deployed brand-board implementation intact, then load the newer
// self-mounting conversation/brain/layout layers exactly once.
import './board-base.js';
import './project-conversation.js';
import './brain-conversation.js';
import './chat-layout-fix.js';
import './news-wire.js';
import './news-conversation.js';
import './news-sources.js';

const cleanCopy=()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){
    if(n.nodeValue?.includes('GO MAKE YOUR OWN.'))n.nodeValue=n.nodeValue.replace('GO MAKE YOUR OWN.','MAKE SOMETHING OF YOUR OWN.');
    if(n.nodeValue?.includes('go make your own'))n.nodeValue=n.nodeValue.replace(/go make your own/gi,'make something of your own');
  }
};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',cleanCopy,{once:true});else cleanCopy();

// Radio Free Helsinki — offline.
const VERSION = 'v54';
const CACHE = `rfh-${VERSION}`;
const V = `?v=54`;
const SHELL = [
  '../toko/js/signature.js?v=2',
  ...['surface', 'palette', 'face', 'util', 'glitch'].map(m => `../toko/js/${m}.js`),
  './', './index.html', './manifest.webmanifest',
  './img/cathedral.jpg', './img/katu.jpg', './img/mannerheim.jpg',
  './wire.json', './wire/index.json', './icon-192.png', './icon-512.png',
  ...['main','codec','package','anchor','graphic','plate','photo','plates','wire','toko','visuals','ambient','retrocity','tram','centralstation','hakaniemi','metro','rooftops','kallionight','mannerheimrain','katajanokka','broadcastfx','editorialmap','extras','stories','i18n','screen','audio','palette'].map(m => `./js/${m}.js${V}`),
];
async function precacheNewest(c){try{const res=await fetch('./wire/index.json',{cache:'reload'});if(!res||!res.ok)return;await c.put('./wire/index.json',res.clone());const idx=await res.json();const list=Array.isArray(idx.episodes)?idx.episodes:[];for(const date of list.slice(0,2))await c.add(new Request(`./wire/${date}.json`,{cache:'reload'})).catch(()=>{});}catch{}}
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));await precacheNewest(c);self.skipWaiting();})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});
const isWire=u=>u.pathname.endsWith('/wire.json')||(u.pathname.includes('/wire/')&&u.pathname.endsWith('.json'));
async function wireFirst(req){try{const res=await fetch(req,{cache:'no-store'});if(res&&res.ok){(await caches.open(CACHE)).put(req,res.clone());return res;}throw new Error('HTTP '+(res&&res.status));}catch{const c=await caches.match(req,{ignoreSearch:false})||await caches.match(req,{ignoreSearch:true});if(c)return c;return new Response('{}',{status:503,headers:{'Content-Type':'application/json'}});}}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==location.origin)return;e.respondWith((async()=>{if(isWire(url))return wireFirst(req);const cached=await caches.match(req,{ignoreSearch:false});if(cached)return cached;try{const res=await fetch(req);if(res&&res.ok&&res.type==='basic')(await caches.open(CACHE)).put(req,res.clone());return res;}catch{if(req.mode==='navigate'){const shell=await caches.match('./index.html');if(shell)return shell;}const loose=await caches.match(req,{ignoreSearch:true});if(loose)return loose;throw new Error('offline and uncached');}})());});

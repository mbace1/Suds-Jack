// Shared local play log for the Toko catalogue.
// Local-only by design. Games can report richer events, while shell.js records
// visits automatically. Toko reads this later; nothing is uploaded.
const KEY='tokoPlayLog.v1';
const MAX=240;
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch{return[]}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v.slice(-MAX)))}catch{}};
const now=()=>new Date().toISOString();
export function logPlay(game,type='visit',data={}){if(!game)return null;const item={at:now(),game,type,...data};const log=read();log.push(item);write(log);try{dispatchEvent(new CustomEvent('toko:play',{detail:item}))}catch{}return item}
export function readPlayLog({game=null,type=null,limit=80}={}){let log=read();if(game)log=log.filter(x=>x.game===game);if(type)log=log.filter(x=>x.type===type);return log.slice(-limit)}
export function setFavourite(game,on=true){const key='tokoPlayFavourites.v1';let fav=[];try{fav=JSON.parse(localStorage.getItem(key))||[]}catch{}const s=new Set(fav);on?s.add(game):s.delete(game);try{localStorage.setItem(key,JSON.stringify([...s]))}catch{}logPlay(game,on?'favourite':'unfavourite');return [...s]}
export function favourites(){try{return JSON.parse(localStorage.getItem('tokoPlayFavourites.v1'))||[]}catch{return[]}}
export const playlog={logPlay,readPlayLog,setFavourite,favourites};
globalThis.TokoPlayLog=playlog;
export default playlog;

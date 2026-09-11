export const N=9;
export const covers=[[3,3],[4,3],[6,4],[7,4],[3,5],[4,5],[7,7],[8,7]];
const k=(x,z)=>`${x},${z}`;
export const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export function create(){return {round:1,turn:'player',result:null,selected:'scout',log:[],units:[
 {id:'scout',name:'Scout',team:0,x:2,z:6,hp:6,max:6,range:4,speed:4},
 {id:'anchor',name:'Anchor',team:0,x:4,z:7,hp:8,max:8,range:3,speed:3},
 {id:'e1',name:'Lookout',team:1,x:1,z:0,hp:3,max:3,range:3,speed:2},
 {id:'e2',name:'Watcher',team:1,x:5,z:1,hp:3,max:3,range:3,speed:2},
 {id:'e3',name:'Runner',team:1,x:5,z:3,hp:3,max:3,range:2,speed:3},
 {id:'e4',name:'Guard',team:1,x:8,z:2,hp:4,max:4,range:3,speed:2},
 ].map(u=>({...u,moved:false,acted:false}))};}
export const unit=(s,id)=>s.units.find(u=>u.id===id);
export const blocked=(s,x,z,ignore)=>x<0||z<0||x>=N||z>=N||covers.some(c=>c[0]===x&&c[1]===z)||s.units.some(u=>u.hp>0&&u.id!==ignore&&u.x===x&&u.z===z);
export function reachable(s,u){
 const seen=new Map([[k(u.x,u.z),{x:u.x,z:u.z,cost:0,path:[]}]]),queue=[seen.get(k(u.x,u.z))];
 for(const t of queue){if(t.cost>=u.speed)continue;for(const [dx,dz] of [[1,0],[0,1],[-1,0],[0,-1]]){
  const x=t.x+dx,z=t.z+dz,key=k(x,z);if(seen.has(key)||blocked(s,x,z,u.id))continue;
  const next={x,z,cost:t.cost+1,path:[...t.path,{x,z}]};seen.set(key,next);queue.push(next);
 }}return [...seen.values()].filter(t=>t.cost);
}
export function los(a,b){
 const steps=Math.max(Math.abs(a.x-b.x),Math.abs(a.z-b.z))*4;
 for(let i=1;i<steps;i++){const x=Math.round(a.x+(b.x-a.x)*i/steps),z=Math.round(a.z+(b.z-a.z)*i/steps);
  if((x===a.x&&z===a.z)||(x===b.x&&z===b.z))continue;
  if(covers.some(c=>c[0]===x&&c[1]===z))return false;
 }return true;
}
export function forecast(a,b){const d=dist(a,b);if(!b||b.hp<=0||a.hp<=0||a.team===b.team||d>a.range||!los(a,b))return null;
 const cover=d>1&&covers.some(([x,z])=>dist({x,z},b)===1);
 return {damage:Math.max(1,(a.team===1?1:d===1?3:2)-(cover?1:0)),cover,melee:d===1};}
function finish(s){if(!s.units.some(u=>u.team===1&&u.hp>0))s.result='victory';else if(!s.units.some(u=>u.team===0&&u.hp>0))s.result='defeat';}
export function move(s,id,x,z){const u=unit(s,id);if(!u||s.result||u.hp<=0||u.moved||(s.turn==='player')!==(u.team===0))return null;
 const tile=reachable(s,u).find(t=>t.x===x&&t.z===z);if(!tile)return null;
 const e={type:'move',id,from:{x:u.x,z:u.z},to:{x,z},path:tile.path};u.x=x;u.z=z;u.moved=true;s.log.push(e);return e;}
export function attack(s,id,target){const a=unit(s,id),b=unit(s,target);if(!a||!b||s.result||a.acted||(s.turn==='player')!==(a.team===0))return null;
 const f=forecast(a,b);if(!f)return null;a.acted=true;b.hp=Math.max(0,b.hp-f.damage);
 const e={type:'attack',id,target,...f,down:b.hp===0};s.log.push(e);finish(s);return e;}
export function intent(s,u){const foes=s.units.filter(v=>v.team!==u.team&&v.hp>0);if(!foes.length||u.hp<=0)return null;
 const choices=[{x:u.x,z:u.z,cost:0},...reachable(s,u)];let best=null;
 for(const p of choices)for(const target of foes){const f=forecast({...u,...p},target);const score=(f?100+f.damage*4:0)-dist(p,target)*2-p.cost*.3;
 if(!best||score>best.score)best={score,to:p,target:target.id,shoot:!!f};}return best;}
export function endTurn(s){if(s.turn!=='player'||s.result)return false;s.turn='enemy';return true;}
export function nextRound(s){if(s.result)return;s.round++;s.turn='player';for(const u of s.units){u.moved=false;u.acted=false;}s.log.push({type:'round',round:s.round});}

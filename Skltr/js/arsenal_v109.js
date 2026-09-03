import './player_world_collision_v114.js';
import './missile_warning_v115.js';
import { Player } from './player.js?v=12';

// SKLTR v109/v116 — one coherent movement arsenal, not a weapon inventory.
// Rifle = constant pressure, missile = periodic priority deletion, CONTACT = movement kill.
const hud=document.createElement('div');hud.id='skltr-arsenal';
Object.assign(hud.style,{position:'fixed',left:'12px',bottom:'12px',zIndex:'70',font:'700 9px/1.45 monospace',letterSpacing:'2px',color:'#cdeaff',textShadow:'0 0 10px #50c8ff80',pointerEvents:'none',opacity:'.62'});hud.innerHTML='RIFLE · AUTO<br>MISSILE · …<br>CONTACT · DASH';document.body.appendChild(hud);
const flash=document.createElement('div');Object.assign(flash.style,{position:'fixed',inset:'0',zIndex:'65',pointerEvents:'none',background:'radial-gradient(circle at 50% 60%,#ffe26a30,transparent 28%)',opacity:'0',transition:'opacity .18s'});document.body.appendChild(flash);
addEventListener('skltr-missile-launch',()=>{flash.style.opacity='.7';requestAnimationFrame(()=>requestAnimationFrame(()=>flash.style.opacity='0'))});
const oldUpdate=Player.prototype.update;
Player.prototype.update=function(...a){const out=oldUpdate.apply(this,a);const t=Math.max(0,this._missileT||0),ready=t<=.05;hud.innerHTML=`RIFLE · AUTO${this.dashing?' / DASH':''}<br>MISSILE · ${ready?'READY':t.toFixed(1)+'s'}<br>CONTACT · ${this.flowStacks?`FLOW ${this.flowStacks}/3`:'DASH'}`;hud.style.opacity=this.alive?'.62':'.22';return out};
window._skltrArsenal109=()=>({rifle:'auto pressure',missile:'priority target',contact:'movement kill',playerSolid:!!window._skltrPlayerWorld114,enemyMissileWarning:!!window._skltrMissileWarning115});

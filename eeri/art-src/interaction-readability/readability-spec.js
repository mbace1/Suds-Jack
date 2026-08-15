export const READABILITY={
 machine_mount:{anchor:'step',primary:'step_nod',secondary:'warm_edge',marker:'footstep',icon:null,text:null,periodMs:1500,complete:'hide'},
 dirt_bank:{anchor:'bank_face',primary:'surface_crumble',secondary:'earth_edge',marker:'paired_chevrons',icon:'bucket',text:'DIG ME',periodMs:1350,complete:'hide'},
 ladder:{anchor:'first_grip',primary:'grip_wiggle',secondary:'steel_edge',marker:'grip_stripes',icon:null,text:null,periodMs:1750,complete:'keep'},
 pipe_mouth:{anchor:'mouth',primary:'air_breathe',secondary:'steel_edge',marker:'airflow',icon:null,text:null,periodMs:1600,complete:'keep'},
 checkpoint:{anchor:'lamp',primary:'lamp_breathe',secondary:'machine_edge',marker:'small_flag',icon:null,text:null,periodMs:1900,complete:'state_change'},
 build_piece:{anchor:'grip',primary:'grip_nod',secondary:'machine_edge',marker:'socket_ticks',icon:null,text:null,periodMs:1450,complete:'hide'},
};
export const PRIORITY=['primary','secondary','marker','icon','text'];
export const RULES={minPeriodMs:1200,maxPeriodMs:2200,textOnlyOnObject:true,maxSimultaneousStrongCues:1};
export function resolvedCue(name,level=3){const r=READABILITY[name];if(!r)return null;const out={anchor:r.anchor};for(let i=0;i<Math.min(level,PRIORITY.length);i++){const k=PRIORITY[i];if(r[k])out[k]=r[k]}return out}
export function validateReadability(){const bad=[];for(const [n,r] of Object.entries(READABILITY)){if(!(r.periodMs>=RULES.minPeriodMs&&r.periodMs<=RULES.maxPeriodMs))bad.push(`${n}: period`);if(!r.anchor)bad.push(`${n}: anchor`);if(r.text&&n!=='dirt_bank')bad.push(`${n}: unexpected text`);if(r.text&&r.anchor!=='bank_face')bad.push(`${n}: text not on object`)}return bad}

// Source-only ambient motion recipes. No runtime imports.
export const LIFE_ACTORS = {
  tape_flutter:{worlds:['groundworks','pipeworks'],anchor:'edge',motion:'flutter',amp:0.12,periodMs:760,maxPerRoom:2,energy:'medium',reduce:'freeze'},
  sign_wobble:{worlds:['groundworks','pipeworks'],anchor:'prop',motion:'sway',amp:0.055,periodMs:1800,maxPerRoom:1,energy:'low',reduce:'freeze'},
  paper_scrap:{worlds:['groundworks'],anchor:'air',motion:'drift',amp:0.32,periodMs:3200,maxPerRoom:1,energy:'medium',reduce:'hide'},
  beacon_sweep:{worlds:['groundworks','pipeworks'],anchor:'machine',motion:'pulse',amp:0.65,periodMs:1200,maxPerRoom:1,energy:'low',reduce:'pulse'},
  felt_tuft:{worlds:['groundworks'],anchor:'ground',motion:'breathe',amp:0.045,periodMs:2400,maxPerRoom:2,energy:'low',reduce:'freeze'},
  cable_sway:{worlds:['groundworks','pipeworks'],anchor:'overhead',motion:'sway',amp:0.08,periodMs:2600,maxPerRoom:1,energy:'low',reduce:'freeze'},
  steam_puff:{worlds:['pipeworks'],anchor:'pipe',motion:'puff',amp:0.22,periodMs:2800,maxPerRoom:1,energy:'medium',reduce:'hide'},
  water_drip:{worlds:['pipeworks'],anchor:'overhead',motion:'drop',amp:0.18,periodMs:1900,maxPerRoom:2,energy:'low',reduce:'freeze'},
  bird_perch:{worlds:['groundworks'],anchor:'high_prop',motion:'hoplook',amp:0.09,periodMs:4200,maxPerRoom:1,energy:'medium',reduce:'freeze'},
  hook_sway:{worlds:['groundworks'],anchor:'far',motion:'sway',amp:0.07,periodMs:3100,maxPerRoom:1,energy:'low',reduce:'freeze'},
};

export const ROOM_BUDGET={maxActors:4,maxMediumEnergy:1,minSeparationTiles:3};

export function validateLifeSpec(){
  const bad=[];
  for(const [name,a] of Object.entries(LIFE_ACTORS)){
    if(!(a.amp>0&&a.amp<=0.7)) bad.push(`${name}: amplitude`);
    if(!(a.periodMs>=650&&a.periodMs<=5000)) bad.push(`${name}: period`);
    if(!(a.maxPerRoom>=1&&a.maxPerRoom<=2)) bad.push(`${name}: count`);
    if(!['low','medium'].includes(a.energy)) bad.push(`${name}: energy`);
    if(!['freeze','hide','pulse'].includes(a.reduce)) bad.push(`${name}: reduce`);
  }
  return bad;
}

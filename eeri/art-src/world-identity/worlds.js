export const WORLDS = {
  1:{name:'Groundworks',backdrop:'groundworks',materials:['earth','balsa','concrete-card'],motifs:['mound','trench','survey-stake'],motion:['tape-flutter','sign-wobble','distant-dig'],sound:['dirt','wood','distant-engine'],light:'soft-day',accent:'machine-yellow'},
  2:{name:'Pipes & Water',backdrop:'pipeworks',materials:['painted-pipe','damp-card','concrete-card'],motifs:['elbow','valve','grate'],motion:['drip','steam','ripple'],sound:['water-drop','pipe-tick','air-puff'],light:'cool-day',accent:'pipe-blue'},
  3:{name:'Forest Clearing & Digs',backdrop:'forestworks',materials:['bark-card','cut-balsa','root-felt'],motifs:['trunk','log-stack','root-cut'],motion:['branch-bob','paper-leaf','rope-sway'],sound:['wood-knock','leaf-rustle','distant-saw-toy'],light:'leaf-filtered-day',accent:'safety-orange'},
  4:{name:'Evening Site Under Lights',backdrop:'nightworks',materials:['painted-balsa','steel-card','reflective-tape'],motifs:['floodlight','lit-cabin','crane-silhouette'],motion:['beacon-sweep','paper-moth','distant-crane'],sound:['lamp-click','quiet-engine','night-air'],light:'evening-floodlit',accent:'warm-lamp'},
};

export const IDENTITY_RULES = {
  screenshotReadable:true,
  colourAloneNeverSufficient:true,
  maxSignatureMotionsPerView:2,
  gameplaySilhouetteContrast:'constant',
  craftedMaterialFirst:true,
};

export function validateWorlds(){const bad=[];for(const [id,w] of Object.entries(WORLDS)){if(w.materials.length<3)bad.push(`${id}: materials`);if(w.motifs.length<3)bad.push(`${id}: motifs`);if(w.motion.length<2)bad.push(`${id}: motion`);if(w.sound.length<2)bad.push(`${id}: sound`);if(!w.backdrop)bad.push(`${id}: backdrop`)}if(Object.keys(WORLDS).length!==4)bad.push('must be four worlds');if(!IDENTITY_RULES.craftedMaterialFirst)bad.push('craft first');return bad}

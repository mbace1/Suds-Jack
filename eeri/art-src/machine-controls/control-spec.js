export const MACHINES={
  excavator:{parts:['wheels','boom','stick','bucket'],base:'wheels',tool:'bucket',mountGlyph:'Ⓑ',strip:['◀ ▶ DRIVE','▲ ▼ BOOM','Ⓑ HOP OUT'],context:[{when:'dig_range',glyph:'▼',focus:'bucket'}]},
  crane:{parts:['wheels','boom','arm','ball'],base:'wheels',tool:'ball',mountGlyph:'Ⓑ',strip:['◀ ▶ DRIVE','▼ SWING','Ⓑ HOP OUT'],context:[{when:'wall_range',glyph:'▼',focus:'ball'}]},
};
export const PRESENTATION={fullStripMaxMs:2500,collapseAfterFirstSuccess:true,maxContextActions:1,partHighlightMs:420,blocksInput:false,textNamesKeys:false};
export const FUTURE_RIDE_CONTRACT={directionalDrive:true,dismount:'Ⓑ',maxContextActions:1,physicalToolMustMove:true};

export function validateMachineControls(){const bad=[];for(const [k,m] of Object.entries(MACHINES)){if(m.context.length>PRESENTATION.maxContextActions)bad.push(`${k}: too many actions`);if(!m.parts.includes(m.tool))bad.push(`${k}: tool node`);if(!m.strip.some(x=>x.includes('Ⓑ')))bad.push(`${k}: no dismount`)}if(PRESENTATION.blocksInput)bad.push('presentation blocks input');if(PRESENTATION.textNamesKeys)bad.push('key names forbidden');if(FUTURE_RIDE_CONTRACT.maxContextActions!==1)bad.push('future ride too complex');return bad}

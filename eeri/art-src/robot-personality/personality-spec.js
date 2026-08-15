export const PERSONALITY = {
  hopper:{safeStates:['patrol','recover'],idle:[{kind:'collar_breathe',amp:0.035,periodMs:900}],event:{land:{kind:'settle_shimmy',deg:3,durMs:170}},forbid:['speed','cycle','collision']},
  roller:{safeStates:['patrol'],idle:[{kind:'drum_roll_visual'}],event:{edge:{kind:'work_check_pause_visual',durMs:180}},forbid:['speed','turn_logic','collision']},
  bucket:{safeStates:['sleep','settle'],idle:[{kind:'sleep_slump',deg:2.5,periodMs:2400}],event:{wake:{kind:'head_lead_existing'}},forbid:['hear','chase','speed']},
  skitter:{safeStates:['patrol','recover'],idle:[{kind:'eye_scan',deg:8,periodMs:1800}],event:{notice:{kind:'eye_lock',durMs:180}},forbid:['see','notice','wind','lunge']},
};

export const SHARED={angry:false,personalityChangesGameplay:false,stomp:{squash:0.58,popDeg:5,durMs:260},maxIdleDeg:8};

export function validatePersonality(){const bad=[];for(const [k,p] of Object.entries(PERSONALITY)){if(!p.safeStates?.length)bad.push(`${k}: no safe states`);if(!p.idle?.length)bad.push(`${k}: no idle beat`);if(!p.forbid?.length)bad.push(`${k}: no gameplay guard`);for(const x of p.idle)if((x.deg||0)>SHARED.maxIdleDeg)bad.push(`${k}: too much rotation`)}if(SHARED.angry)bad.push('tone angry');if(SHARED.personalityChangesGameplay)bad.push('personality changes gameplay');return bad}

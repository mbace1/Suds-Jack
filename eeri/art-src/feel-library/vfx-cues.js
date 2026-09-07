// EERI FEEL LIBRARY — visual cue recipes and timing.
// Source-only. Plain data: no THREE import, no runtime dependency.
//
// Time is milliseconds from the gameplay event's CONTACT frame. Audio and VFX use the
// same event names so an integrator can port one cue without re-deciding its rhythm.

export const VFX_CUES = {
  jump: {
    class:'frequent', anchor:'feet', reduce:'single',
    stages:[
      {at:0, kind:'dust_puff', n:3, lifeMs:170, size:0.08, spread:1.4, colour:'EARTH1'},
      {at:36, kind:'sole_streak', n:2, lifeMs:100, size:0.05, spread:1.0, colour:'STEEL1'},
    ],
  },
  land_soft: {
    class:'frequent', anchor:'feet', reduce:'single',
    stages:[
      {at:0, kind:'dust_puff', n:4, lifeMs:210, size:0.09, spread:1.8, colour:'EARTH1'},
      {at:28, kind:'ground_ring', n:1, lifeMs:160, size:0.34, spread:0, colour:'STEEL1'},
    ],
  },
  stomp: {
    class:'action', anchor:'feet', reduce:'single',
    stages:[
      {at:0, kind:'ground_ring', n:1, lifeMs:220, size:0.62, spread:0, colour:'STEEL1'},
      {at:24, kind:'flat_chips', n:8, lifeMs:310, size:0.10, spread:4.8, colour:'EARTH2'},
      {at:64, kind:'dust_puff', n:4, lifeMs:250, size:0.12, spread:2.0, colour:'EARTH1'},
    ],
  },
  hurt: {
    class:'rare', anchor:'player', reduce:'single',
    stages:[
      {at:0, kind:'impact_star', n:3, lifeMs:220, size:0.12, spread:2.2, colour:'MACHINE'},
      {at:60, kind:'soft_ring', n:1, lifeMs:260, size:0.46, spread:0, colour:'STEEL1'},
    ],
  },

  pickup: {
    class:'frequent', anchor:'pickup', reduce:'single',
    stages:[
      {at:0, kind:'spark', n:4, lifeMs:180, size:0.07, spread:2.0, colour:'MACHINE'},
      {at:34, kind:'up_streak', n:3, lifeMs:230, size:0.06, spread:1.0, colour:'MACHINE'},
    ],
  },
  golden_pickup: {
    class:'rare', anchor:'pickup', reduce:'single',
    stages:[
      {at:0, kind:'spark', n:8, lifeMs:260, size:0.09, spread:2.8, colour:'MACHINE'},
      {at:70, kind:'halo', n:1, lifeMs:480, size:0.74, spread:0, colour:'MACHINE'},
      {at:140, kind:'up_streak', n:5, lifeMs:320, size:0.07, spread:1.3, colour:'STEEL1'},
    ],
  },
  checkpoint: {
    class:'rare', anchor:'checkpoint', reduce:'single',
    stages:[
      {at:0, kind:'vertical_ping', n:4, lifeMs:300, size:0.08, spread:1.2, colour:'MACHINE'},
      {at:88, kind:'halo', n:1, lifeMs:420, size:0.85, spread:0, colour:'STEEL1'},
    ],
  },
  clear: {
    class:'rare', anchor:'flag', reduce:'single',
    stages:[
      {at:0, kind:'confetti', n:14, lifeMs:760, size:0.10, spread:5.4, colour:'MACHINE'},
      {at:92, kind:'confetti', n:10, lifeMs:850, size:0.09, spread:4.6, colour:'STEEL1'},
      {at:210, kind:'halo', n:1, lifeMs:720, size:1.2, spread:0, colour:'MACHINE'},
    ],
  },

  dig_start: {
    class:'action', anchor:'machine_tool', reduce:'single',
    stages:[
      {at:0, kind:'tool_tick', n:2, lifeMs:120, size:0.07, spread:0.8, colour:'STEEL1'},
      {at:48, kind:'dirt_clump', n:6, lifeMs:430, size:0.13, spread:2.8, colour:'EARTH1'},
    ],
  },
  dig_hit: {
    class:'action', anchor:'machine_tool', reduce:'single',
    stages:[
      {at:0, kind:'dirt_clump', n:8, lifeMs:500, size:0.14, spread:3.2, colour:'EARTH1'},
      {at:62, kind:'grit', n:5, lifeMs:270, size:0.06, spread:3.8, colour:'EARTH2'},
    ],
  },
  brick_hit: {
    class:'action', anchor:'machine_tool', reduce:'single',
    stages:[
      {at:0, kind:'sharp_chip', n:7, lifeMs:430, size:0.11, spread:4.0, colour:'EARTH2'},
      {at:24, kind:'dust_puff', n:4, lifeMs:280, size:0.11, spread:2.2, colour:'EARTH1'},
    ],
  },
  build_step: {
    class:'action', anchor:'build_piece', reduce:'single',
    stages:[
      {at:0, kind:'tool_tick', n:2, lifeMs:120, size:0.07, spread:0.7, colour:'STEEL1'},
      {at:72, kind:'snap_glint', n:3, lifeMs:190, size:0.07, spread:1.1, colour:'MACHINE'},
    ],
  },
  girder_place: {
    class:'rare', anchor:'build_piece', reduce:'single',
    stages:[
      {at:0, kind:'impact_ring', n:1, lifeMs:300, size:0.78, spread:0, colour:'STEEL2'},
      {at:34, kind:'dust_puff', n:7, lifeMs:430, size:0.13, spread:2.6, colour:'EARTH1'},
      {at:118, kind:'settle_tick', n:3, lifeMs:240, size:0.08, spread:0.7, colour:'STEEL1'},
    ],
  },

  machine_mount: {
    class:'rare', anchor:'machine', reduce:'single',
    stages:[
      {at:0, kind:'seat_tick', n:2, lifeMs:130, size:0.07, spread:0.8, colour:'STEEL1'},
      {at:72, kind:'machine_halo', n:1, lifeMs:320, size:0.72, spread:0, colour:'MACHINE'},
    ],
  },
  machine_start: {
    class:'rare', anchor:'machine', reduce:'single',
    stages:[
      {at:0, kind:'starter_glint', n:3, lifeMs:150, size:0.07, spread:0.8, colour:'STEEL1'},
      {at:52, kind:'exhaust_puff', n:4, lifeMs:360, size:0.12, spread:1.4, colour:'STEEL2'},
      {at:168, kind:'exhaust_puff', n:3, lifeMs:330, size:0.10, spread:1.2, colour:'STEEL2'},
    ],
  },
  machine_stop: {
    class:'rare', anchor:'machine', reduce:'single',
    stages:[
      {at:0, kind:'exhaust_puff', n:3, lifeMs:300, size:0.10, spread:1.0, colour:'STEEL2'},
      {at:92, kind:'machine_halo', n:1, lifeMs:280, size:0.58, spread:0, colour:'STEEL1'},
    ],
  },
  machine_idle: {
    class:'loop', anchor:'machine', reduce:'none',
    stages:[{at:0, kind:'tiny_puff', n:1, lifeMs:260, size:0.08, spread:0.6, colour:'STEEL2'}],
  },
  hoist_arrive: {
    class:'action', anchor:'hoist', reduce:'single',
    stages:[
      {at:0, kind:'impact_ring', n:1, lifeMs:250, size:0.52, spread:0, colour:'STEEL1'},
      {at:58, kind:'cable_tick', n:2, lifeMs:180, size:0.06, spread:0.6, colour:'MACHINE'},
    ],
  },

  pipe_enter: {
    class:'action', anchor:'pipe_mouth', reduce:'single',
    stages:[
      {at:0, kind:'tube_ring', n:1, lifeMs:240, size:0.62, spread:0, colour:'STEEL1'},
      {at:52, kind:'suction_streak', n:5, lifeMs:260, size:0.07, spread:2.0, colour:'MACHINE'},
    ],
  },
  pipe_exit: {
    class:'action', anchor:'pipe_mouth', reduce:'single',
    stages:[
      {at:0, kind:'suction_streak', n:4, lifeMs:220, size:0.07, spread:1.8, colour:'MACHINE'},
      {at:74, kind:'tube_ring', n:1, lifeMs:260, size:0.66, spread:0, colour:'STEEL1'},
    ],
  },
  water_step: {
    class:'frequent', anchor:'feet', reduce:'single',
    stages:[
      {at:0, kind:'splash_arc', n:5, lifeMs:320, size:0.07, spread:2.2, colour:'WATER'},
      {at:22, kind:'ripple', n:1, lifeMs:360, size:0.42, spread:0, colour:'WATER_DK'},
    ],
  },

  robot_notice: {
    class:'rare', anchor:'robot', reduce:'single',
    stages:[
      {at:0, kind:'notice_ring', n:1, lifeMs:300, size:0.48, spread:0, colour:'MACHINE'},
      {at:118, kind:'notice_tick', n:2, lifeMs:180, size:0.07, spread:0.7, colour:'STEEL1'},
    ],
  },
  robot_tamed: {
    class:'rare', anchor:'robot', reduce:'single',
    stages:[
      {at:0, kind:'friendly_spark', n:6, lifeMs:360, size:0.08, spread:2.2, colour:'MACHINE'},
      {at:160, kind:'soft_ring', n:1, lifeMs:430, size:0.72, spread:0, colour:'STEEL1'},
    ],
  },

  ui_move:    { class:'ui', anchor:'screen', reduce:'none', stages:[] },
  ui_confirm: { class:'ui', anchor:'screen', reduce:'none', stages:[{at:0, kind:'button_ping', n:1, lifeMs:140, size:0.18, spread:0, colour:'MACHINE'}] },
  ui_back:    { class:'ui', anchor:'screen', reduce:'none', stages:[] },
};

export function cueEndMs(name) {
  const c = VFX_CUES[name];
  if (!c || !c.stages.length) return 0;
  return Math.max(...c.stages.map(s => s.at + s.lifeMs));
}

export function validateVfxLibrary() {
  const bad=[];
  const palette = new Set(['MACHINE','STEEL1','STEEL2','EARTH1','EARTH2','WATER','WATER_DK']);
  for (const [name,c] of Object.entries(VFX_CUES)) {
    if (!['frequent','action','rare','loop','ui'].includes(c.class)) bad.push(`${name}: bad class`);
    if (!['single','none','keep'].includes(c.reduce)) bad.push(`${name}: bad reduce policy`);
    for (const s of c.stages) {
      if (!(s.at >= 0 && s.at <= 350)) bad.push(`${name}: stage at ${s.at}`);
      if (!(s.n >= 1 && s.n <= 16)) bad.push(`${name}: count ${s.n}`);
      if (!(s.lifeMs > 0 && s.lifeMs <= 900)) bad.push(`${name}: life ${s.lifeMs}`);
      if (!palette.has(s.colour)) bad.push(`${name}: colour ${s.colour}`);
    }
    const total = cueEndMs(name);
    if (total > 1200) bad.push(`${name}: total ${total}`);
    const particles = c.stages.reduce((n,s)=>n+s.n,0);
    if (c.class === 'frequent' && particles > 10) bad.push(`${name}: frequent particle count ${particles}`);
    if (c.class === 'frequent' && total > 500) bad.push(`${name}: frequent total ${total}`);
  }
  return bad;
}

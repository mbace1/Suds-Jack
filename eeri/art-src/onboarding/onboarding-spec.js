export const LESSONS = [
  { id:'move', level:'1-1', order:1, safeSeconds:4, signal:'bolt_trail', hintAfterAttempts:0, success:'x_delta_6' },
  { id:'jump', level:'1-1', order:2, safeSeconds:3, signal:'bolt_arc', hintAfterAttempts:2, success:'airborne_over_step' },
  { id:'stomp', level:'1-1', order:3, safeSeconds:5, signal:'hopper_open_floor', hintAfterAttempts:3, success:'stomp_bounce' },
  { id:'checkpoint', level:'1-1', order:4, safeSeconds:0, signal:'route_gate', hintAfterAttempts:0, success:'checkpoint_crossed' },
  { id:'mount', level:'1-1', order:5, safeSeconds:6, signal:'machine_faces_job', hintAfterAttempts:2, success:'ride_mode' },
  { id:'climb', level:'1-2', order:1, safeSeconds:5, signal:'ladder_to_visible_reward', hintAfterAttempts:2, success:'ladder_delta_y' },
  { id:'wade', level:'2-1', order:1, safeSeconds:5, signal:'shallow_before_gap', hintAfterAttempts:0, success:'cross_shallow' },
  { id:'pipe', level:'2-2', order:1, safeSeconds:6, signal:'paired_visible_mouths', hintAfterAttempts:2, success:'pipe_transit' },
];

export const HINT_POLICY = {
  minimumObservationMs: 2500,
  maxVisibleHints: 1,
  textIsFallback: true,
  neverInterruptsInput: true,
  dismissOnSuccess: true,
};

export function validateOnboarding() {
  const bad=[];
  const byLevel=new Map();
  for(const l of LESSONS){
    if(!l.id || !l.level || !l.signal || !l.success) bad.push(`${l.id||'?'} incomplete`);
    if(l.safeSeconds < 0 || l.safeSeconds > 10) bad.push(`${l.id}: safeSeconds`);
    if(l.hintAfterAttempts < 0 || l.hintAfterAttempts > 4) bad.push(`${l.id}: hint attempts`);
    const a=byLevel.get(l.level)||[]; a.push(l); byLevel.set(l.level,a);
  }
  for(const [level,a] of byLevel){
    const orders=a.map(x=>x.order);
    if(new Set(orders).size!==orders.length) bad.push(`${level}: duplicate order`);
  }
  if(!HINT_POLICY.textIsFallback) bad.push('text must remain fallback');
  if(!HINT_POLICY.neverInterruptsInput) bad.push('hints may not block input');
  return bad;
}

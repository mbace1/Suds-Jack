import { assertTransitionTable } from '../../game-core/state-machine.js';

export const MOVEMENT_STATES = ['stand','step','runStart','run','runStop','pivot','gather','gatherRun','air','fall','land','landRun','landHard','ledgeCatch','hang','shimmy','climbDown','pullUp','crouch','crouchIdle','crouchWalk','roll','standUp','lowMantle','dead'];

export const MOVEMENT_TRANSITIONS = {
  stand:['step','runStart','pivot','gather','crouch','climbDown','fall','dead'],
  step:['stand','step','runStart','pivot','gather','crouch','lowMantle','fall','dead'],
  runStart:['run','runStop','pivot','gatherRun','lowMantle','fall','dead'],
  run:['runStop','pivot','gatherRun','roll','lowMantle','fall','dead'],
  runStop:['stand','runStart','pivot','gather','crouch','fall','dead'],
  pivot:['runStart','run','stand','fall','dead'],
  gather:['air','fall','dead'], gatherRun:['air','fall','dead'],
  air:['ledgeCatch','land','landRun','landHard','fall','dead'],
  fall:['ledgeCatch','land','landRun','landHard','dead'],
  // Hero.airFrame resolves floor contact to `land` first. MovementHero then
  // promotes a fast descent to `landRun` in the same update, so this edge is a
  // real runtime transition rather than an impossible state jump.
  land:['stand','step','runStart','landRun','pivot','crouch','dead'],
  landRun:['run','runStart','runStop','pivot','gatherRun','fall','dead'],
  landHard:['stand','dead'],
  ledgeCatch:['hang','fall','dead'], hang:['pullUp','shimmy','fall','dead'],
  shimmy:['hang','fall','dead'], climbDown:['hang','fall','dead'], pullUp:['stand','fall','dead'],
  crouch:['crouchIdle','dead'], crouchIdle:['crouchWalk','standUp','roll','dead'],
  crouchWalk:['crouchIdle','standUp','roll','lowMantle','fall','dead'], roll:['crouchIdle','fall','dead'],
  standUp:['stand','dead'], lowMantle:['stand','step','runStart','fall','dead'], dead:['dead'],
};
assertTransitionTable(MOVEMENT_TRANSITIONS, MOVEMENT_STATES);
export const isLegalMovementTransition=(from,to)=>from===to||!!MOVEMENT_TRANSITIONS[from]?.includes(to);

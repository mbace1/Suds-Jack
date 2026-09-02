import assert from 'node:assert/strict';
import { StateMachine } from '../../game-core/state-machine.js';
import { MOVEMENT_TRANSITIONS } from '../js/movement-state-contract.js';

const TAPES = [
  { name: 'run-jump-land', steps: [['stand',0],['step',1],['runStart',23],['run',32],['gatherRun',48],['air',53],['landRun',88],['run',99],['runStop',112],['stand',132]] },
  { name: 'low-mantle', steps: [['stand',0],['step',1],['lowMantle',12],['stand',34]] },
  { name: 'ledge-pullup', steps: [['stand',0],['gather',1],['air',9],['ledgeCatch',24],['hang',36],['pullUp',45],['stand',87]] },
  { name: 'climb-down', steps: [['stand',0],['climbDown',1],['hang',31],['fall',48],['land',65],['stand',77]] },
  { name: 'crouch-roll', steps: [['stand',0],['crouch',1],['crouchIdle',10],['roll',14],['crouchIdle',42],['standUp',45],['stand',57]] },
];

let checks = 0;
for (const tape of TAPES) {
  const [initial] = tape.steps[0];
  const sm = new StateMachine({ initial, transitions: MOVEMENT_TRANSITIONS, strict: true });
  let previousFrame = -1;
  for (let i = 1; i < tape.steps.length; i++) {
    const [state, frame] = tape.steps[i];
    assert.ok(frame > previousFrame, `${tape.name}: frames must be strictly increasing`);
    previousFrame = frame;
    while (sm.frame < frame) sm.tick();
    assert.equal(sm.go(state, { tape: tape.name, frame }), true, `${tape.name}: ${sm.state} -> ${state}`);
    checks++;
  }
  assert.equal(sm.state, tape.steps.at(-1)[0], `${tape.name}: final state`);
  checks++;
}

const illegal = new StateMachine({ initial: 'stand', transitions: MOVEMENT_TRANSITIONS, strict: false });
assert.equal(illegal.go('hang'), false, 'stand -> hang must be rejected'); checks++;
assert.equal(illegal.state, 'stand', 'illegal transition must not mutate state'); checks++;

console.log(`Flash Prince movement tapes: ${checks} checks passed across ${TAPES.length} deterministic tapes`);

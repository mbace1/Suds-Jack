import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { StateMachine } from '../../game-core/state-machine.js';
import { MOVEMENT_TRANSITIONS, isLegalMovementTransition } from '../js/movement-state-contract.js';

let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };

function runTape(name, states) {
  const sm = new StateMachine({ initial: states[0], transitions: MOVEMENT_TRANSITIONS, strict: true });
  for (let i = 1; i < states.length; i++) {
    sm.tick();
    sm.go(states[i], { tape: name, step: i });
  }
  equal(sm.state, states.at(-1), `${name} reaches ${states.at(-1)}`);
  equal(sm.history.filter(e => e.type === 'illegal-transition').length, 0, `${name} has no illegal transition`);
}

runTape('standing jump', ['stand','gather','air','land','stand']);
runTape('running jump', ['stand','step','runStart','run','gatherRun','air','landRun','runStart','run']);
runTape('ledge catch and pull-up', ['run','gatherRun','air','ledgeCatch','hang','pullUp','stand']);
runTape('deliberate climb-down', ['stand','climbDown','hang','pullUp','stand']);
runTape('low mantle to continued movement', ['stand','step','lowMantle','step','runStart','run']);
runTape('landing reverse', ['air','land','pivot','stand']);
runTape('running landing release', ['air','landRun','runStop','stand']);
runTape('crouch and roll', ['stand','crouch','crouchIdle','crouchWalk','crouchIdle','roll','crouchIdle','standUp','stand']);

for (const [from, to] of [
  ['land','pivot'],
  ['landRun','runStart'],
  ['lowMantle','step'],
]) ok(isLegalMovementTransition(from, to), `${from} -> ${to} is represented in the contract`);

const strict = new StateMachine({ initial: 'stand', transitions: MOVEMENT_TRANSITIONS, strict: true });
assert.throws(() => strict.go('hang'), /Illegal state transition/, 'impossible stand -> hang still fails loudly'); checks++;

const heroSource = await readFile(new URL('../js/movement-hero.js', import.meta.url), 'utf8');
const v3Source = await readFile(new URL('../js/movement-hero-v3.js', import.meta.url), 'utf8');
for (const sourceEdge of [
  "this.go('pivot')",
  "this.go('runStart')",
  "this.go(input.dir === this.face ? 'step' : 'stand')",
]) ok(heroSource.includes(sourceEdge), `runtime source still contains expected edge: ${sourceEdge}`);
ok(v3Source.includes('transitionFaults'), 'V3 runtime counts transition faults');
ok(v3Source.includes('StateMachine'), 'V3 runtime routes transitions through shared StateMachine');

console.log(`Flash Prince movement contract: ${checks} checks passed`);

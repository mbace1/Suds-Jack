// fsm.mjs — the declared state machine (js/fsm.js): moves, exit and enter actions in order, the record, and an
// undeclared move recorded rather than refused. Bare node.
import { machine } from '../js/fsm.js?v=157';

let failed = 0, n = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { failed++; console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`); } };

const log = [];
const m = machine('t', {
  initial: 'a',
  moves: { a: ['b'], b: ['a', 'c'], c: [] },
  exit: { a: (to, why) => log.push(`exit a→${to} ${why}`) },
  enter: { b: (from, why) => log.push(`enter b←${from} ${why}`) },
});
check('it starts where it is told', m.state === 'a' && m.is('a') && !m.is('b', 'c'));
check('can() reads the table', m.can('b') && !m.can('c'));
check('a declared move is made and says so', m.go('b', 'go', 1.5) === true && m.state === 'b' && m.since === 1.5);
check('exit runs before enter, each told where and why', log.join('|') === 'exit a→b go|enter b←a go', log.join('|'));
check('a move to the same state is no move', m.go('b', 'again', 2) === true && m.history.length === 1 && m.since === 1.5);
check('a declared move out', m.go('c', 'end', 3) && m.state === 'c');
const seen = []; const off = m.on((rec, ok) => seen.push(`${rec.from}→${rec.to}:${ok}`));
check('an undeclared move still happens, and is recorded', m.go('a', 'odd', 4) === false && m.state === 'a' && m.violations.length === 1 && m.violations[0].from === 'c', JSON.stringify(m.violations));
check('a listener hears every move, declared or not', seen.join(',') === 'c→a:false', seen.join(','));
off(); m.go('b', 'quiet', 5);
check('and stops hearing when it lets go', seen.length === 1);
let threw = false; try { m.go('nowhere'); } catch { threw = true; }
check('a state the table does not have is a bug, and throws', threw && m.state === 'b');
check('the record keeps every move made, oldest first', m.history.map((r) => r.to).join('') === 'bcab', m.history.map((r) => r.to).join(''));
const s = m.snapshot();
check('the snapshot is the state, its age, the last moves and the undeclared ones', s.state === 'b' && s.since === 5 && s.history.length === 4 && s.violations.length === 1);
const k = machine('k', { initial: 'x', moves: { x: ['y'], y: ['x'] }, keep: 3 });
for (let i = 0; i < 10; i++) k.go(i % 2 ? 'x' : 'y', String(i), i);
check('the record keeps only the last `keep` moves', k.history.length === 3 && k.history[2].why === '9');

console.log(failed ? `✗ fsm: ${failed} failed, ${n - failed} passed` : `✔ fsm: ${n} checks`);
if (failed) process.exit(1);

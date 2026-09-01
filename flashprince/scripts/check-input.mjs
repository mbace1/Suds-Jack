import assert from 'node:assert/strict';

const windowHandlers = {};
const surfaceHandlers = {};
global.addEventListener = (name, fn) => { windowHandlers[name] = fn; };
global.matchMedia = () => ({ matches: true });
global.document = { getElementById: () => ({
  addEventListener(name, fn) { surfaceHandlers[name] = fn; },
}) };

let pads = [];
Object.defineProperty(global, 'navigator', { value: { getGamepads: () => pads }, configurable: true });

const { Input } = await import('../js/input.js');
const input = new Input({ toDisplay: (x, y) => ({ x, y }) });
const reset = () => {
  input.held.clear(); input.latch = {}; input.pointers.clear(); input.touch = false;
  input.jump = false; input.jumpPress = false; input.up = false; pads = [];
};
const buttons = () => Array.from({ length: 16 }, () => ({ pressed: false }));

windowHandlers.keydown({ code: 'KeyZ', repeat: false, preventDefault() {} });
input.poll();
assert.equal(input.jumpPress, true, 'Z must jump');

reset();
windowHandlers.keydown({ code: 'ArrowUp', repeat: false, preventDefault() {} });
input.poll();
assert.equal(input.up, true, 'keyboard up must remain directional');
assert.equal(input.jumpPress, true, 'keyboard up must jump');

reset();
input.setZones([{ name: 'up', x: 0, y: 0, w: 40, h: 40 }]);
surfaceHandlers.touchstart({ changedTouches: [{ identifier: 1, clientX: 20, clientY: 20 }], preventDefault() {} });
input.poll();
assert.equal(input.up, true, 'mobile up must remain directional');
assert.equal(input.jumpPress, true, 'mobile up must jump');

reset();
pads = [{ axes: [0, 0, 0, -1], buttons: buttons() }];
input.poll();
assert.equal(input.jumpPress, true, 'right-stick up must jump');

reset();
const pressButtons = buttons(); pressButtons[11].pressed = true;
pads = [{ axes: [0, 0, 0, 0], buttons: pressButtons }];
input.poll();
assert.equal(input.jumpPress, true, 'right-stick press must jump');

console.log('input checks ok — Z/up, mobile up, right-stick up and press jump');

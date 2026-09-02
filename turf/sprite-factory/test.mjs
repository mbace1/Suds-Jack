import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRenderPacket, oppositePhaseFrame, validateTarget } from './render-packet-lib.mjs';

const manifest = {
  directions: ['front_iso','rear_iso'],
  actions: {
    idle: { targetFrames: 4, phases: ['rest','inhale','peak','exhale'] },
    move: { targetFrames: 12, requiresMotionLedger: true, phases: [
      'left_contact','left_compression','left_push','left_pass','left_reach','left_precontact',
      'right_contact','right_compression','right_push','right_pass','right_reach','right_precontact'
    ] }
  },
  validation: { background:'#FF00FF', preferredPlate:[192,288], quantise:false },
  characters: [{ id:'toko_slomo', label:'Toko Slomo', source:'casting-sheet-full' }]
};

const candidates = { records: [
  { character:'toko_slomo', action:'move', direction:'front_iso', frame:1, status:'approved', asset:'f01.png' },
  { character:'toko_slomo', action:'move', direction:'front_iso', frame:7, status:'approved', asset:'f07.png' },
  { character:'toko_slomo', action:'move', direction:'rear_iso', frame:7, status:'approved', asset:'rear07.png' }
]};

test('move opposite phase maps half a cycle, same facing', () => {
  assert.equal(oppositePhaseFrame(manifest.actions.move, 'move', 1), 7);
  assert.equal(oppositePhaseFrame(manifest.actions.move, 'move', 7), 1);
});

test('render packet uses exact previous and same-facing opposite phase', () => {
  const packet = buildRenderPacket(manifest, candidates, { character:'toko_slomo', action:'move', direction:'front_iso', frame:7 });
  assert.equal(packet.target.phase, 'right_contact');
  assert.equal(packet.target.pairedOppositeFrame, 1);
  assert.equal(packet.references.pairedOppositePhaseFrame, 'f01.png');
  assert.notEqual(packet.references.pairedOppositePhaseFrame, 'rear07.png');
  assert.equal(packet.motion.requiresLedger, true);
});

test('does not silently use a non-adjacent earlier frame as previous', () => {
  const packet = buildRenderPacket(manifest, candidates, { character:'toko_slomo', action:'move', direction:'front_iso', frame:7 });
  assert.equal(packet.references.previousApprovedFrame, null);
});

test('idle phase is derived from manifest frame order', () => {
  const packet = buildRenderPacket(manifest, {records:[]}, { character:'toko_slomo', action:'idle', direction:'front_iso', frame:3 });
  assert.equal(packet.target.phase, 'peak');
  assert.equal(packet.target.pairedOppositeFrame, null);
});

test('invalid frames are rejected', () => {
  assert.throws(() => validateTarget(manifest, { character:'toko_slomo', action:'move', direction:'front_iso', frame:13 }), /requires 1\.\.12/);
  assert.throws(() => validateTarget(manifest, { character:'toko_slomo', action:'move', direction:'front_iso', frame:1.5 }), /Invalid frame/);
});

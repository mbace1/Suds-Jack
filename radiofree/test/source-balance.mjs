#!/usr/bin/env node
import assert from 'node:assert/strict';
import { rankAndBalance, scoreItem, topicOf } from '../tools/source-balance.mjs';

const now = new Date('2026-09-01T06:00:00Z');
const item = (title, source='feeds.yle.fi', when='2026-09-01T05:00:00Z') => ({ title, source, when, summary: '', link: 'x' });

assert.equal(topicOf(item('Helsinki tram service changes in Kallio')), 'helsinki');
assert.equal(topicOf(item('New AI chip arrives for game developers', 'arstechnica.com')), 'tech');
assert.ok(scoreItem(item('Helsinki housing decision'), now) > scoreItem(item('Global finance briefing', 'unknown.example', '2026-08-25T05:00:00Z'), now));

const mixed = rankAndBalance([
  item('Helsinki tram service changes in Kallio'),
  item('Helsinki tram service changes in Kallio again'),
  item('Finland border monitoring expands'),
  item('AI robot pilot reaches shops', 'arstechnica.com'),
  item('New Finnish metal documentary premieres'),
  item('Bear walks through city parking garage'),
  item('Technology company launches another AI robot', 'theregister.com'),
  item('World politics briefing', 'unknown.example'),
], 6, now);

assert.equal(mixed.length, 6);
assert.ok(mixed.some(x => x.topic === 'helsinki'));
assert.ok(mixed.some(x => x.topic === 'tech'));
assert.ok(mixed.some(x => x.topic === 'culture'));
assert.ok(!mixed.every(x => x.source === 'feeds.yle.fi'));
console.log('✓ RFH source balance');

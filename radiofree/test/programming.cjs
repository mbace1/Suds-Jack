const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const mod = await import(pathToFileURL(path.resolve(__dirname, '../tools/generate-programmed-wire.mjs')).href);

  const items = [
    { title: 'Helsinki metro opens two new entrances for 12000 daily passengers', summary: '', source: 'local' },
    { title: 'Game studio cuts 90 jobs after project review', summary: '', source: 'games' },
    { title: 'AI data centre adds 40 MW of capacity', summary: '', source: 'tech' },
    { title: 'Night museum programme brings 14 galleries together', summary: '', source: 'culture' },
    { title: 'GPS interference reported near Baltic route', summary: '', source: 'signal' },
    { title: 'City bakery installs a robot that names every bun', summary: 'A small local experiment served 300 customers.', source: 'odd' },
    { title: 'Finnish operator launches 6 new services', summary: '', source: 'general' },
    { title: 'Port authority votes to rebuild terminal', summary: 'Work affects 800 passengers each day.', source: 'general' },
  ];

  const picked = mod.programmeCandidates(items, 7);
  assert.ok(picked.length >= 7, 'desk should provide enough candidates for a seven-story programme');
  assert.ok(picked.some(x => x.desk === 'CITY'), 'CITY candidate missing');
  assert.ok(picked.some(x => x.desk === 'GAMES'), 'GAMES candidate missing');
  assert.ok(picked.some(x => x.desk === 'TECH'), 'TECH candidate missing');
  assert.ok(picked.some(x => x.desk === 'SIGNAL'), 'SIGNAL candidate missing');
  assert.ok(picked.some(x => x.desk === 'ODD WIRE'), 'ODD WIRE candidate missing');

  const draft = { stories: [{
    id: 'test-story', label: 'CITY', visual: 'chart', broll: 'kamppi',
    visualBeat: 'The impressive total collapses when the missing denominator becomes visible.',
    en: { slug: 'HELSINKI', head: 'Test', lines: ['{{Spin|Plain}} and {{more spin|more plain}}'], technique: 'TEST', decodeNote: 'Test decode note.', tell: 'What changed?' },
    fi: { slug: 'HELSINKI', head: 'Testi', lines: ['{{Kierre|Suora}} ja {{lisää|suoraan}}'], technique: 'TESTI', decodeNote: 'Testi.', tell: 'Mikä muuttui?' },
    ja: { slug: 'ヘルシンキ', head: 'テスト', lines: ['{{表現|意味}}、{{追加|意味}}'], technique: 'テスト', decodeNote: 'テスト。', tell: '何が変わった？' },
  }] };
  const wire = mod.assemble(draft, '2026-08-26');
  assert.equal(wire.stories[0].label, 'CITY');
  assert.match(wire.stories[0].visualBeat, /denominator/);

  console.log('programming.cjs: ok');
})().catch(err => {
  console.error(err);
  process.exit(1);
});

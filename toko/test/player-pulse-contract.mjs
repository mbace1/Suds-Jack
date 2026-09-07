import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const questions=JSON.parse(read('PLAYER_QUESTIONS.json'));const pulse=read('js/player-pulse.js');const future=read('js/dev-future.js');const index=read('index.html');
assert.equal(questions.schema,1);assert.ok(questions.questions.length>=4);
const ids=new Set();for(const q of questions.questions){assert.match(q.id,/^[a-z0-9.-]+$/);assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(q.project);assert.ok(q.trigger);assert.ok(q.prompt.length>10);assert.ok(q.answers.length>=2&&q.answers.length<=4);assert.ok(q.why);assert.ok(q.destination);assert.ok(pulse.includes(q.id),`runtime missing ${q.id}`)}
assert.ok(pulse.includes("dispatchEvent(new CustomEvent('toko:pulse'"));
assert.ok(pulse.includes('development evidence, not a vote'));
assert.ok(future.includes('QUEUE SOURCE UNAVAILABLE'));
assert.ok(future.includes('LIKELY, NOT PROMISED'));
assert.ok(future.includes('THIS IS FACT, NOT MY PREDICTION'));
assert.ok(index.includes('js/player-pulse.js?v=1'));
assert.ok(index.includes('js/future-conversation.js?v=1'));
console.log(`player-pulse-contract: ${questions.questions.length} questions · provenance labels present · live scripts wired`);

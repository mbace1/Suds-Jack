import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { JOBS } from '../js/deliveries.js';
import { createFlow } from '../../flow-core/sim.js';
const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8'));
const city=buildRealHelsinki(pack);
assert.equal(city.nodes.length,22,'delivery board exposes twenty-two real HSL anchors');
assert.equal(city.source.exactGeometry,true,'gameplay board is sourced from exact HSL pack');
for(const n of city.nodes){assert.ok(Number.isFinite(n.lat)&&Number.isFinite(n.lon),`${n.id} keeps real coordinates`);assert.ok(n.hslStopId,`${n.id} keeps HSL stop identity`);}
for(const id of ['lasipalatsi','ooppera','messukeskus','lansiterminaali','eira','kapyla','hietalahti','meilahti','arabia','olympiaterminaali'])assert.ok(city.nodes.some(n=>n.id===id),`${id} expanded anchor exists`);
assert.ok(city.lines.length>=10,`expected many real services through anchors, got ${city.lines.length}`);
assert.ok(city.lines.some(l=>l.label==='M1'&&l.mode==='metro'),'real M1 is a fixed service');
assert.ok(city.lines.some(l=>l.label==='M2'&&l.mode==='metro'),'real M2 is a fixed service');
assert.ok(city.lines.some(l=>l.mode==='tram'),'real tram services are fixed services');
for(const l of city.lines)assert.equal(new Set(l.nodes).size,l.nodes.length,`${l.label} has no repeated gameplay anchor`);
const flow=createFlow({city,seed:7,days:1,demand:null});
assert.equal(flow.routes.list.length,city.lines.length,'every source-derived service validates in flow-core');
for(const job of JOBS)for(const id of job.stops)assert.ok(flow.graph.node(id),`job anchor ${id} exists`);
assert.equal(JOBS.length,10,'campaign remains ten jobs');
// v2.12 dropped authored per-job `event` pressure for the live moments and
// recovery systems, so asserting `.event` tested a field that no longer exists.
// What the campaign still has to guarantee is a shape worth pinning:
// it is a CHAIN — each job starts where the last one ended, so the shift is one
// continuous run across the city rather than ten teleports —
assert.ok(JOBS.every((j,i)=>i===0||j.stops[0]===JOBS[i-1].stops.at(-1)),'the shift is one chain: each job starts where the last ended');
// it escalates — the back half carries more time pressure per job than the front —
const front=JOBS.slice(0,5).reduce((a,j)=>a+j.limit,0),back=JOBS.slice(5).reduce((a,j)=>a+j.limit,0);
assert.ok(back>front,`late campaign should carry longer, harder runs (front ${front}t vs back ${back}t)`);
// and it teaches — every cargo rule the game owns is actually met during a shift.
assert.ok(new Set(JOBS.map(j=>j.cargo)).size>=6,'a shift exercises most of the cargo rules');
for(const job of JOBS)assert.ok(job.limit>0&&job.value>0,'every job has a deadline and a payout');
console.log(`real Helsinki gameplay: ${city.nodes.length} anchors, ${city.lines.length} HSL fixed services, ${city.edges.filter(e=>e.mode==='tram').length} tram links, ${city.edges.filter(e=>e.mode==='metro').length} metro links`);

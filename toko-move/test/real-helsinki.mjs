import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { JOBS } from '../js/deliveries.js';
import { createFlow } from '../../flow-core/sim.js';

const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8'));
const city=buildRealHelsinki(pack);
assert.equal(city.nodes.length,12,'delivery board keeps twelve readable anchors');
assert.equal(city.source.exactGeometry,true,'gameplay board is sourced from exact HSL pack');
for(const n of city.nodes){assert.ok(Number.isFinite(n.lat)&&Number.isFinite(n.lon),`${n.id} keeps real coordinates`);assert.ok(n.hslStopId,`${n.id} keeps HSL stop identity`);}
assert.ok(city.lines.length>=10,`expected many real services through anchors, got ${city.lines.length}`);
assert.ok(city.lines.some(l=>l.label==='M1'&&l.mode==='metro'),'real M1 is a fixed service');
assert.ok(city.lines.some(l=>l.label==='M2'&&l.mode==='metro'),'real M2 is a fixed service');
assert.ok(city.lines.some(l=>l.mode==='tram'),'real tram services are fixed services');
for(const l of city.lines)assert.equal(new Set(l.nodes).size,l.nodes.length,`${l.label} has no repeated gameplay anchor`);

const flow=createFlow({city,seed:7,days:1,demand:null});
assert.equal(flow.routes.list.length,city.lines.length,'every source-derived service validates in flow-core');
for(const job of JOBS)for(const id of job.stops)assert.ok(flow.graph.node(id),`job anchor ${id} exists`);

console.log(`real Helsinki gameplay: ${city.nodes.length} anchors, ${city.lines.length} HSL fixed services, ${city.edges.filter(e=>e.mode==='tram').length} tram links, ${city.edges.filter(e=>e.mode==='metro').length} metro links`);

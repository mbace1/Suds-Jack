import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TransitLayers } from '../js/transit-layers.js';

const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8'));
const transit=new TransitLayers(pack);
assert.equal(transit.layers.length,pack.lines.length,'one display layer per GTFS route');
for(let i=0;i<pack.lines.length;i++){
  assert.equal(transit.layers[i].id,pack.lines[i].id,'source id preserved');
  assert.equal(transit.layers[i].name,pack.lines[i].name,'source line name preserved');
  assert.equal(transit.layers[i].mode,pack.lines[i].mode,'source mode preserved');
  assert.equal(transit.layers[i].path,pack.lines[i].path,'raw GTFS geometry is not copied or simplified');
}
const target=transit.layers.find(line=>line.mode==='TRAM');assert.ok(target,'tram layer exists');
transit.solo(target.id);assert.deepEqual(transit.visibleLines().map(line=>line.id),[target.id],'a single tram can be soloed');
transit.toggle(target.id);assert.equal(transit.visibleLines().length,0,'individual line can be hidden');
transit.showAll('TRAM');assert.ok(transit.visibleLines().every(line=>line.mode==='TRAM'),'tram-only view hides metro');
transit.showAll();assert.equal(transit.visibleLines().length,pack.lines.length,'show all restores every source layer');
assert.equal(pack.clippedTo,undefined,'v2.8 source is full network, not the old central clip');
assert.equal(pack.exactGeometry,true);assert.equal(pack.shapeToleranceMetres,0);assert.equal(pack.licence,'CC BY 4.0');
assert.ok(transit.bounds.n-transit.bounds.s>.05,'full layer bounds span city north/south');
assert.ok(transit.bounds.e-transit.bounds.w>.08,'full layer bounds span city east/west');
console.log(`transit layers: ${pack.lines.length}/${pack.lines.length} full-network source lines preserved`);

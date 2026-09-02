import { spawnSync } from 'node:child_process';

const suites = [
  { name:'Flash Prince movement tapes', cmd:['node','--experimental-default-type=module','flashprince/test/movement-tapes.mjs'] },
  { name:'Tiny Hawk smoke', cmd:['node','tinyhawk/test/smoke.mjs'] },
  { name:'Tiny Hawk physics benchmark', cmd:['node','tinyhawk/test/physics-benchmark.mjs'] },
  { name:'Hyper Dagger offline', cmd:['node','hyperdagger/test/offline.cjs'] },
  { name:'Hyper Dagger smoke', cmd:['node','hyperdagger/test/smoke.cjs'] },
];

let failed=0;
for (const suite of suites) {
  const [bin,...args]=suite.cmd;
  const r=spawnSync(bin,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const ok=r.status===0;
  console.log(`${ok?'PASS':'FAIL'}  ${suite.name}`);
  const text=[r.stdout,r.stderr].filter(Boolean).join('\n').trim();
  if(text) console.log(text.split('\n').map(x=>'  '+x).join('\n'));
  if(!ok) failed++;
}
console.log(`\n${failed?'FAIL':'PASS'}  Suds Game Core: ${suites.length-failed}/${suites.length} suites green`);
process.exitCode=failed?1:0;

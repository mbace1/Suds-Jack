import test from 'node:test';
import assert from 'node:assert/strict';
import { bindWorkflow, outputImages, executeJob } from './comfy-worker.mjs';

test('workflow placeholders bind deterministically',()=>{
  const t={a:'{{REFERENCE_IMAGE}}',b:{image:'{{POSE_IMAGE}}',prefix:'{{OUTPUT_PREFIX}}'}};
  const w=bindWorkflow(t,{REFERENCE_IMAGE:'ref.png',POSE_IMAGE:'pose.png',OUTPUT_PREFIX:'turf_x'});
  assert.equal(w.a,'ref.png');assert.equal(w.b.image,'pose.png');assert.equal(w.b.prefix,'turf_x');
});

test('missing bindings fail closed',()=>assert.throws(()=>bindWorkflow({x:'{{POSE_IMAGE}}'},{}),/missing workflow binding/));

test('history extraction requires image outputs only',()=>{
  const images=outputImages({outputs:{'9':{images:[{filename:'a.png',subfolder:'',type:'output'}]},'10':{text:['ignored']}}});
  assert.equal(images.length,1);assert.equal(images[0].filename,'a.png');
});

test('worker refuses any job that could surface raw output',async()=>{
  const job={visibility:'visible',output:{surfaceToUser:true,state:'approved'},identityReference:'x',poseControl:{image:'y',pose:{}},camera:{direction:'front_iso'}};
  await assert.rejects(()=>executeJob({baseUrl:'http://invalid',job,workflowTemplate:{},outputFile:'z'}),/refusing non-hidden generation job/);
});

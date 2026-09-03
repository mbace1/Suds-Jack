import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPose, assertDirection } from './pose-control.mjs';
import { buildComfyJob } from './comfy-job.mjs';

test('only authored isometric directions are legal',()=>{
  assert.doesNotThrow(()=>assertDirection('front_iso'));
  assert.doesNotThrow(()=>assertDirection('rear_iso'));
  assert.throws(()=>assertDirection('side'),/forbidden direction/);
  assert.throws(()=>assertDirection('profile'),/forbidden direction/);
});

test('move opposite contacts own opposite legs',()=>{
  const f1=buildPose({direction:'front_iso',action:'move',frame:1});
  const f7=buildPose({direction:'front_iso',action:'move',frame:7});
  assert.notDeepEqual(f1.joints.lAnkle,f7.joints.lAnkle);
  assert.notDeepEqual(f1.joints.rAnkle,f7.joints.rAnkle);
  assert.equal(f1.phase,'left_contact');
  assert.equal(f7.phase,'right_contact');
});

test('pose-controlled jobs are hidden and quarantine-only',()=>{
  const job=buildComfyJob({character:'cast_12_heavy_puffer_hammer',reference:'master.png',direction:'rear_iso',action:'idle',frame:1,poseImage:'pose.png'});
  assert.equal(job.visibility,'hidden');
  assert.equal(job.output.surfaceToUser,false);
  assert.equal(job.output.state,'quarantine');
  assert.match(job.camera.rule,/never side\/profile/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPose, assertDirection, poseIsIsometric } from './pose-control.mjs';
import { buildComfyJob } from './comfy-job.mjs';

test('only authored isometric directions are legal',()=>{
  assert.doesNotThrow(()=>assertDirection('front_iso'));
  assert.doesNotThrow(()=>assertDirection('rear_iso'));
  assert.throws(()=>assertDirection('side'),/forbidden direction/);
  assert.throws(()=>assertDirection('profile'),/forbidden direction/);
});

test('front and rear poses are structurally three-quarter isometric',()=>{
  for(const direction of ['front_iso','rear_iso']){
    for(const frame of [1,4,7,10]){
      const p=buildPose({direction,action:'move',frame});
      assert.equal(p.camera.type,'tactical_three_quarter_isometric');
      assert.equal(p.camera.sideProfileAllowed,false);
      assert.equal(poseIsIsometric(p),true);
      assert.ok(Math.abs(p.joints.lShoulder[1]-p.joints.rShoulder[1])>=5);
      assert.ok(Math.abs(p.joints.lHip[1]-p.joints.rHip[1])>=4);
    }
  }
});

test('front and rear reverse near/far body depth instead of becoming profiles',()=>{
  const front=buildPose({direction:'front_iso',action:'idle',frame:1});
  const rear=buildPose({direction:'rear_iso',action:'idle',frame:1});
  assert.equal(front.camera.nearSide,'right');
  assert.equal(rear.camera.nearSide,'left');
  assert.notDeepEqual(front.joints.lShoulder,rear.joints.lShoulder);
  assert.notDeepEqual(front.joints.rShoulder,rear.joints.rShoulder);
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

// The pipeline door, end to end: the reference exports loaded back through
import { open, OUT } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'high', query: 'models=reference' });
console.log('menu says:', await p.evaluate(() => (document.getElementById('msg').textContent.match(/SHIPS[^\n]*/) || [''])[0].replace(/\s+/g, ' ')));
await p.evaluate(() => window.__pw.debug.start());
await p.evaluate(() => { const g = window.__pw;
  g.input.read = o => { o.steer=0.3; o.throttle=1; o.brake=false; o.lean=0; o.pan=0; o.overdrive=false; return o; }; });
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => { const g = window.__pw;
  const per = g.field.map(v => { let n = 0; v.mesh.traverse(o => { if (o.isMesh || o.isSprite) n++; }); return `${v.drive}:${v.mesh.userData.model || 'kit'}:${n}`; });
  let land = 0; for (const t of g.terrain.tiles.values()) land += (t.props.userData.rocks || []).filter(r => r.r > 4).length;
  return JSON.stringify({ ships: per, landmarks: g.models.landmarks.length, placedLandmarkFootprints: land, kph: Math.round(g.player.kph) });
}));
// the close-up, same rig as shop.mjs
await p.evaluate(() => { const g = window.__pw, T = g.THREE, v = g.player;
  g.state.mode = 'paused'; document.getElementById('msg').style.display = 'none';
  v.n1 = 0.9; v.throttle = 1; v.pose(0.016);
  const fwd = new T.Vector3(Math.sin(v.yaw), 0, -Math.cos(v.yaw)), right = new T.Vector3(Math.cos(v.yaw), 0, Math.sin(v.yaw));
  g.camera.position.copy(v.pos).addScaledVector(right, 7).addScaledVector(fwd, -11); g.camera.position.y += 2.5;
  g.camera.lookAt(v.pos.x, v.pos.y + 0.2, v.pos.z); g.camera.fov = 45; g.camera.updateProjectionMatrix();
  g.sky.update(g.camera); g.flare.update(g.camera); });
await p.waitForTimeout(400);
await p.screenshot({ path: OUT + '/' + 'roundtrip-ship.png' });
await close();

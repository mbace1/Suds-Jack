#!/usr/bin/env bash
# Headless smoke test — actually EXECUTES the game before a release.
#
# Born from the v93/v94 incident: a parse-broken designer.js black-screened
# the live game through four releases of green "checks" because nothing ever
# ran the code. This boots the real game in headless Chromium against a
# locally-vendored three.js (the sandbox proxy blocks the CDN) and fails on
# any uncaught error; it also runs a harness that spawns every enemy type,
# steps 30 frames, and does a hit/kill pass.
#
# Requirements: node/npm (registry.npmjs.org reachable), Chromium at
# $CHROMIUM or /opt/pw-browsers/chromium, python3.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
WORK="${SMOKE_DIR:-/tmp/toko-smoke}"
PORT="${SMOKE_PORT:-8763}"
THREE_VER=0.167.0

mkdir -p "$WORK"

# 1) Vendor three.js locally (cached between runs)
if [ ! -f "$WORK/three/build/three.module.js" ]; then
  echo "· fetching three@$THREE_VER from npm"
  (cd "$WORK" && npm pack "three@$THREE_VER" --silent >/dev/null && \
   tar xzf "three-$THREE_VER.tgz" && rm -rf three && mv package three)
fi

# 2) Fresh copy of the game with the importmap pointed at the local three
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
python3 - "$WORK/testbed/index.html" <<'EOF'
import sys
p = sys.argv[1]
src = open(p).read()
src = src.replace('https://cdn.jsdelivr.net/npm/three@0.167.0/build/three.module.js', '../three/build/three.module.js')
src = src.replace('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/', '../three/examples/jsm/')
open(p, 'w').write(src)
EOF

# 3) Harness: spawn every enemy type, 30 update frames, hit/kill pass
cat > "$WORK/testbed/harness.html" <<'EOF'
<!DOCTYPE html>
<html><head><script type="importmap">
{ "imports": { "three": "../three/build/three.module.js", "three/addons/": "../three/examples/jsm/" } }
</script></head><body>
<script type="module">
  import * as THREE from 'three';
  import { Enemy, EnemyType, GOO_TIME } from './js/enemy.js';
  const out = (m) => console.log('HARNESS: ' + m);
  try {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(320, 240);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(8, 20, 10); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(60, 1.33, 0.1, 120);
    camera.position.set(0, 20, 14); camera.lookAt(0, 0, 0);
    const stub = { spawnDir() {} };
    const ghost = { x: 3, z: 1 };
    const enemies = [];
    for (const [name, type] of Object.entries(EnemyType)) {
      try { enemies.push([name, new Enemy(scene, type, Math.random()*8-4, Math.random()*8-4, 1, 1)]); }
      catch (e) { out('SPAWN FAIL ' + name + ': ' + e.message); }
    }
    out('spawned ' + enemies.length + ' types');
    for (let f = 0; f < 30; f++) {
      GOO_TIME.value += 0.016;
      for (const [name, e] of enemies) {
        try { e.update(0.016, ghost, stub, 11, 18); e.updateDeath(0.016); }
        catch (err) { out('UPDATE FAIL ' + name + ' f' + f + ': ' + err.message); throw err; }
      }
      renderer.render(scene, camera);
    }
    for (const [name, e] of enemies) {
      try { e.hit(e.position.x + 1, e.position.z); if (e.alive) e.destroy(); e.updateDeath(0.016); }
      catch (err) { out('HIT/KILL FAIL ' + name + ': ' + err.message); }
    }
    renderer.render(scene, camera);
    out('ALL OK');
  } catch (e) { out('FATAL: ' + e.message); }
</script></body></html>
EOF

# The harness imports enemy.js without a cache token; make a token-free alias
# resolve regardless of the current ?v= (imports inside enemy.js keep theirs).

# 4) Serve + run headless (exact-PID cleanup — pkill is blocked in some sandboxes)
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

run_page() {
  timeout 60 "$CHROMIUM" --headless=new --disable-gpu --no-sandbox \
    --enable-unsafe-swiftshader --enable-logging=stderr --v=0 --no-proxy-server \
    --virtual-time-budget=15000 --dump-dom "http://127.0.0.1:$PORT/testbed/$1" \
    2>&1 >/dev/null | grep -i "CONSOLE" || true
}

echo "· booting index.html"
BOOT=$(run_page index.html)
if echo "$BOOT" | grep -qi "uncaught\|SyntaxError\|TypeError\|ReferenceError"; then
  echo "$BOOT" | grep -i "uncaught\|error" | head -5
  echo "✗ SMOKE FAIL: game boot threw"
  exit 1
fi

echo "· running enemy harness"
HARNESS=$(run_page harness.html)
echo "$HARNESS" | grep -o "HARNESS: [^\"]*" | head -5
if ! echo "$HARNESS" | grep -q "HARNESS: ALL OK"; then
  echo "✗ SMOKE FAIL: harness did not report ALL OK"
  exit 1
fi

echo "✔ smoke passed: game boots clean, all enemy types exercise OK"

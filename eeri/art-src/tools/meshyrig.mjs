#!/usr/bin/env node
/**
 * MESHY AUTO-RIG + ANIMATION — the primary path for any character.
 *
 * Meshy rigs a humanoid itself: a real 24-bone skeleton with SKIN WEIGHTS, in
 * about a minute, for 5 credits, and it hands back walking and running clips
 * in the same response. Animations from a 600+ clip library are 3 credits each.
 *
 * That supersedes `slice.mjs` for characters completely, and it is not close:
 *   - real ELBOWS and KNEES (LeftForeArm / LeftLeg), which a plane-cut rig
 *     cannot have without cutting every limb twice and capping four more holes
 *   - skinning, so a bent joint DEFORMS instead of parting company — no cut
 *     faces, no caps, no hollow-leg problem at extreme angles
 *   - clips authored by animators, so the counter-swing, the elbow pump and
 *     the jump anticipation are all just there
 * `slice.mjs` remains the tool for MACHINES, which are not bipedal and which
 * Meshy's rigger explicitly does not handle.
 *
 *   node meshyrig.mjs rig <image-to-3d-task-id> [heightMeters]
 *   node meshyrig.mjs anim <rig-task-id> <actionId> [name]
 *   node meshyrig.mjs get <rig|anim> <task-id>
 *
 * Needs MESHY_API_KEY in the env. Writes GLBs into ./out/rig/.
 *
 * INPUT REQUIREMENTS, and they are why the concept rules exist:
 *   - GLB, textured, under 300k faces
 *   - a standard bipedal humanoid with CLEARLY DEFINED LIMBS — which is what
 *     the T-pose rule buys. Limbs fused to the torso are exactly what the
 *     rigger cannot read.
 *   - the face must point +Z (glTF forward). Meshy's own image-to-3D output
 *     already does; do not pre-rotate it toward the game's +x facing, or the
 *     skeleton comes out sideways. Rotate at the root when you mount it.
 */
import { writeFile, mkdir } from 'node:fs/promises'

const API = 'https://api.meshy.ai/openapi/v1'
const KEY = process.env.MESHY_API_KEY
if (!KEY) { console.error('MESHY_API_KEY not set'); process.exit(1) }
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const [cmd, ...rest] = process.argv.slice(2)

async function poll (kind, id) {
  const path = kind === 'rig' ? 'rigging' : 'animations'
  for (let i = 0; i < 120; i++) {
    const r = await fetch(`${API}/${path}/${id}`, { headers: H })
    const d = await r.json()
    if (d.status === 'SUCCEEDED') return d
    if (d.status === 'FAILED') { console.error('FAILED:', JSON.stringify(d.task_error)); process.exit(1) }
    process.stdout.write(`\r  ${d.status} ${d.progress ?? 0}%   `)
    await new Promise(s => setTimeout(s, 5000))
  }
  console.error('\ntimed out'); process.exit(1)
}

async function save (url, name) {
  await mkdir('out/rig', { recursive: true })
  const b = Buffer.from(await (await fetch(url)).arrayBuffer())
  await writeFile(`out/rig/${name}`, b)
  console.log(`  out/rig/${name}  ${(b.length / 1024).toFixed(0)} KB`)
}

if (cmd === 'rig') {
  const [taskId, height = '1.7'] = rest
  const r = await fetch(`${API}/rigging`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ input_task_id: taskId, height_meters: Number(height) }),
  })
  const { result: id, message } = await r.json()
  if (!id) { console.error(message || 'no task id'); process.exit(1) }
  console.log('rig task', id)
  const d = await poll('rig', id)
  console.log(`\n✓ rigged  (${d.consumed_credits} credits)  rig_task_id = ${id}`)
  await save(d.result.rigged_character_glb_url, 'rigged.glb')
  // walking and running ride along with the rig at no extra cost
  const b = d.result.basic_animations || {}
  if (b.walking_glb_url) await save(b.walking_glb_url, 'walk.glb')
  if (b.running_glb_url) await save(b.running_glb_url, 'run.glb')
} else if (cmd === 'anim') {
  const [rigId, actionId, name = `action${rest[1]}`] = rest
  const r = await fetch(`${API}/animations`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ rig_task_id: rigId, action_id: Number(actionId) }),
  })
  const { result: id, message } = await r.json()
  if (!id) { console.error(message || 'no task id'); process.exit(1) }
  console.log('anim task', id)
  const d = await poll('anim', id)
  console.log(`\n✓ ${name}  (${d.consumed_credits} credits)`)
  await save(d.result.animation_glb_url, `${name}.glb`)
} else if (cmd === 'get') {
  const [kind, id] = rest
  const d = await poll(kind, id)
  console.log('\n' + JSON.stringify(d.result, null, 1))
} else {
  console.error('usage: meshyrig.mjs rig <taskId> [heightM] | anim <rigId> <actionId> [name] | get <rig|anim> <id>')
  process.exit(1)
}

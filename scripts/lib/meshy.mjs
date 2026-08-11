// Meshy — image to 3D — behind one function.
//
//   imageTo3D({ image, ... })  ->  { glb, thumbnail, taskId }
//
// Two differences from the image side, both of which shape the CLI above it.
//
// 1. It is ASYNCHRONOUS. You POST a task, get an id, and poll until it says
//    SUCCEEDED. A mesh takes minutes, not seconds, so the CLI runs 3D work
//    last and one at a time, and prints progress — a silent five-minute wait
//    is indistinguishable from a hang.
// 2. It takes an IMAGE, not words. That is why the manifest's 3D specs carry a
//    `from` and no prompt of their own: nano banana draws the plate, meshy
//    lifts that exact plate. The chain the owner asked for is a chain because
//    of this field.
//
// We hand it a base64 data URI rather than a URL. Everything this pipeline
// makes is a local file and there is no public bucket to stage it through;
// the API documents a data URI as an accepted form of `image_url`. NOTE: this
// is the one shape in this file that could not be verified against live docs
// when it was written (docs.meshy.ai and api.meshy.ai are both blocked by this
// environment's egress policy) — if a run 400s on the payload, that is the
// first thing to check.

const HOST = 'https://api.meshy.ai';

export function keyFrom(env = process.env) {
  return env.MESHY_API_KEY || null;
}

const TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'EXPIRED']);

export async function imageTo3D({
  image, model, topology, targetPolycount, texture, symmetry,
  apiKey, fetchImpl = fetch, onProgress = () => {}, pollMs = 5000, timeoutMs = 15 * 60 * 1000,
  sleep = ms => new Promise(r => setTimeout(r, ms)),
}) {
  if (!apiKey) throw new Error('no API key — set MESHY_API_KEY');

  const dataUri = `data:${image.mime ?? 'image/png'};base64,${image.bytes.toString('base64')}`;
  const create = await fetchImpl(`${HOST}/openapi/v1/image-to-3d`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      image_url: dataUri,
      ai_model: model,
      topology,
      target_polycount: targetPolycount,
      should_texture: texture !== false,
      symmetry_mode: symmetry ?? 'auto',
    }),
  });

  const createText = await create.text();
  let created;
  try { created = JSON.parse(createText); } catch { throw new Error(`meshy: non-JSON reply (${create.status}): ${createText.slice(0, 200)}`); }
  if (!create.ok) throw new Error(`meshy: HTTP ${create.status} — ${created?.message ?? createText.slice(0, 200)}`);

  // Create has returned the bare id under `result` historically; accept the
  // obvious alternatives rather than failing on a field rename.
  const taskId = created.result ?? created.id ?? created.task_id;
  if (!taskId) throw new Error(`meshy: no task id in reply: ${createText.slice(0, 200)}`);

  const started = Date.now();
  for (;;) {
    await sleep(pollMs);
    if (Date.now() - started > timeoutMs) throw new Error(`meshy: task ${taskId} still running after ${Math.round(timeoutMs / 60000)}m`);

    const res = await fetchImpl(`${HOST}/openapi/v1/image-to-3d/${taskId}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const txt = await res.text();
    let task;
    try { task = JSON.parse(txt); } catch { throw new Error(`meshy: non-JSON poll (${res.status}): ${txt.slice(0, 200)}`); }
    if (!res.ok) throw new Error(`meshy: poll HTTP ${res.status} — ${task?.message ?? txt.slice(0, 200)}`);

    onProgress(task.progress ?? 0, task.status);
    if (!TERMINAL.has(task.status)) continue;
    if (task.status !== 'SUCCEEDED') {
      throw new Error(`meshy: task ${taskId} ${task.status}${task.task_error?.message ? ` — ${task.task_error.message}` : ''}`);
    }

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) throw new Error(`meshy: task ${taskId} succeeded with no glb url`);
    const glb = await fetchImpl(glbUrl);
    if (!glb.ok) throw new Error(`meshy: downloading glb — HTTP ${glb.status}`);
    return {
      taskId,
      glb: Buffer.from(await glb.arrayBuffer()),
      thumbnail: task.thumbnail_url ?? null,
    };
  }
}

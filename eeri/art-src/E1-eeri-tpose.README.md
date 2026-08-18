# `E1-eeri-tpose.glb` — Eeri's un-rigged source mesh

The raw image-to-3D output that `eeri_v3.glb` and `eeri_v4.glb` were rigged
from, beside the concept it was generated from (`E1-eeri-tpose.jpg`).

**It is in the repo because MESHY TASK IDS EXPIRE.** `meshyrig.mjs anim` needs
a live `rig_task_id`, and a rig needs the image-to-3D task it came from — but
the API only retains a short window of recent tasks. Four days after Eeri was
rigged, `GET /rigging`, `GET /animations` and `GET /image-to-3d` no longer
listed any of it. At that point the *only* way to add a clip to the existing
character would have been to re-generate the mesh, which is 30 credits and a
**different Eeri** — a changed character, for the sake of one animation.

Keeping the source mesh removes that risk permanently. `POST /rigging` accepts
`model_url` as well as `input_task_id` (discovered by posting `{}` and reading
the validation error), so this file can be re-rigged from a public raw URL at
any time, giving a fresh `rig_task_id` for the *same* character.

**The rule this sets: a generated asset's SOURCE belongs in the repo, not in a
vendor's task history.** The same applies to the machines — their fused meshes
are the input `slice.mjs` cuts, and a cut table is worthless without the mesh
it was measured against.

Not loaded by the game. `assets/3d/eeri_v4.glb` is the shipping character.

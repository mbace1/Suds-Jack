# Neon Ronin — versions

The public release number, read by `scripts/versions.mjs` into the arcade's
`hub/versions.json`. This log starts at the build that was already live — the
game predates the numbering, so v1 is a baptism, not a birthday.

## v2 — 2026-08-11

The orc. A new heavy from room 5 on: he wants a run-up, coils with a green
telegraph, and bull-charges in a locked straight line — get off the line and
he piles into the wall and reels, which is your window. Standing on top of
him is not a hiding place (the trample ticks), and two kinds of heavy in one
cave is mud, so he sits out the brute rooms and is capped at two.

He is also the first asset-built fighter on the floor (owner's call): a
concept-art orc run through an image-to-3D pipeline, remeshed to ~8k
triangles and 1024px webp textures (`assets/orc.glb`, ~0.9 MB), then taught
the rig language in `js/orc.js` — per-instance materials for hit-flash and
telegraph glow, whole-body poses because the mesh has no joints, and a low
emissive of his own basecolor so he does not stand in this arena as a black
silhouette. The model loads lazily and the spawn table gates on it having
arrived; on a slow connection the room rolls a brute instead.

## v1 — 2026-08-08

The build that has been on the floor all along: chain sword combos through a
neon skyline, the fighting automatic, the movement yours. Numbered so the
cabinet stops being the one with no version line and the change-detection on
the floor has something to diff against.

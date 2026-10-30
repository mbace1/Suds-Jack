# art-ref — reference art

**How to use it (owner, 2026-10-30): as mood art and design, not as a style to
copy.** The game keeps its own look (its worlds, its gels, its light); what
these give is the mood (playful, the arena as a toy, the giant blobs watching)
and the designs (what each body does: YELA's trail, ORANGE's rows of shots).

Reference art for Toko Drop's look. Never shipped: the game, the Pages deploy
and the itch zip copy only `index.html`, `js/`, `vendor/` and `levels/`, and the
commit hook does not count this folder as game files.

## concept-hand-drawn.jpg

The owner's original hand-drawn concept (shared 2026-10-30; the "concept art"
DIRECTION.md's hero line points at). What is in it:

- **The arena is a toy on a table**: a white rink with a raised rail and round
  bumper posts at the corners, standing in a landscape, with soft green hills
  and a cartoon tree behind it.
- **Two giant blobs watch the action**, peeking over the far right corner: a
  green one with an antenna, its snout resting on a corner post, and a pale
  blue one with a big red clown nose. Spectators, bigger than the arena's
  bodies, looking in.
- **The hero**, a white drop, firing a stream of cyan shots at a yellow cube
  that bursts into yellow goo and rising bubbles; a white swoosh behind it (its
  move or its dash).
- **Enemies and hazards**: an orange cube and a small yellow cube firing red
  shots in a cross; a green crystal with red crescent blades spinning round it;
  a purple spiked ring flung from a white glove; an electric fence sparking
  between two grey posts.
- **The look**: black ink outlines, soft watercolour fills, bright colours on
  white, and the TOKO DROP brush logo (in black here, yellow on 1.x).

More concepts and meshes are coming from Grok (owner, 2026-10-30). For meshes:
GLB is the easiest to bring in (three's own GLTF loader would be vendored with
the rest of three); eyes as separate parts, so they can follow the hero; a few
thousand triangles each is plenty at the play camera's distance.

## concept-yela-orange.jpg

The owner's design sheet for two cubes (shared 2026-10-30), set against the
game as it is:

- **YELA CUBE**: a yellow cube with a drip, its notes "slime trail" and
  "diagonal movement", drawn stepping corner to corner across a grid. The game
  has the slime trail (sim/species/yela.js, from 1.x); its tumble runs on the
  four straight axes only, where the sheet moves it on the diagonals.
- **ORANGE CUBE**: "row shots", red shots laid in rows. The game's ORANGE lays
  a wall of 6 to 12 parallel shots on the compass heading nearest you, and
  tumbles freely, diagonals included.
- The hero, a white drop, at the sheet's left edge.

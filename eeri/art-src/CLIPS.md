# Eeri's animation set — what is on the character and what it cost

`assets/3d/eeri_v5.glb` — 15 clips, all measured moving by
`art-src/tools/clipmeasure.mjs`.

| clip | source | for |
|---|---|---|
| `idle` `walk` `run` `jump` `sit` | v3 | the base set; walk and run ride along free with a rig |
| `climb` `stomp` `hurt` | v4 (438 / 470 / 178) | the two new verbs |
| **`idle2`** | 12 `Idle_03` | an idle BREAK — the second thing he does when you stop |
| **`lookaround`** | 333 `Look_Around_Dumbfounded` | he notices you |
| **`climbon`** | 436 `Ladder_Mount_Start` | getting on. The climb had a loop and no way in |
| **`climboff`** | 435 `Ladder_Climb_Finish` | topping out — the gate literally tests "the climb tops out with his feet on the deck" |
| **`teeter`** | 390 `Stand_on_Pole_and_Balance` | edge hesitation |
| **`talk`** | 313 `Talk_with_Hands_Open` | to-camera, for the text-box beat |
| **`confused`** | 36 `Confused_Scratch` | the puzzled take |

## Three things this cost, all worth keeping

**1. Meshy task ids expire, and that nearly cost the character.** `anim` needs
a live `rig_task_id`; four days on, `GET /rigging`, `/animations` and
`/image-to-3d` listed none of Eeri's. The only route to one more clip would
have been re-generating the mesh — 30 credits and a *different* Eeri. Fixed
permanently by committing the un-rigged source (`art-src/E1-eeri-tpose.glb`)
and discovering that `POST /rigging` accepts **`model_url`** as well as
`input_task_id` — found by posting `{}` and reading the validation error. The
source can now be re-rigged from a raw URL whenever a clip is wanted.

**2. `height_meters` is baked into every translation the rig emits.** The new
rig was requested at 1.62 m; v4 had been rigged at ~0.9 m, a six-year-old.
Same mesh, same rigger — but the new clips put the hips at 55.5 against the
base's 30.7, so dropped in raw **every step, sway and gather is 1.8× too big.**
It does not look broken. It looks like a different, larger child.

`addclips.mjs` fixes it by **scaling** the translation tracks by the ratio of
hip rest heights (rotations are scale-free). An offset would have been the
wrong tool: it puts the feet back on the floor and leaves the motion oversized
— the kind of wrong that passes a screenshot. Staging is separate and *does*
want an offset: `teeter` is authored standing on a pole, so it alone is
rebased onto `idle`'s height, by a constant, because a constant preserves the
wobble that is the whole point of the clip.

**3. A FLAT CLIP RENDERS EXACTLY LIKE A RIG AT REST.** `Idle_02` (action 11)
came back with 72 tracks, resolved every bone, packed without complaint, and
moved 0.009 units — nothing. It survives a render, a screenshot and a name
check. Only measurement catches it, which is why `clipmeasure.mjs` exists and
why it runs before install rather than after. It cost 3 credits to learn and
would have cost a lot more to find in the game.

## The one that does not exist: a KNOCK

The brief asked for *look at screen and knock*. **Meshy's library has no
knocking, tapping or poking animation at all** — the nearest forward gestures
are `214 Punch_Forward_with_Both_Fists` and the jabs, which were bought,
looked at, and rejected: they read as boxing, and a violent-coded gesture is
wrong for this game on purpose (PHASING approves humanoid rigs *as non-violent
enemies*).

So a knock has to be authored. It is a small one, and the groundwork is done:

- bones are `RightShoulder · RightArm · RightForeArm · RightHand`, and `Head`
- probed on the bind pose (`art-src/tools/probe.mjs`): **local x swings the arm
  up and down; z+ folds it in across the front.** So the gesture is z+ on
  `RightArm` to bring the hand up in front, then two small x oscillations on
  `RightForeArm` for the taps, with a `Head` yaw to camera underneath
- it should be built **over `idle`**, not from the bind pose, so the body keeps
  breathing while the arm works

`lookaround` and `confused` already cover *he notices you*; the knock is the
tap on the glass, and it is the only part of the brief still open.

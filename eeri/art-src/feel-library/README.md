# Eeri feel library — SFX + VFX timing source

Owner-directed source library for **Eeri**. This is deliberately additive: nothing in the shipping game imports this folder, no level file changes, and no binary audio is added to `assets/audio/`.

The project already has a peripheral `js/audio-fx.js` + `js/fx.js` prototype pack. This library goes one level above it: it defines a broader, coherent **feel vocabulary** that an agent can audition, tune, then port into those systems or directly into gameplay one cue at a time.

## Direction

The target is a cheerful handcrafted construction platformer: tactile, warm, readable on a phone, and never shrill or startling. The sound should feel as if **card, felt, painted wood and toy-like steel** are making the noise, rather than generic arcade beeps.

Four rules:

1. **Contact is at 0 ms.** The first audio layer and first visual stage land on the gameplay contact frame.
2. **Material follows 20–90 ms later.** A wood body followed by a little steel tick feels hand-built; a dirt hit followed by grit feels physical without getting loud.
3. **Weight comes from duration, not volume.** Girder and machine cues are longer, not louder.
4. **Frequent verbs stay tiny.** Jump, landing, water steps and UI moves must disappear quickly enough to repeat without becoming chatter.

## What is authored

`feel-cues.js` contains **26 matched audio/VFX cues** across:

- movement: jump, land, stomp, hurt
- rewards: pickup, golden pickup, checkpoint, clear
- construction: dig start/hit, brick hit, build step, girder place
- machines: mount, start, stop, quiet idle pulse, hoist arrival
- traversal: pipe enter/exit, water step
- robots: notice and tamed
- UI: move, confirm, back

The audio side is built only from `tone`, `noise` and `arp` primitives already used by Eeri's WebAudio prototype. The VFX side is plain timing/recipe data using **existing palette roles only** — no new colours are invented by effects.

## Timing examples

| event | audio rhythm | visual rhythm | design read |
|---|---|---|---|
| `jump` | felt pop @ 0, wood tick @ 24 ms | dust @ 0, sole streak @ 36 ms | tiny crafted push-off |
| `stomp` | body @ 0, steel @ 28, card @ 44 | ring @ 0, chips @ 24, dust @ 64 | force first, material second |
| `dig_hit` | dirt @ 0, grit @ 62 | dirt @ 0, grit @ 62 | one shared physical beat |
| `girder_place` | body @ 0, ring @ 34, settle @ 118 | ring @ 0, dust @ 34, settle @ 118 | heavy without being loud |
| `machine_start` | starter @ 0, pulse @ 52, pulse @ 168 | glint @ 0, puff @ 52, puff @ 168 | toy machine wakes up |
| `pipe_enter` | pop @ 0, whoosh @ 52 | tube ring @ 0, suction @ 52 | readable traversal handoff |
| `robot_notice` | question note @ 0, answer @ 118 | ring @ 0, tick @ 118 | curious, not threatening |
| `clear` | arp @ 0, wood @ 110, steel @ 205 | confetti @ 0/92, halo @ 210 | the one moment allowed to breathe |

## Auditioning the sound recipes

No dependencies are required. The renderer intentionally writes to `/tmp` by default, so generated WAV files do not accidentally become repo assets.

```bash
node eeri/art-src/feel-library/render-audio.mjs girder_place
node eeri/art-src/feel-library/render-audio.mjs robot_notice /tmp/robot-notice.wav
```

Run the source-library gate with:

```bash
node eeri/art-src/feel-library/validate.mjs
```

## Recommended integration order

Do **not** wire all 26 cues into shipping code at once. The smallest useful approval slice is:

`pickup` → `jump` → `land_soft` → `stomp` → `dig_hit` → `girder_place` → `clear`

That set covers reward, locomotion, impact, core construction and completion. Once those seven feel right, the machine/pipe/robot family can inherit the same timing language.

### Runtime integration note

The existing `js/audio-fx.js` and `js/fx.js` remain the right audition/integration seam. Port approved recipes rather than importing this source library into shipping code wholesale. That preserves Eeri's current rule: peripheral feel work is judged first, then promoted deliberately.

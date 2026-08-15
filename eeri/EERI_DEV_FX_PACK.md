# EERI Dev / FX Pack

This pack adds a **separate development entry point** without changing the normal EERI game page.

## Entry points

- Production game: `eeri/index.html` — untouched by this pack.
- Development wrapper: `eeri/dev.html` — loads the real production game in a same-origin iframe and overlays dev tools.

After deployment the expected dev URL is:

`https://mbace1.github.io/Suds-Jack/eeri/dev.html`

## Dev menu

Open **DEV** in the upper-left. The menu provides:

- Level 1 / 2 / 3 selection
- Gizmo Lab
- Restart and reload
- Warp ±10 tiles
- Warp to checkpoint
- Warp to current machine
- Tame current machine
- Trigger one bank-dig step
- Invincibility
- Approximate player / machine / robot hitboxes
- Extra FX toggle
- Extra SFX toggle
- Individual dirt, stomp, impact, pickup and clear previews
- Live JSON state readout
- Copy current state to clipboard

The menu uses the existing `window.__eeri` debug seam. It does not own gameplay state.

## Visual FX

`dev/runtime-fx.js` watches actual game state and adds screen-space prototype effects when it detects:

- bolt pickup → spark burst
- golden bolt → larger celebration burst
- stomp → metal/squash burst
- landing → small dirt puff
- mount → machine sparkle
- bank row removed → dirt chunks
- wall hit → brick chunks
- girder state change → heavy metal burst
- world clear → confetti

These are intentionally a **prototype/look-feel layer**. Once an effect is approved, port the event call into the main Three.js scene if world-space occlusion/material integration is required.

## Extra sound effects

The pack follows EERI's existing no-audio-asset approach: sounds are procedural WebAudio, so there are no binary WAV files to manage.

Added prototypes:

- UI click
- richer bolt pickup
- golden pickup
- stomp
- dirt dig/crunch
- wall impact
- mount
- heavy/girder impact
- clear sting

The sounds are additive in `dev.html`. They can be ported into `eeri/js/audio.js` after approval.

## Optional production FX preview

`dev/production-fx-shim.js` can be loaded from the normal game page with one script tag:

```html
<script type="module" src="./dev/production-fx-shim.js?v=1"></script>
```

That adds the same event-reactive FX/SFX without the dev menu. Removing the script tag restores the prior presentation.

## Validation

Run:

```bash
node eeri/test/dev-pack.mjs
```

The test verifies the dev entry, menu/debug seam and event hooks are present.

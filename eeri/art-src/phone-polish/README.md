# Eeri phone-specific polish pack

A resilience contract for the way Eeri is actually played: a browser tab/app that gets rotated, backgrounded, interrupted and resumed while thumbs are still on virtual controls.

## Lifecycle

- `visibilitychange → hidden`: freeze game-time simulation, release held touch directions, fade/suspend audio.
- visible again: resume only after the document is active; never replay buffered one-shot sounds.
- orientation/resize: resize renderer and re-measure controls without reloading or resetting the level.
- pointer cancel / lost capture: release the affected control immediately.

## Rendering budget

Gameplay geometry and hazards never disappear for performance. Degrade only decoration:

1. cap DPR (existing target ≤2),
2. reduce environmental-life actor count,
3. reduce particle counts,
4. stop decorative foreground motion,
5. never reduce telegraph duration, collision updates or input polling.

## Safe areas & browser UI

HUD and controls remain inside safe-area insets. No essential action sits exclusively in the bottom 20 CSS px where mobile browser/gesture UI competes with it.

## Audio

WebAudio starts/resumes only from a valid user gesture. Returning from background must not create a burst of queued sounds.

## Diagnostics

`phone-lab.html` reports the signals integration code should care about without loading Three.js or the game.

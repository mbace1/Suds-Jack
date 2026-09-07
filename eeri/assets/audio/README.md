# `assets/audio/` — and why it is empty

**`CLAUDE_HANDOFF.md`: *"no binary audio assets unless the project's audio
direction changes intentionally."*** That is a direction, not an oversight,
and `test/dev-menu.mjs` enforces it — a `.wav`/`.mp3`/`.ogg` dropped in here
fails the gate.

Every sound in this game is **synthesised** (`js/audio.js` for the game,
`js/audio-fx.js` for the FX pack): oscillators and filtered noise through
envelopes, routed through one master gain so a mute is a real mute. Every
other game in this repo works the same way.

The reason is not size, it is iteration. A procedural hit can be re-tuned
in a slider while you are listening to it, which is exactly what the dev
menu is for. A sampled hit has to be re-recorded.

If the direction does change — a voice, a piece of music, something no
oscillator will do — that is a deliberate call by the owner, and it takes:

1. the file here,
2. an entry in `assets/manifest.json`,
3. an amendment to the rule in this README and in the gate that enforces it.

Changing the gate is part of changing the decision, on purpose.

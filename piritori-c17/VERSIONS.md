# C.18 — Unified command interface and direct scene rendering

Source head: f28c72c71d126aeef65b332ed8020c631ce03563.
Tested source head: f28c72c71d126aeef65b332ed8020c631ce03563.
Original C.18 runtime head: ef7b4785831aacf54cf00d77c5625b9e1c95f6d4 (Piritori PR #86).
Source integration merge: 48c9e2950c921521c6f5f0ef084d1eb89ad216a9 (Piritori PR #87).

One command surface, restored procedural portraits, combined mission/round strip, secondary withdrawal in Menu, and a short-landscape forecast that stays below the arena. Direct scene rendering bypasses framebuffer-copy smoothing. Menu > Graphics offers reflection-bypass safe mode and diagnostics. Interrupted graphics recovery clears uncommitted previews without spending an action.

The build-identity follow-up corrects two help paragraphs and adds a regression gate; it does not change JavaScript runtime, CSS, character assets or rules. The corrected source passed all eight standard jobs (run 35218129811) and the six-layout actual-frame/UI review (run 35218129841).

C.17 campaign/tactics, saves and exact-once aftermath are unchanged. No external character models or rigs added. Browser evidence is separate from physical phone acceptance, which remains open. C.08 stays absent from the hub; C.16.1 remains the rollback cabinet.

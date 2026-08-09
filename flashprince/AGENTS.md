# Flash Prince — non-negotiable animation rules

These rules apply to every file under `flashprince/`.

1. Read `animation-locks.json` before changing animation, movement, rendering,
   palette or input code. Run `node scripts/check-animation-locks.mjs` before
   and after the work.
2. An approved animation family is immutable. Do not redraw, regenerate,
   recolour, retime, mirror differently, reorder or replace any locked frame,
   hold, transition, orientation or root-motion value.
3. New animation work is additive. It must not share a replacement data path
   or silently alter an approved family for visual consistency.
4. Changing a lock requires explicit user permission naming that animation
   family. Record that permission and the replacement signature in
   `animation-locks.json`; otherwise stop.
5. The Conrad B. Hart sheet is the primary reference. Compare every new frame
   against the corresponding Flashback GIF sequence before release. Document
   the reference sequence and frame count in `VERSIONS.md`.
6. Never call a generated approximation a Conrad-checked frame set unless the
   sheet and GIF comparison was actually completed.
7. A playable release means: default mobile twin-stick, right-stick jump,
   Classic Pixels and 4× Upscale are browser-tested; Hub text/version is
   updated; and the deployed `gh-pages` build is smoke-checked.
8. The v23 `motion-v20-data.js` START/RUN replacement was rejected. Never
   reuse it for the playable run or "unify" the character by replacing the
   locked run. New action art must be made to match the approved run instead.
9. "Approved run" means the exact v18 bundle: `run-v15-data.js`, its twenty
   holds, first six run frames as start, left-facing source orientation,
   1.22-pixel speed and v18 run advancement. Later versions are not a license
   to reinterpret that direction.

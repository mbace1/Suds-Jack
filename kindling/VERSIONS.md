# Kindling — Version Log

<!-- Same rules as the other Suds-Jack projects: one `## vN` entry per release,
     newest first. `scripts/hub-finish.mjs` copies this file into the hub build,
     which is how the arcade's own `scripts/versions.mjs` learns the number —
     it reads each project's VERSIONS.md and nothing else. Keeping the log with
     the SOURCE is what stops the number and the build disagreeing. -->

## v22 — 2026-09-10
**Named keepers — multi-phase rival duels on every road**
- one telegraphed keeper per major region (Birch Ruins, Drowned Courtyard, Bell Keep, Ashwood, Old Gate)
- multi-phase duels reuse Nerve + charge/feint + Bond skills; unique pressure skill check softens later phases
- defeat still means walk home — never touches wellness/care; no scolding copy
- Journey/Walk surfaces rival status (looming / challenged / bested) beside region memory
- PRODUCT_PLAN notes next epics: B living lineage, then A world beyond Gate

## v21 — 2026-09-10
**Deeper road memory, Old Gate opens a next world**
- per-region history keeps short durable beats (finds, rests, shortcuts, fight outcomes) on Journey cards and Walk — soft place-memory, never a streak counter
- missed care never erases or cools region memory (accumulates only; Kindle still does not touch world progress)
- Old Gate is a real approach beat after all four roads are known: interim copy + UI + gate logic; dedicated plate not required to ship
- opened gate celebrates through ProgressionCelebration — the world is the reward

## v20 — 2026-09-10
**Egg afterglow, road memory, camp that matters on the path**
- combine settle shows parents remaining; Keep/Pack share an egg warmth panel so accumulation is obvious (warmth only gathers; missed days never cool)
- Bond stage and combine afterglow celebrate through ProgressionCelebration alongside the existing game-feel bloom
- region echoes persist per road after fights (dismissible banner still clears); Journey cards surface the last echo
- built camp pieces appear as "Camp on the road" so Waymarker / Lens / Moss Bed / Story Stone / Ember Bowl read as consequential on Walk
- cheap combat coach: clearer Winding → Charging line; defeat still never touches wellness

## v19 — 2026-09-08
**Charge is a real two-turn wind-up**
- charge telegraphs on one exchange (soft poke window, no heavy yet), then lands or is interrupted on the next
- Strike still cuts the release short; Stone Patience still punishes the interrupt — never touches wellness
- Journey intent copy labels Winding vs Charging so the duel reads across turns
- PRODUCT_PLAN Phase 1–2 “blocked on R1” framing refreshed to match shipped Sep combat/combine work

## v18 — 2026-09-08
**Encounters feel like a short duel, not only labeled RPS**
- Nerve commitment: Skill spends Nerve, Guard restores it, spent Skill still lands thin — never touches wellness
- region archetypes add charge telegraphs and feints that reward reading (Strike interrupts wind-ups and catches feints)
- Bond/stage unlocks companion skills that meaningfully change the exchange (Hearth Focus, Spore Breath, Cinder Step, Toll Guard, …)
- victory and defeat leave a soft road echo and journal line for Journey — no scolding, no care progress loss
- `combat-balance.mjs` growth table realigned to runtime `companion-combat.ts`

## v17 — 2026-09-08
**Fights read clearer, and combining becomes a fingertip beat**
- combat now names each Strike / Guard / Skill, telegraphs the enemy move, and explains the counter in the same breath
- Bond-hardened companions enter the path with their grown Vitality and live stats, so combat growth actually changes the fight
- two tender-or-older companions combine by reaching fingertip to fingertip; fusion energy settles as an egg and neither parent is consumed
- Keep, Pack and Lineage copy treat combat and combine as one firelit game; warmth still only gathers

## v13 — 2026-09-02
**The road finally has its own visual identity**
- Drowned Courtyard, Bell Keep and Ashwood now use dedicated character-free environment plates instead of cropped shared art
- the shell, Journey cards, combat panels and progression panels share one darker firelit presentation language
- combat has stronger intent/counter emphasis, damage pop feedback, animated hit/victory states and a clearer latest-exchange readout
- Journey choices now visibly alter the scene: investigate reveals a glint, rest warms the road, and shortcuts add motion streaks
- companion animation now includes species-weighted movement plus hit and victory modes
- Bond growth immediately announces a new stage and the Keep screen shows the exact next combat-stat gains

## v12 — 2026-09-02
**Journeys read cleaner and the whole care list counts**
- Today now tracks every editable care task separately from the five-step Fire target, so the sixth task visibly counts and still rewards Flames/Bond
- Birch Ruins uses a clean environment-only plate and the runtime companion walks there like every other region
- temporary shared Journey art is cropped away from its baked character while dedicated region plates are rebuilt
- Journey progress no longer jumps backward when a decision adds travel time
- region investigation rewards are keyed by explicit find type instead of fragile array positions
- combat buttons now visibly identify the counter to the enemy's current intent

## v11 — 2026-09-01
**Companions start becoming a real system**
- mid-Journey choices now have region-specific time, reward and ambush consequences
- companion Journey traits improve with Bond and life stage, with the current rank visible on Keep
- companion combat growth now adds stage-based Vitality, pressure and live stat improvements
- combat exposes enemy intent plus live Strike / Guard / Skill values during encounters
- camp construction and companion traits now materially affect Journey outcomes
- the spend-Fire prompt no longer blocks an available progressive-care action

## v10 — 2026-08-30
**The rest of the pack moves**
- Mossling, Ashling and Moss Knight now share Ember's 8×2 runtime atlas:
  idle on the first row, walk on the second, rest in the last two cells
- camp, Journey (except Birch), Pack homecoming, Keep, and camp reaction
  cues all use the live atlas instead of a still portrait
- Ember's existing SVG atlas and sequences stay unchanged

## v9 — 2026-08-21
**The hub build becomes a cabinet**
- the HUB button: one import of the SITE's `hub/shell.js`, never a vendored
  copy. The header drops below it in hub builds — the button is fixed to the
  top-left corner and was sitting on the title.
- offline: `sw.js` is generated by walking `dist/client`, because vite hashes
  its filenames and a hand-kept precache list drifts. The cache name is a hash
  of that list, so a changed byte rolls the cache.
- no outbound requests. The webfont is gated on `VITE_HUB_STATIC` in
  `__root.tsx` — it cannot be stripped from the built HTML, because React
  hoists a `precedence` stylesheet and deleting a link the client still asks
  for is a hydration mismatch that renders an EMPTY page.
- `__grok/` (the add-to-homescreen onboarding) is left out of the hub build:
  `__root.tsx` already drops the links to it there, so it was 248 kB nothing

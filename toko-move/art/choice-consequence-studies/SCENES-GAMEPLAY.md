# Scene-to-gameplay notes — ready for later approved PR submission

**ART APPROVED pt151u, 7 Nov 2026; delivered in PR632. No gameplay code changed.** Research target: fresh origin/main bbdf3ef83; approved visual references from PR632. All four illustrations approved; demonstration cause remains a NEW gameplay proposal.

## A → B: an IMPLEMENTED choice and later consequence
### A / crossing — Help Across
Current journey source: `js/cards.js:42–44`, CARDS id `granny` (not only the older classic event deck). Text names Mannerheimintie; art deliberately uses a generic crossing fragment rather than a measured reconstruction.
- **Walk her across**: time90 seconds, current job pay×1.1, set=`granny`.
- **Walk on**: time0, authored response only; no invented penalty.
The illustration shows the helping branch: parcel tucked under arm, hand support, same sage-coated older lady/paper bag later in B. Elevated environmental cutaway, not another handoff.

### B / saved-seat — same-run callback
`js/cards.js:156–159`, CALLBACKS.granny id `granny2`: lady has saved seat by tram door.
- **Sit with her**: time30 seconds, pay×1.15. Authored line: she knows recipient, tell her Aino says hello.
- **Wave from the door**: time0, she waves with pulla bag. No new relationship reward invented.
`js/journey.js:340–344`: answering `set` records flag and slots callback into next job unless an arc owns the slot. New run flags created at line148, not permanent relationship storage. Callback still needs proper aboard context and a later eligible job; not guaranteed instantaneous cutscene. `test/journey.mjs:222–228` explicitly checks callbacks only after their choice and granny returning. `ACT1.md §10` documents same sequence. `play.js:29` imports journey: this is CURRENT v3, not a legacy-only mechanic.
Camera B reverses to courier's rear shoulder entering small Artic seat/door cutaway. Empty left seat + welcoming gesture are gameplay-relevant props. Rear head stays natural; no cyan badge attached to back of head. This is the strongest story comparison pair, NOT a promise that every crossing always immediately triggers B.

## C / sealed-place — IMPLEMENTED choice, illustrative place staging
`js/cards.js:191–195`, SEALED_CARD:
- **Ride the {fam} and watch**: time0 on story card, authored line. Subsequent travel still has its normal costs.
- **Ask at the kiosk**: time40 seconds, unseal=true, names actual destination.
`journey.js:157–162` gates sealed job from fourth run, never EASY; `310` applies unseal and `359` reveals aboard correct family. `test/journey.mjs:253–266` exercises gating, kiosk/line reveal and notebook.
Art: inside hatch looking out, courier keeps sealed box, kiosk worker points toward background tram. Box has seal, no readable address. Counter/hatch and tram make information-versus-ride decision tangible.
**Place grounding:** Kauppatori is a committed anchor in `cities/helsinki.city.js:156–164`; Anneli's market café is an existing regular at Kauppatori (`regulars.js:22`). Art is a simplified Kauppatori-side kiosk storyboard, NOT exact waterfront geography. SEALED_CARD is not hardcoded to Kauppatori; tying its setting here is illustrative placement, not a new code restriction.
**Not claimed:** free-roaming shop/sauna/café menu or persistent visitable-storefront side-quest system. Existing options are story cards, route selection and regular deliveries; multi-store exploration would be NEW design. Other current optional places: sauna/kebab/karaoke/scratch cards in cards.js; none implemented by this art task. Scene C supplies a real location/options vignette without fabricating a new visit mechanic.

## D / demonstration — NEW PROPOSAL cause over IMPLEMENTED halt framework
Repository search for demonstration/protest/mielenosoitus found no authored demonstration event/card. Do NOT present this cause as implemented or a real contemporary protest. Blank placards, no actual slogans or political movement.
Implemented framework: `journey.js:163–170` seeds HARD tram-family halt; `204` excludes halted family from route candidates; `285–286` offers **Find another way** (price0 at decision) / **Wait it out** (remaining halt duration rounded). `400` surfaces halt at matching stop. Older classic `events.js:38–41` has stuck car, points failure, medical hold, NOT demonstration.
**Proposed:** peaceful march temporarily blocks street/rails, explained by existing halt-style alternatives. No invented duration, rewards, street bypass guarantee or crowd interaction options. Would require explicit future design/code approval; artwork alone does not add it. Wide small-person overview retains realistically long/wide tram and route-blocking marchers; courier remains by curb, not part of demonstration.

## Research status taxonomy / broader discoveries
- IMPLEMENTED: CARDS/CALLBACKS/run flags/ARCS memory, sealed reveal, regular deliveries/standing, weather factors, travel/halts. Source: cards.js, journey.js, regulars.js, play.js.
- DOCUMENTED design-only: `art/itch-bible/NARRATIVE-TWISTS.md` explicitly says high-level no implementation. Do not infer all its lost-and-found/retired-number ideas exist. Some twists later have actual code above; verify individually.
- NEW PROPOSAL: demonstration cause and any expanded visit-storefront UI, not current mechanics.
- v2/classic vs v3: prior approved tourist/wallet illustrations cite `events.js` (classic deck), not the newer default `cards.js` narrative deck. They are existing classic options, not proof of persistent quests. This new A/B pair intentionally uses current v3 callback implementation.
- Earlier wind/snow studies were decorative depictions, but current game DOES have real weather: `journey.WEATHER` snow walk×1.4 and wait×1.3; weather-specific slip/puffy cards exist in cards.js. No new weather mechanic is needed/added by those illustrations.

## Submission policy
All four illustrations approved pt151u and added to same open PR632. This does not approve implementing the demonstration mechanic. Future approved additions go to same PR632 if still open; inspect before publishing. Include these scene explanations, not art-only unexplained cards or code-only delivery. Preserve illustration bytes and record partial approvals faithfully. No gameplay/build changes here.

# Piritori — Claude map and mission handoff

## Current pickup — 2026-09-24

The owner requested documentation so Claude can take over. **Start in the
separate source repository's current main**, not this hub's older city snapshot
and not the failed M1 overlay branch.

- [Claude takeover / verified status](https://github.com/mbace1/piritori-eden/blob/main/CLAUDE_TAKEOVER.md).
- [Clean M1 and bounded M2 execution brief](https://github.com/mbace1/piritori-eden/blob/main/design/CLAUDE_MAP_MISSION_NEXT_STEPS.md).
- Source `CLAUDE.md` and `AGENTS.md` now point to those documents.

The source was verified at `0432dff2bc1c26f887eb927f27efcde478a8b3e4` before the
handoff commits. C.19 reached main on September 23; the authored city header is
**v4.51**. Preserve the September 21 [existing-fighter repair #92](https://github.com/mbace1/piritori-eden/pull/92).
The old integration branch still contains M0's audit/tooling; it is not a reason
to overwrite later main work. [M1 #91](https://github.com/mbace1/piritori-eden/pull/91)
remains open/unmerged at `d6aa85a684bf9bc217683f61bde2647daf7a08e5`, with failed
or cancelled acceptance, not a finished navigation release.

**Order:** clean inspection/presence split in existing `app.js` -> tested M1 ->
Paper Bag preview/Cancel/Travel/arrival -> visible consequences and revisits ->
one authored contact/mission -> further small iterations. Do not add another
loader/observer overlay or start a large map expansion. Keep the existing story
clock until its time boundary is explicitly resolved. Apply campaign rewards
once; the 23-euro Paper Bag margin must not be added a second time.

Pages was read at `40b197df7778d7bfa2f6a3d19d65047dc7798be9`; its Night Shift
receipt still identifies C.19 / source `69b23168`, neutral stand-ins and
`physical_devices_verified: false`. This is a repository read, not a fresh
public playthrough. Preserve that separate cabinet, all other games and rollback.
Re-read current hub main/Pages files before any future city package; do not assume
the September 17 campaign-version discrepancy below is unchanged or repaired.

This update changes documentation only. No new city/Night Shift release, runtime
merge, asset work, device acceptance or Claude-session dispatch is implied.
The source documents contain the precise file map, test matrix, baseline commands,
Godot port boundary and ready-to-use Claude instruction. Use them for current
status. The M0 record below is retained as dated evidence, not current pickup advice.

---

# Historical M0 map and mission handoff — 2026-09-17

Date: 2026-09-17. **Audit and planning only; no runtime change or new playable release.**

Owner continuation: “Go next” after Night Shift C.19. The approved map/mission
programme requires many small, revisitable steps, not a one-shot map build.

## Read first

- [Source M0 PR #90](https://github.com/mbace1/piritori-eden/pull/90): exact-head checks, review and merge status.
- [Full map/mission audit](https://github.com/mbace1/piritori-eden/blob/art/meshy-approved-pilots-2026-09-11/design/M0_MAP_MISSION_AUDIT.md).
- [Approved iteration plan](https://github.com/mbace1/piritori-eden/blob/art/meshy-approved-pilots-2026-09-11/design/POST_C18_ITERATION_PLAN.md).
- Source `ACTIVE_CONTEXT.md`, `DESIGN_AUTHORITY.md`, GDD, Art Bible and scenario atlas retain authority. The audit is implementation evidence, not an override.

Until source PR #90 is merged, read the report and tools on its
`docs/m0-map-mission-audit` branch. The source campaign baseline audited is
`14f42ad5f2de62fc72c5519a6dec00d6eed7d9bc` on
`art/meshy-approved-pilots-2026-09-11`, **not source main**.

Run in that source checkout:

```sh
node tools/audit/map-mission-audit.mjs > /tmp/piritori-m0.json
node tools/audit/test-map-mission-audit.mjs
node web/test/v3-state.mjs
```

The read-only inventory includes input hashes, bindings and reference conflicts.
It does not certify runtime integration, browser interaction or device rendering.
Do not copy those tests into this older hub campaign and assume they test the
same source.

## Findings that constrain the next implementation

The authored catalogue contains 15 anchors, 12 sites, 25 graph edges, 14 scheduled
encounters, four mission records and two optional return visits. Preserve these
IDs before proposing more content.

`selectedAnchor` currently doubles as area selection, access/location and a
market-knowledge update. `advanceSchedule` moves it to the next story location;
neither action executes a meaningful journey. A free inspection cursor must
not overwrite this state. Declared transit services and graph reachability are
not implemented travel time, fares or journey consequences.

The mission-step model exists but the city app does not import it. Some authored
consequences are stored flags, not implemented timed closures. Record these as
integration work, not completed systems.

First thin-loop candidate: **Paper Bag**, reusing the existing Piritori purchase
and Siltasaari sale. Pure-model replay gives exactly 160 -> 115 -> 183 euros,
with no stock remaining, and rejects duplicate choices. The mission record also
declares a 23-euro success packet; do not add it on top of the encounter's sale.
There must be one campaign settlement owner. This is a candidate within the
approved sequence, not final mission-design approval.

The existing D005 conflict remains: `enc-courtyard-last-call` is scheduled at
`torkkelinmaki`, but its `jaska_studio` site belongs to `makelansilta` following
the Scene Club narrative correction. Do not relocate Scene Club to hide this.
D002 time semantics and D004 Arvo's enterable venue remain unresolved too.

## Publication prerequisite — avoid an older campaign overwrite

The audited hub trees were:

- development main: `bb2f5ac74811e2c8ccdd631bb61570eaf9275e47`;
- Pages: `4d758244583b1d5cb8a8ab5d27ec953c4c40f805`.

[Snapshot run 35272255553](https://github.com/mbace1/Suds-Jack/actions/runs/35272255553)
records those tree identities and text fingerprints. These were repository
reads, not a fresh public campaign playthrough.

At those heads, this main branch's `piritori/` runtime is an older copy than
the current canonical source and Pages campaign. Both hub card notes still
say v4.47. Main's version metadata and external `act1.html` redirect use v4.47;
Pages metadata/local redirect and canonical/Pages in-game markers use v4.48.
The card's `deployedOnly` / external-repository arrangement is not proof that
main's old city app is current.

**Do not publish main's older `piritori/js/v3/` over the current Pages city.**
Do not copy all of Pages into main either. Before the first playable city
change, pin the correct source and resolve its scoped package/bridge/card/version
contract; test the actual public campaign entry. The old city builder copies
all of `web/` and expects fighter binaries, unlike the allowlisted Night Shift
publisher. Audit its output rather than reusing it blindly.

This handoff documents the discrepancy; it does not repair it or change the hub
catalogue. Root AGENTS/DEPLOY_SPEC still govern development and publication.

## Next playable question — M1

Can a player distinguish today's lead from the area being inspected and return
to that lead without modifying campaign state?

Implement a small presentation-only lead/inspection treatment before travel:
current-lead strip, large Show lead action and explicit selected-area/availability
labels. Compare cash, stock, time, choices and market observations before/after
inspection. Complete the existing purchase/sale through visible controls, reload,
and test portrait/landscape input. No hidden future encounters should leak.

M2 then makes the existing Paper Bag journey meaningful through an explicit
preview/cancel/commit/presence contract. Resolve the time boundary without
charging the scheduled story twice. Later contact/alternatives/consequences/
revisit steps can take several builds each.

**Unchanged:** Night Shift C.19, existing combat rules, external-model hold,
A/Turf versus C decision gate, physical phone/iPad and owner visual/play gates.
Godot is a separate presentation/state-port review, not implemented by this
browser audit. There is no C.20 or M1 gameplay release in this documentation batch.

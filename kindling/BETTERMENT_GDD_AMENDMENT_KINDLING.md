# BETTERMENT GDD AMENDMENT — THE KINDLING RULE

**Date:** 2026-08-17  
**Status:** authoritative amendment to `BETTERMENT_GDD.md`

This amendment supersedes conflicting language in the current GDD about missed days never affecting the companion.

## Core rule

Betterment now has a real creature-life consequence:

**If the player completely misses two consecutive care-days, the current monster becomes Kindling in the bonfire.**

A care-day still rolls over at **04:00**.

For now, a “missed day” means **zero qualifying care actions during that care-day**. Failing to reach `5/5 FIRE TENDED` is not enough by itself to kill the monster.

This means:
- Day 1 missed: warning state only.
- Day 2 missed consecutively: monster becomes Kindling.
- Any qualifying care action resets the danger state.

## Day 1 — warning state

The first missed day should feel ominous but recoverable.

Recommended presentation:
- bonfire reduced to low coals;
- companion stays very close to the fire;
- colder scene treatment;
- subtle ash / ember warning marker;
- direct but non-scolding copy such as `The fire is fading.`

Do not use guilt language such as `You failed`, `You neglected it`, or `You should have done more`.

The player can recover immediately by completing any qualifying care action on the next care-day.

## Day 2 — Kindling event

If the following care-day is also completely missed:

1. The next app open begins on the bonfire rather than the normal Today flow.
2. The companion is gone.
3. Its remains appear as a distinctive ember / ash marker in the fire.
4. The game states the fiction directly:
   - `THE FIRE WAS NOT TENDED.`
   - `[MONSTER NAME] BECAME KINDLING.`
5. The companion is moved to lineage history as a **Kindled ancestor**.
6. The player chooses or hatches the next companion and continues.

The event should be darkly memorable and game-like, not clinical or accusatory.

## What survives

A Kindled monster is not deleted from the player’s history.

Retain:
- name;
- portrait / silhouette;
- growth stage and Bond reached;
- journey memories;
- combat record;
- visual traits;
- parents / descendants;
- one possible **Ash Trait / Ember Trait** that can influence a future descendant.

The Lineage screen should eventually distinguish:
- Living companions;
- Kindled ancestors;
- descendants.

## Why this improves breeding

The Kindling rule gives lineage real meaning.

Breeding is no longer only cosmetic collection. It creates continuity across generations, and Kindled ancestors can leave visual or mechanical traces in later creatures.

Potential future rule:
- a descendant of a Kindled ancestor has a small chance to inherit an **Ember Trait** derived from that ancestor.

This should be flavorful rather than mandatory min-maxing.

## Balance guardrails

- Two missed days must be consecutive.
- One real care action resets the danger state.
- `4/5` is never treated as failure.
- No paid item, premium currency or monetized revive may bypass the consequence.
- Do not silently kill the monster in the background; the event must be explicitly presented on return.
- The system should be tested carefully for timezone, DST and 04:00 rollover edge cases before shipping.

## Still open

We can later test whether two days is the right grace period. The current design assumption is **2 consecutive fully missed care-days** because it creates stakes without making one rough day catastrophic.

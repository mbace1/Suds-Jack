# SKLTR v80 playtest findings

Observed run: 1:22, 16 kills, 1 melee kill, 1% FLOW uptime, FLOW peak 1/3, 75 hits, 105 damage, 325 enemy shots (238/min), 213 player shots. Death occurred in TORTOISE HEIGHTS · CROSSING FIRE.

## Read
- Projectile pressure is still far too dense for the first 90 seconds. The damage protection makes the failure feel like chip accumulation rather than readable discrete mistakes.
- The intended movement-offense loop is not being learned: one melee kill and 1% FLOW means the player is mostly surviving/shooting rather than deliberately passing almost-touch close to enemies.
- The old feedback form is still visible underneath the run-data panel, so the death screen is not actually screenshot-clean.

## v81-v84 response
- Cut early Tortoise volleys from five projectiles to three and slow the early wavefront slightly.
- Extend early regular-enemy fire spacing, especially Tortoises, while raising per-hit consequence back toward normal so mistakes are fewer but clearer.
- Add a contextual HOUND melee teaching cue only when a live Hound is genuinely close; no magnetism or movement interruption.
- Make the death report own the entire death-screen layer so obsolete feedback controls cannot remain visible behind it.

Target for next run: enemy shots <150/min in first 90 sec, hits taken materially lower, melee share >15%, FLOW uptime >10% without widening the actual near-contact melee rule.

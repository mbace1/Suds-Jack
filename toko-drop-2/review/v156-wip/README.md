# Toko Drop 2.0 — v156, work in progress (NOT shipped)

This is for review, for the owner and the producer. **It is not a release.** The live game, the arcade cabinet and the itch page are still v155 (`../../itch/`). v156 ships once the menus, the announcer and the controls are all done (owner, 18 Nov 2026).

- `tokodropv156-wip.html`: the work so far as one playable file. Open it in a browser; it needs nothing else. Its corner still reads `v155`, because the version number moves only when v156 ships.
- `pause-menu.jpg`, `settings.jpg`: the new screens, on a phone-size screen.
- The code is on branch `ccr-cf2281cf-eeuspz`, on top of `gh-pages`.

## What has changed since v155

**The pause menu** is PAUSED · RESUME · RESTART · SETTINGS · QUIT. The enemy card is gone from it. The death screen still has its "got you" card.
- RESTART abandons the run and starts the same one again: the same mode and start world, the same campaign room, or the same day's waves for DAILY. It works like AGAIN on the result screen, and records the run as quit.

**SETTINGS** (was OPTIONS, and the title's MENU button) has 9 switches: VOLUME, MUSIC, ANNOUNCER, INTRO VOICE, ANNOUNCER VOL., REDUCE MOTION, LEFT/RIGHT-HANDED, STICK, LANGUAGE. RECORDS appears only from the title.
- The other 12 (DASH, DASH BY, GEL HP, GELS, WORLDS, STYLE, LENS, SPLATTER, DEAD ZONE, AUTO QUALITY, PLAY RECORD) show only with `?dev` in the address. Nothing was removed.

**The announcer** keeps the robot voice, with new lines; SMASH TV's game show (studio, contestant, prizes, money, the mop) is gone.
- The owner's recorded shout ("TOKO DROP — START SHOOTING!", from 1.x) plays on arriving at the title, as in 1.x. It has its own INTRO VOICE switch, on by default.

| When | What he says (one at random) |
|---|---|
| a run starts | DROP IN! · ONE DROP AGAINST THE SWARM! · STAY LIQUID! · LET'S GET STICKY! |
| a wave starts ("WAVE 7!" in front) | HERE THEY COME! · MORE GEL INCOMING! · THEY'RE MULTIPLYING! · KEEP MOVING! · DON'T GET STUCK! · SPLAT THEM ALL! · STAY FLUID! · HERE COMES THE WOBBLE! |
| a boss wave, when the world has no line of its own | BIG ONE INCOMING! · HERE COMES THE BOSS! · THIS FLOOR HAS AN OWNER! |
| heat reaches ×3 or more | ON FIRE! · HEAT RISING! · UNSTOPPABLE! · THE FLOOR IS YOURS! · NOTHING STICKS TO YOU! |
| a power-up is picked up | POWER UP! · GRAB IT! · UPGRADE! |
| a score pickup | BONUS! · POINTS! · SCORE! |
| a score multiplier pickup | DOUBLE POINTS! · EVERYTHING COUNTS TWICE! |
| you are hit and live | OUCH! · SHAKE IT OFF! · YOU'RE LEAKING! · HOLD TOGETHER! |
| game over | SPLAT! GAME OVER! · EVAPORATED! · DROPPED! GO AGAIN! |
| a wave is cleared | WAVE CLEAR! · CLEAN SWEEP! · NOT A DROP LEFT! · SPOTLESS! |
| a bounty target appears | BOUNTY! TAG IT! · GOLD TARGET! GO! · MARKED! MAKE IT PAY! |
| a bounty is collected | BOUNTY PAID! · COLLECTED! |
| a boss enters a new phase | IT'S ANGRY NOW! · SECOND WIND! · FINAL FORM! · IT'S NOT DONE YET! |
| you land in a world with no line of its own | NEW FLOOR! · DOWN YOU GO! · ONE MORE WORLD! |

| World | Landing in it | Its boss |
|---|---|---|
| 1 grid | (the general world line) | THE TWIN PRISMS! |
| 2 driveway | THE DRIVEWAY! MIND THE BALL! | THE CURB KING! |
| 3 sewer | DOWN THE SEWER! | MAW RISES! |
| 4 cistern | THE CISTERN! DUCK THE SWEEP! | BLISTER! HIT IT WHEN IT'S BARE! |
| 5 boiler | THE BOILER ROOM! IT'S HEATING UP! | THE KETTLE IS BOILING! |
| 6 river | THE RIVER! GO WITH THE FLOW! | PIKE! STAY OUT OF ITS LINE! |
| 7 ice | THE ICE! NO BRAKES! | BERG! |
| 8 deep | THE DEEP! IT'S DARK DOWN HERE! | THE ANGLER IS FISHING FOR YOU! |
| 9 core | THE CORE! THIS IS IT! | OMEGA! |

## Still to do before v156

- **Controls** feel worse than 1.x. The movement numbers are identical to 1.x's, so the cause is elsewhere. Waiting on the owner: sluggish, slippery, aiming or the dash?
- **The start menu** is "a bit" messy. Waiting on what bothers him.
- Optionally, a better robot voice: pick the best voice the phone has instead of the default.

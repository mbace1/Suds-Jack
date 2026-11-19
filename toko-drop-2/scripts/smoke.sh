#!/usr/bin/env bash
# smoke.sh — the gate that passes before every commit: it actually RUNS the game.
#
# 1.x learned this the hard way (v93/v94): a parse-broken module black-screened
# the live game through four releases of green checks, because nothing ever
# executed the code. So, in order:
#   1. scripts/check-syntax.sh    every module parses as a real ES module
#   2. scripts/check-tokens.mjs   every module URL is tokened, and the tokens agree
#   2b. test/sim.mjs              the simulation's rules, in bare node, from a seed
#   2b'. test/fsm.mjs             the declared state machine (v125): moves, exit/enter, the record
#   2b''. test/run.mjs            the run's phase and the hero's guard (v126): a decided run stays decided
#   2c. test/hero.mjs             the hero and the input layer, held to 1.x
#   2d. test/species.mjs          every ported species against its 1.x spec
#   2e. test/director.mjs         the wave director, against 1.x's own source
#   2e'. test/pickups.mjs         1.x's pickups: drops, gates, the convoy, the bounty
#   2e'+. test/gates.mjs          the gate family (v107): turnstile, slalom, fence, fuse, hoop
#   2f. test/jelly.mjs            the jelly death's soft body: stable, cut clean, cheap
#   2e''. test/worlds.mjs         the worlds: a boss's clear opens the floor, the droplet
#                                 drops into the next world; heavy bodies from world 2
#   2e''+. test/forms.mjs         the formations (v106): a giant's escort, a linked pair's strand
#   2e''++. test/posts.mjs        the floor's own shape (v108): what stands on a later world's floor, and blocks
#   2e''+++. test/slam.mjs        a giant's slam (v112): told with its reach, landed inside it, never past it
#   2e''++++. test/teach.mjs      the first-time tags (v115): STEP OUT! and CLEAR THE LANE!, until learned by getting out
#   2e''+++++. test/daily.mjs     DAILY (v118): one seed a UTC day, and the same waves for everyone who plays it
#   2e''''''''. test/floorshift.mjs   the arcade's moving floors: which wave, the warning, the hero kept on it
#   2e'''''''. test/bossfight.mjs    the arcade's boss waves on the clock: the fight, the pops, the grade's pay
#   2e''''''. test/trials.mjs       the arcade's challenge waves: which waves, the schedule kept, met pays
#   2e''''''+. test/bot.mjs        the expert bot's look-ahead still reads the sim (scripts/reach.mjs's player)
#   2e''''''++. test/music.mjs     the music: every song reads and fits its chords, the layers stack, and the
#                                 player on a fake audio context lays nothing in the past and leaves nothing running
#   2e'''''. test/challenge.mjs    what a room ASKS: every goal and mod, moving floors, tiered grades
#   2e''''. test/campaign.mjs     the CAMPAIGN: every room plays to a grade, shaped rooms hold
#   2e''''+. test/record.mjs      the play record: what it keeps, a room's and a run's entry, and the
#                                 text a person pastes reading back
#   2e'''. test/reshape.mjs       SURVIVAL's floor: starts small, warns, the walls slam
#   2g. test/view.mjs             the view's half of arrival: a waiting brood undrawn
#                                 and unshadowed, let out whole; a fresh body swelling in
#   2h. test/goo.mjs              the goo's droplets: splash, bounce, slide and ride,
#                                 the rail a wall, and no goo made or lost on the way
#                                 to the floor's film
#   3. test/smoke.mjs             headless Chromium boots the page under /toko-drop/
#                                 (as Pages serves it) on WebGPU and on the forced
#                                 WebGL 2 fallback: a phone both ways up, a phone
#                                 turned mid-run, an iPad both ways up, an iPad
#                                 driven by a DualSense, and fails on any page
#                                 error, failed request, untokened module, missing
#                                 label, arena off screen, or a frame that is not
#                                 1.x's look
#
# Needs node >= 22 (its built-in WebSocket drives Chromium; no npm installs) and
# a Chromium: $CHROMIUM, /opt/pw-browsers/chromium, or google-chrome on PATH.
#
# Usage:  scripts/smoke.sh                 smoke the working tree
#         scripts/smoke.sh --url <site>    smoke a deployed copy (the live check
#                                          after a release); also --out <dir>
set -euo pipefail
cd "$(dirname "$0")/.."

MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if (( MAJOR < 22 )); then
  echo "✗ node $MAJOR found — smoke needs node >= 22 (built-in WebSocket)" >&2
  exit 1
fi

scripts/check-syntax.sh
node scripts/check-tokens.mjs
node test/sim.mjs
node test/fsm.mjs
node test/run.mjs
node test/hero.mjs
node test/species.mjs
if [ -f test/director.mjs ]; then node test/director.mjs; fi
node test/pickups.mjs
node test/gates.mjs
node test/worlds.mjs
node test/forms.mjs
node test/posts.mjs
node test/slam.mjs
node test/teach.mjs
node test/daily.mjs
node test/reshape.mjs
node test/campaign.mjs
node test/record.mjs
node test/challenge.mjs
node test/trials.mjs
node test/bot.mjs
node test/music.mjs
node test/bossfight.mjs
node test/floorshift.mjs
node test/jelly.mjs
node test/view.mjs
node test/goo.mjs
node test/bossphases.mjs   # v156: the seven world bosses' three phases (v154)
node test/follow.mjs       # v156: the touch sticks follow the thumb
node test/smoke.mjs "$@"

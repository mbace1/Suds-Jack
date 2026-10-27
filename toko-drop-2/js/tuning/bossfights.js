// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by `node scripts/boss-tiers.mjs --write`: per
// world and its own boss (v45), the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// 10 seeds a cell, 2026-10-27.
export const BOSS_TIERS = { "1": { "prism": { "S": 10.1, "A": 12.4, "B": 17.1 } }, "2": { "curbking": { "S": 23, "A": 25.3, "B": 27.6 } }, "3": { "maw": { "S": 15.7, "A": 19.8, "B": 21.8 } }, "4": { "blister": { "S": 17.4, "A": 19.4, "B": 24.7 } }, "5": { "kettle": { "S": 26.3, "A": 28.9, "B": 33.2 } }, "6": { "pike": { "S": 20.4, "A": 22.4, "B": 25.3 } }, "7": { "berg": { "S": 27.2, "A": 29.9, "B": 33.2 } }, "8": { "angler": { "S": 29.5, "A": 32.5, "B": 35.5 } }, "9": { "omega": { "S": 32.1, "A": 35.3, "B": 38.5 } } };

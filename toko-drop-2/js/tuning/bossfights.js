// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by `node scripts/boss-tiers.mjs --write`: per
// world and its own boss (v45), the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// 10 seeds a cell, 2026-10-28.
export const BOSS_TIERS = { "1": { "prism": { "S": 10, "A": 12, "B": 17.8 } }, "2": { "curbking": { "S": 30.3, "A": 38, "B": 41 } }, "3": { "maw": { "S": 15.3, "A": 17.6, "B": 19.7 } }, "4": { "blister": { "S": 17.7, "A": 19.7, "B": 21.7 } }, "5": { "kettle": { "S": 28.3, "A": 31.1, "B": 33.9 } }, "6": { "pike": { "S": 19.6, "A": 21.6, "B": 23.6 } }, "7": { "berg": { "S": 22.7, "A": 28.7, "B": 31 } }, "8": { "angler": { "S": 25.1, "A": 27.6, "B": 31.3 } }, "9": { "omega": { "S": 30.1, "A": 33.1, "B": 36.1 } } };

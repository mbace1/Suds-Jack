// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by `node scripts/boss-tiers.mjs --write`: per
// world and its own boss (v45), the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// 24 seeds a cell, 2026-10-24.
export const BOSS_TIERS = { "1": { "prism": { "S": 10.7, "A": 12.7, "B": 19.8 } }, "2": { "curbking": { "S": 17.6, "A": 19.6, "B": 32.3 } }, "3": { "maw": { "S": 18.9, "A": 20.9, "B": 22.9 } }, "4": { "blister": { "S": 17.9, "A": 23.3, "B": 25.3 } }, "5": { "kettle": { "S": 24.6, "A": 34.6, "B": 37.1 } }, "6": { "pike": { "S": 21.2, "A": 23.3, "B": 25.4 } }, "7": { "berg": { "S": 27.5, "A": 30.2, "B": 33 } }, "8": { "angler": { "S": 25.1, "A": 27.6, "B": 30.1 } }, "9": { "omega": { "S": 31.3, "A": 34.4, "B": 42.1 } } };

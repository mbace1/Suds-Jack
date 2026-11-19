// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by `node scripts/boss-tiers.mjs --write`: per
// world and its own boss (v45), the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// 12 seeds a cell, 2026-11-19.
export const BOSS_TIERS = { "1": { "prism": { "S": 20.7, "A": 22.8, "B": 24.9 } }, "2": { "curbking": { "S": 29.1, "A": 32, "B": 34.9 } }, "3": { "maw": { "S": 23.8, "A": 26.2, "B": 28.6 } }, "4": { "blister": { "S": 24.7, "A": 27.2, "B": 29.7 } }, "5": { "kettle": { "S": 28.9, "A": 31.8, "B": 34.7 } }, "6": { "pike": { "S": 29.3, "A": 32.2, "B": 35.1 } }, "7": { "berg": { "S": 25.4, "A": 27.9, "B": 30.4 } }, "8": { "angler": { "S": 29.6, "A": 33.8, "B": 36.8 } }, "9": { "omega": { "S": 31.1, "A": 34.2, "B": 37.3 } } };

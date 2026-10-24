// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by `node scripts/boss-tiers.mjs --write`: per
// world and per headliner, the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// 24 seeds a cell, 2026-10-24.
export const BOSS_TIERS = { "1": { "prism": { "S": 17, "A": 24.5, "B": 35.1 }, "omega": { "S": 32.1, "A": 44.8, "B": 62.7 } }, "2": { "prism": { "S": 11, "A": 13, "B": 30.4 }, "omega": { "S": 11, "A": 35.1, "B": 39.5 } }, "3": { "prism": { "S": 10.1, "A": 19.4, "B": 27.8 }, "omega": { "S": 16.9, "A": 20.7, "B": 41.5 } }, "4": { "prism": { "S": 16.7, "A": 20.5, "B": 33.2 }, "omega": { "S": 16.3, "A": 26.9, "B": 31.7 } }, "5": { "prism": { "S": 27.5, "A": 33.1, "B": 44.5 }, "omega": { "S": 45.2, "A": 49.7, "B": 80.5 } }, "6": { "prism": { "S": 11.5, "A": 21.1, "B": 25.2 }, "omega": { "S": 11, "A": 15.1, "B": 21.3 } }, "7": { "prism": { "S": 13.7, "A": 23.5, "B": 47.8 }, "omega": { "S": 31.5, "A": 40.8, "B": 70.2 } }, "8": { "prism": { "S": 16.1, "A": 22.4, "B": 35.6 }, "omega": { "S": 20.7, "A": 36.6, "B": 47 } }, "9": { "prism": { "S": 10.1, "A": 22, "B": 24 }, "omega": { "S": 21, "A": 23.1, "B": 43.1 } } };

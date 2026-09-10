// TOKO MIDORI GAMES — curated game lineage.
// Not a trivia encyclopedia: this is the family tree Toko uses to explain
// where design ideas came from, what they changed, and where they went next.

export const LINEAGES = [
  { id:'roguelike', aliases:['roguelike','roguelite','run based','run-based'], name:'ROGUELIKE / RUN-BASED',
    spine:['Rogue (1980)','NetHack (1987)','Mystery Dungeon (1993)','Diablo (1996)','Spelunky (2008)','The Binding of Isaac (2011)','FTL (2012)','Risk of Rain (2013)','Dead Cells (2018)','Hades (2020)','Returnal (2021)'],
    thought:'The important inheritance is not procedural rooms. It is consequence plus recombination: repeat a structure, change the circumstances, let failure produce knowledge.',
    tension:'Modern roguelites often soften loss with permanent progression. Useful, but dangerous: eventually the run can become a delivery vehicle for upgrades instead of the artwork itself.' },
  { id:'fps', aliases:['fps','first person shooter','first-person shooter','shooter'], name:'FIRST-PERSON SHOOTER',
    spine:['Maze War (1973)','Wolfenstein 3D (1992)','Doom (1993)','Quake (1996)','Half-Life (1998)','Halo (2001)','Call of Duty 4 (2007)','BioShock (2007)','Titanfall 2 (2016)','DOOM (2016)'],
    thought:'The genre keeps renegotiating the body: speed, aim, spatial reading, weapon rhythm and how much control survives spectacle.',
    tension:'The first-person camera is often mistaken for immersion by itself. Immersion comes from the world answering the body coherently.' },
  { id:'immersive', aliases:['immersive sim','immersive sims','system shock','deus ex'], name:'IMMERSIVE SIM',
    spine:['Ultima Underworld (1992)','System Shock (1994)','Thief (1998)','Deus Ex (2000)','Arx Fatalis (2002)','BioShock (2007)','Dishonored (2012)','Prey (2017)'],
    thought:'Authored spaces become possibility spaces. The designer builds rules and affordances, then accepts that the player may solve the room in an impolite way.',
    tension:'Too much scripting kills the promise. Too little authorship turns possibility into noise.' },
  { id:'souls', aliases:['soulslike','souls-like','souls like','dark souls','soulsborne'], name:'SOULS / CONSEQUENCE ACTION RPG',
    spine:["King's Field (1994)",'Demon’s Souls (2009)','Dark Souls (2011)','Bloodborne (2015)','Sekiro (2019)','Elden Ring (2022)'],
    thought:'Its real grammar is consequence, spatial memory, commitment and recovery. Difficulty is the visible surface, not the whole idea.',
    tension:'Copying stamina bars and corpse runs without understanding tension, space and enemy commitment produces costume rather than lineage.' },
  { id:'platformer', aliases:['platformer','platform game','platform games'], name:'PLATFORMER',
    spine:['Donkey Kong (1981)','Super Mario Bros. (1985)','Super Mario Bros. 3 (1988)','Sonic the Hedgehog (1991)','Super Mario 64 (1996)','Ico (2001)','Super Meat Boy (2010)','Celeste (2018)'],
    thought:'A platformer is an argument about movement. The level exists to make the body legible.',
    tension:'Adding abilities is easy. Preserving a clean relationship between input, momentum, space and consequence is harder.' },
  { id:'openworld', aliases:['open world','open-world','sandbox'], name:'OPEN WORLD',
    spine:['Elite (1984)','The Legend of Zelda (1986)','Ultima VI (1990)','Grand Theft Auto III (2001)','Morrowind (2002)','Far Cry 2 (2008)','Minecraft (2011)','Breath of the Wild (2017)','Elden Ring (2022)'],
    thought:'The best open worlds let curiosity become navigation and rules become plans. Size is almost irrelevant.',
    tension:'A map full of icons can make a huge world feel smaller than a single unexplained door.' },
  { id:'stealth', aliases:['stealth','stealth game','stealth games'], name:'STEALTH',
    spine:['Castle Wolfenstein (1981)','Metal Gear (1987)','Thief (1998)','Metal Gear Solid (1998)','Hitman: Codename 47 (2000)','Splinter Cell (2002)','Dishonored (2012)'],
    thought:'Stealth makes information itself into a resource: what they know, what you know, and how confidently either side knows it.',
    tension:'Perfect stealth can become save-scumming choreography. Interesting stealth survives partial failure.' },
  { id:'strategy', aliases:['strategy game','strategy games','rts','real time strategy','turn based strategy'], name:'STRATEGY',
    spine:['Computer Bismarck (1980)','M.U.L.E. (1983)','Civilization (1991)','Dune II (1992)','X-COM (1994)','StarCraft (1998)','Advance Wars (2001)','Into the Breach (2018)'],
    thought:'Strategy is prediction under constraint. The most elegant games expose enough information for responsibility without exposing enough for certainty.',
    tension:'Complexity is not depth. Depth is how many meaningful conclusions can grow from understandable rules.' },
  { id:'deckbuilder', aliases:['deckbuilder','deck builder','deck-building','deckbuilding'], name:'DECKBUILDER',
    spine:['Dominion (2008)','Dream Quest (2014)','Slay the Spire (2019)','Monster Train (2020)','Inscryption (2021)','Balatro (2024)'],
    thought:'The deck turns progression into authorship: you are not only playing the hand, you are constructing the probability space that future hands come from.',
    tension:'When every card is merely a bigger number, deckbuilding stops being composition and becomes accounting.' },
  { id:'metroidvania', aliases:['metroidvania','metroid','castlevania'], name:'METROIDVANIA',
    spine:['Metroid (1986)','Super Metroid (1994)','Castlevania: Symphony of the Night (1997)','Cave Story (2004)','Hollow Knight (2017)'],
    thought:'Knowledge and capability redraw the same space. Progress is powerful because the world you already saw changes meaning.',
    tension:'A locked door is not interesting merely because you return to it later. The return needs to alter understanding, movement or possibility.' },
  { id:'rhythm', aliases:['rhythm game','rhythm games','music game','music games'], name:'RHYTHM',
    spine:['PaRappa the Rapper (1996)','Beatmania (1997)','Dance Dance Revolution (1998)','Guitar Hero (2005)','Rhythm Heaven (2006)','Beat Saber (2018)'],
    thought:'Rhythm games make timing visible as physical intention. They are unusually honest about the fact that play is performance.',
    tension:'Spectacle helps, but latency and readable timing are the actual art materials.' },
  { id:'narrative', aliases:['narrative game','narrative games','story game','story games','walking simulator'], name:'NARRATIVE / authored exploration',
    spine:['Colossal Cave Adventure (1976)','Zork (1980)','Another World (1991)','Ico (2001)','The Stanley Parable (2013)','Gone Home (2013)','Kentucky Route Zero (2013–2020)','Disco Elysium (2019)'],
    thought:'Games do not need to choose between story and systems. The interesting question is what the player must do for the story to exist in this medium.',
    tension:'If interaction only advances the next piece of authored material, the player can start to feel like a page-turning mechanism.' }
];

const clean=s=>String(s||'').toLowerCase();
export function findLineage(raw){const q=clean(raw);return LINEAGES.find(x=>x.aliases.some(a=>q.includes(a)))||null}
export function lineageResponse(raw){const l=findLineage(raw);if(!l)return null;return [l.name,l.spine.join('  >  '),l.thought,l.tension]}
export function compareLineages(a,b){if(!a||!b)return null;return [`${a.name} / ${b.name}`,`${a.name}: ${a.thought}`,`${b.name}: ${b.thought}`,'Genres are useful as ancestry, not prison. The interesting games usually inherit from more than one family.']}

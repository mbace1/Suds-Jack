// TOKO MIDORI GAMES — project design + roadmap knowledge.
// Curated from repository design authority and roadmap documents.
// This is not a live parser for markdown: authored summaries keep Toko concise
// and let the source docs remain the authority when they change.
import { GAMES } from '../../hub/games.js';

export const PROJECTS = [
  {
    id:'tokodrop', aliases:['toko drop','tokodrop'], title:'Toko Drop',
    sources:['GDD.md','TOKO_DROP_ROADMAP.md'],
    design:[
      'Twin-stick swarm-survival arena shooter. Movement is the spine; the swarm reads the player’s gun and corpses bite back with revenge patterns.',
      'Portrait/mobile is first-class, with controller support. Roguelike upgrades are the default structure; classic arcade mode flows without between-wave interruption.',
      'The visual identity is gel/satin rather than post-processing spectacle. The game is deliberately music-free: SFX, stingers and announcer form the audio identity.'
    ],
    roadmap:[
      'Finish the showpiece art arc: corpse/swarm materials, arena/environment readability, then reactive surface response.',
      'Promote WebGPU from beta only when the gelation art visibly justifies it and passes a mid-range-phone performance checkpoint.',
      'Add the main-game unlock track, haptics/motion-comfort review, then Early Access on Pages + itch.io with changelog and feedback surfaced in-game.',
      'During Early Access: animation character pass, tunable hit-stop/camera kick, audio layering, silhouette/readability work, content drops and balance from seeded-run data.',
      '1.0: final tuning, teach-by-play onboarding, score-card sharing, real-play trailer and PWA/offline release on both venues.'
    ],
    constraints:['No Geometry Wars drift.','No CDN/runtime dependencies.','Mobile touch gets an answer for every feature.','Cabinet work is on hold until the main arc lands.']
  },
  {
    id:'piritori', aliases:['piritori','piritori to eden','piritori → eden'], title:'Piritori → Eden',
    sources:['piritori/DESIGN_AUTHORITY.md','piritori/DESIGN_LOCKS.md','piritori/GAME_DESIGN_DOCUMENT.md','piritori/ART_BIBLE.md','piritori/UX_SPEC.md','piritori/START_HERE.md'],
    design:[
      'A Kallio crime/economy narrative game built around a compressed city graph, authored encounters, market choices, crew, information and consequential formation battles.',
      'Era I is a finite seven-day Day/Night slice: Piritori purchase-to-first-profit, debt/old-markka economy, recruitable adults, one information-avoidable 2v2, one consequential 3v3 and multiple Pasila outcomes.',
      'The runtime uses registered art IDs and an approved-art pipeline rather than guessing filenames. Browser implementation and Godot port share design authority rather than diverging.'
    ],
    roadmap:[
      'Finish Era I to feature-complete quality before opening Era II.',
      'Strengthen authored encounters, market/news/crew interplay, battle consequence and map traversal inside the existing seven-day slice.',
      'Keep browser and Godot implementations aligned to DESIGN_AUTHORITY / DESIGN_LOCKS; ports do not create new canon.',
      'Only after the Era I gate is opened should 2024–2025 / Era II content begin.'
    ],
    constraints:['Era II is phase-gated.','Design authority resolves contradictions.','Runtime art comes only through the registered manifest.','No bundler/build-step drift in the browser version.']
  },
  {
    id:'eeri', aliases:['eeri','eeri game'], title:'Eeri',
    sources:['eeri/PHASING.md','eeri/DESIGN.md','eeri/ART_BRIEF.md'],
    design:[
      'A child-friendly crafted platformer: roughly 80% running, jumping, climbing, stomping and reading hazards; big construction machines are short authored ride set-pieces rather than the core loop.',
      'Levels use a Nintendo four-beat structure: introduce one idea safely, vary it, combine it, then test it once. One ride maximum per level, near the peak rather than the opening.',
      'Difficulty is generous: strong telegraphs, full-tile jump slack, infinite retries, midway checkpoints, knockback instead of health, and no timer.',
      'Four worlds of three levels are committed. Each world has its own construction setting, two-plus ride machines, three hidden golden bolts per level, and a world-end building assembled from what the player found.'
    ],
    roadmap:[
      'Build from 3 levels to 6, 9 and ultimately 12 — four worlds of three.',
      'Complete the core platform verbs and readability: stomp, climb, gizmos, small enemies and hazards before adding machine complexity.',
      'Author two-plus ride machines per world and keep each ride to a short 30–40 second change-of-gear sequence.',
      'Finish world-specific crafted backdrops, hidden collectibles, blueprint art unlocks and the world-end building assembly payoff.',
      'Keep levels directly addressable for playtests and maintain controller-first/mobile-friendly interaction.'
    ],
    constraints:['Crafted World is the default visual answer; Tropical Freeze is seasoning.','No lives or game over.','No timer.','SFX only for now.','The platformer must remain fun even if rides were deleted.']
  },
  {
    id:'hyperdagger', aliases:['hyper dagger','hyperdagger'], title:'Hyper Dagger',
    sources:['hyperdagger/js/main.js','VERSIONS.md'],
    design:[
      'A stripped Devil Daggers-style survival FPS where time is the score, authored spawn pressure is learned through repetition, and the player earns stronger dagger/hand states through gems.',
      'PURE mode keeps the one-touch-kill Devil Daggers grammar; HYPER is an optional life-timer remix where kills add time and hits subtract it.',
      'The current visual target is a coarse software-raster / voxel-horror image with strong enemy silhouettes, jawing skulls and readable threat rather than decorative background density.'
    ],
    roadmap:[
      'Keep moving look-and-feel incrementally toward the Devil Daggers reference: player weapon readability, enemy terror, spawn rhythm, arena image and second-to-second pressure.',
      'Use existing run telemetry — survival time, killer, pulse, weapon level, gems, kill breakdown and style peak — to tune actual failure patterns rather than guessing.',
      'Preserve fast retries and score/time mastery while resisting feature growth that weakens the core survival loop.'
    ],
    constraints:['Look-and-feel parity matters more than enemy-count parity.','No unnecessary scenery density.','Run telemetry is local-only.']
  },
  {
    id:'sudsjack', aliases:['suds jack','sudsjack'], title:'Suds Jack',
    sources:['sudz/game.js','hub/games.js'],
    design:[
      'A nine-lane vector score attack: Bomb Jack collection/chain logic inside a Tempest-like horizon mesh, with jumping, stomping and terrain peaks shaping movement.',
      'Everything arrives from the horizon. Orbs sustain the score chain; crawlers invite stomps; darts punish careless jumping; spikes punish staying put.',
      'The low camera and deep web are part of the game read, not decoration.'
    ],
    roadmap:[
      'Keep tightening the second-to-second lane read and the relationship between terrain, jumping and arriving hazards.',
      'Use real run/failure telemetry to identify whether deaths come from unreadable horizon information, movement limits or hazard timing.',
      'Preserve the compact score-attack identity instead of expanding into a feature-heavy action game.'
    ],
    constraints:['Nine lanes remain the grammar.','Controller and touch supported.','The horizon/readability problem takes priority over extra content.']
  },
  {
    id:'flashprince', aliases:['flash prince','flashprince'], title:'Flash Prince',
    sources:['README.md','CLAUDE.md','flashprince/'],
    design:[
      'A cinematic side-view action/platform game built around Flashback-style rotoscoped movement, dense atmospheric biomes and a strong authored sci-fi world.',
      'Movement animation quality is foundational: the default character owns a coherent animation set, while older animation material can become a distinct secondary character rather than mixing styles.',
      'World design aims for beauty and mystery: flooded-city spaces, retro machines/loot, transport infrastructure, bio-organic facilities and visible life without body horror.'
    ],
    roadmap:[
      'Finish animation coherence and polish before expanding secondary visual systems.',
      'Build distinct traversable biomes with layered environmental life, retro loot/machines and bespoke traversal animation.',
      'Develop the flooded-city and bio-organic facility spaces as strong environmental identities rather than generic sci-fi backdrops.'
    ],
    constraints:['Flashback-like motion remains the reference spine.','Biomes must feel distinct but share one authored visual language.','Beauty/mystery over body horror.']
  }
];

function clean(s){return String(s||'').toLowerCase().replace(/[→]/g,'to').replace(/[^a-z0-9 -]/g,' ').replace(/\s+/g,' ').trim()}
export function findProject(raw){
  const q=clean(raw);
  const rich=PROJECTS.find(p=>p.aliases.some(a=>q.includes(clean(a))));
  if(rich)return rich;
  const g=GAMES.find(g=>q.includes(clean(g.title||''))||q.includes(clean(g.id)));
  if(!g)return null;
  return {id:g.id,title:g.title||g.id,sources:['hub/games.js'],design:[g.tagline||'No authored design summary yet.',g.lineage?`Declared lineage: ${g.lineage}.`:null].filter(Boolean),roadmap:[g.note||'No dedicated roadmap document is registered yet.'],constraints:[]};
}
export function projectList(){
  const richIds=new Set(PROJECTS.map(p=>p.id));
  const generic=GAMES.filter(g=>!richIds.has(g.id)).map(g=>({id:g.id,title:g.title||g.id}));
  return [...PROJECTS.map(p=>({id:p.id,title:p.title})),...generic];
}
export function designLines(raw){const p=findProject(raw);if(!p)return null;return [p.title.toUpperCase()+' — DESIGN',...p.design];}
export function roadmapLines(raw){const p=findProject(raw);if(!p)return null;return [p.title.toUpperCase()+' — ROADMAP',...p.roadmap.map((x,i)=>`${i+1}. ${x}`)];}
export function constraintLines(raw){const p=findProject(raw);if(!p)return null;return p.constraints.length?[p.title.toUpperCase()+' — LOCKS',...p.constraints]:[p.title.toUpperCase(),'NO EXTRA PROJECT-SPECIFIC LOCKS ARE REGISTERED IN MY SHORT FORM YET.'];}
export function sourceLines(raw){const p=findProject(raw);if(!p)return null;return [p.title.toUpperCase()+' — SOURCE OF TRUTH',...p.sources];}
export function compareProjects(aRaw,bRaw){const a=findProject(aRaw),b=findProject(bRaw);if(!a||!b||a.id===b.id)return null;return [`${a.title.toUpperCase()} / ${b.title.toUpperCase()}`,`${a.title}: ${a.design[0]}`,`${b.title}: ${b.design[0]}`,'Different projects should share Toko values, not identical mechanics.'];}

const api={PROJECTS,findProject,projectList,designLines,roadmapLines,constraintLines,sourceLines,compareProjects};
globalThis.TokoProjectKnowledge=api;
export default api;

import { Hero } from './hero.js';
import { POSE as Q, P, sample } from './figure.js';
import { R } from './movement-poses.js';
import { HERO_STATES } from './hero-state-contract.js';

export const CHARACTER_PROFILES = ['prince','classic'];
export const DEFAULT_CHARACTER = 'prince';

const V = {
  runA:P(39,6,-34,49,-43,49,43,37,18,-5,0,0,0), runB:P(24,25,-23,36,-31,57,34,46,19,-5,-1,0,0),
  runC:P(4,54,-9,13,-13,67,17,54,17,-5,-3,0,0), runD:P(-24,35,24,24,32,47,-30,58,18,-5,-1,0,0),
  runE:P(-34,49,39,6,43,37,-43,49,18,-5,0,0,0), runF:P(-23,36,24,25,34,46,-31,57,19,-5,-1,0,0),
  runG:P(-9,13,4,54,17,54,-13,67,17,-5,-3,0,0), runH:P(24,24,-24,35,-30,58,32,47,18,-5,-1,0,0),
  jump:P(7,18,35,48,72,27,48,39,23,-9,-5,0,0), float:P(34,62,-10,42,44,63,-8,56,10,-5,-1,0,0),
  fall:P(16,33,-24,26,-18,44,-34,38,5,1,0,0,0), land:P(55,78,46,80,39,70,31,66,31,-7,11,1,0),
  catch:P(28,39,10,27,174,8,169,10,15,-4,-3,0,0), swing:P(43,52,24,38,168,11,163,13,-12,6,3,0,0),
};

export const PRINCE_CLIPS = {
  wake:[[Q.deadB,24],[Q.sprawl,18],[Q.crouch,14],[Q.standUp,12],[Q.stand,8]],
  stand:[[Q.breathe,46],[Q.stand,54]], standArmed:[[Q.aim,60],[Q.aim,60]],
  turn:[[R.pivotLoad,5],[R.pivotPlant,5],[R.pivotPush,5],[Q.stand,3]],
  step:[[Q.step1,5],[Q.step2,6],[Q.step3,5],[Q.stand,6]],
  run:[[V.runA,3],[V.runB,2],[V.runC,3],[V.runD,2],[V.runE,3],[V.runF,2],[V.runG,3],[V.runH,2]],
  skid:[[R.brakeReach,5],[R.brakePlant,7],[R.brakeSettle,5],[Q.stand,3]],
  crouch:[[Q.crouch,9]], crouchIdle:[[Q.crouch,60],[Q.crouchLo,60]], crouchArmed:[[Q.aimLow,60],[Q.aimLow,60]],
  standUp:[[Q.crouch,5],[Q.standUp,7]], roll:[[Q.tuck,5],[Q.tuck,16],[Q.crouch,7]],
  gather:[[R.jumpLoad,5],[V.jump,3]], gatherRun:[[R.runTake,2],[V.jump,3]],
  air:[[V.jump,6],[Q.rise,7],[V.float,10],[V.fall,40]], fall:[[V.fall,48]],
  land:[[V.land,4],[R.landCatch,4],[R.landRise,3],[Q.stand,2]], landHard:[[Q.sprawl,12],[R.landCatch,7],[R.landRise,6],[Q.stand,3]],
  hang:[[Q.hang,55],[Q.hangSwing,55]], pullUp:[[Q.hang,4],[Q.pullUp,13],[R.mantleKnee,12],[R.mantleRise,9],[Q.stand,4]],
  drawGun:[[Q.draw1,10],[Q.draw2,11],[Q.aim,4]], holster:[[Q.draw2,8],[Q.draw1,8],[Q.stand,4]],
  fire:[[Q.recoil,4],[Q.aim,8]], fireLow:[[Q.recoil,4],[Q.aimLow,8]],
  hurt:[[Q.hurt,12],[Q.stand,8]], dead:[[Q.deadA,10],[Q.deadB,40]],
};

export function profileCoversAllStates() { return HERO_STATES.every(s => PRINCE_CLIPS[s]); }

const originalPose = Hero.prototype.pose;
let profile = DEFAULT_CHARACTER;

export function setCharacterProfile(next) {
  if (!CHARACTER_PROFILES.includes(next)) return profile;
  profile = next;
  try { localStorage.setItem('flashPrinceCharacter', profile); } catch {}
  return profile;
}
export function getCharacterProfile() { return profile; }

try {
  const saved = localStorage.getItem('flashPrinceCharacter');
  if (CHARACTER_PROFILES.includes(saved)) profile = saved;
} catch {}

Hero.prototype.pose = function characterSpecificPose() {
  if (profile === 'classic') return originalPose.call(this);
  const clip = PRINCE_CLIPS[this.state];
  return sample(clip, this.f, ['stand','standArmed','run','crouchIdle','crouchArmed','hang'].includes(this.state));
};

addEventListener('keydown', e => {
  if (e.code !== 'KeyC') return;
  setCharacterProfile(profile === 'prince' ? 'classic' : 'prince');
});

globalThis.__flashPrinceCharacter = {
  get profile(){ return profile; },
  profiles: CHARACTER_PROFILES,
  set: setCharacterProfile,
  coverage: () => ({ covered: Object.keys(PRINCE_CLIPS), missing: HERO_STATES.filter(s => !PRINCE_CLIPS[s]) }),
};

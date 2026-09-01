import { W, H } from './screen.js';
import { C } from './palette.js';
import { ANIM, frameCount, drawSprite } from './sprite.js?v=60';

// The gallery is a diagnostic surface, not a separate renderer. It must show
// the same character sheet choice the player is testing in FREE mode; otherwise
// a second character can look correct in play and silently revert to Conrad in
// the frame inspector. The v18 run remains a locked legacy family.
const REEL = [
  ['stand', 'STANDING'], ['step', 'WALK · first step'], ['stepB', 'WALK · second step'],
  ['run', 'RUN — twenty frames'], ['legacyRun', 'V18 RUN — legacy character'],
  ['runStart', 'RUN · winding up'], ['skid', 'RUN · coming to a halt'], ['turn', 'TURNING ROUND'],
  ['crouch', 'CROUCHING'], ['crouchLow', 'CROUCHED'], ['rise', 'STANDING UP'],
  ['stepUp', 'LOW CLIMB'], ['collect', 'PICKING UP'], ['roll', 'THE ROLL'],
  ['hurt', 'TAKING A HIT'], ['shocked', 'SHOCKED'], ['gather', 'JUMP · gather'],
  ['airUp', 'JUMP · drive'], ['land', 'JUMP · landing'], ['gatherRun', 'RUNNING JUMP · gather'],
  ['airRun', 'RUNNING JUMP · flight'], ['fall', 'FALLING'], ['landHard', 'LANDING HARD'],
  ['hang', 'HANGING'], ['mantle', 'PULLING UP'], ['lower', 'CLIMBING DOWN'],
  ['wake', 'GETTING UP'], ['dead', 'DEAD'], ['drawGun', 'PISTOL · drawing'],
  ['aim', 'PISTOL · aimed'], ['fire', 'PISTOL · the shot'], ['crouchDraw', 'PISTOL · going down'],
  ['crouchAim', 'PISTOL · aimed, crouched'], ['crouchFire', 'PISTOL · the shot, crouched'],
];

const original = window.__fp?.stage?.gallery;
if (original) {
  const stage = window.__fp.stage;
  stage.gallery = function galleryPolished(scr) {
    const [name, label] = REEL[this.reel];
    const a = ANIM[name];
    const n = frameCount(name);
    const hold = a.hold ?? 4;
    const i = Math.floor(this.t / hold);
    const frame = a.loop ? i % n : Math.min(i, n - 1);
    if (!a.loop && i >= n + 8) this.t = 0;

    const y = a.ledge ? 144 - 46 : 144;
    if (!a.ledge) {
      scr.rect(0, 144, W, H - 144, C.SOLID);
      scr.rect(0, 144, W, 1, C.EDGE);
      scr.poly([W / 2 - 9, 143, W / 2 + 9, 143, W / 2 + 6, 146, W / 2 - 6, 146], C.DARK);
    } else {
      scr.rect(0, y, W / 2 - 6, H - y, C.SOLID);
      scr.rect(0, y, W / 2 - 6, 1, C.EDGE);
    }

    const choice = this.characterChoice;
    const variant = choice === 1 || choice === 2 ? 'classicBody' : undefined;
    const characterName = choice === 1 ? 'COURIER' : choice === 2 ? 'V18 LEGACY' : 'CONRAD';
    drawSprite(scr, name, frame, W / 2, y, 1, variant);

    this.centre(scr, `${characterName} · ${label}`, 22, C.LUX);
    this.centre(scr, `${frame + 1} / ${n}${this.paused ? '  ·  HELD' : ''}`, 34, C.EDGE);
    this.centre(scr, `${this.reel + 1} of ${REEL.length}`, 144 + 14, C.DARK);
  };
}

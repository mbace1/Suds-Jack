---
name: sakurai
description: Masahiro Sakurai's game-design principles (from his YouTube series 桜井政博のゲーム作るには), as an English design and review checklist for Toko Drop 2.0. Use when designing, reviewing or tuning anything in toko-drop-2. That covers waves, enemies, bosses, campaign rooms, difficulty, rewards, onboarding, hit feel (hitstop, shake, flash, hit marks), effects, UI, sound, parameters and debug tools. Also use when someone says "what would Sakurai do", "it feels weak / floaty / slow", or "too hard / too easy".
---

# Sakurai lens for Toko Drop 2.0

**Source and credit:** this is a short English digest written by D-sign (producer). It's based on [kociden/sakurai-skill](https://github.com/kociden/sakurai-skill), an **unofficial, fan-made AI summary** of the subtitles of Sakurai's 257 videos. It is **not Sakurai's words** and isn't affiliated with Sakurai or Sora Ltd. See `NOTICE.md`. The upstream has no license, so its Japanese files are not copied here. For specific numbers, procedures and examples, fetch it locally (do not commit it):

```bash
git clone --depth 1 https://github.com/kociden/sakurai-skill /tmp/sakurai-skill
# then read only the category you need: /tmp/sakurai-skill/skills/sakurai/references/{gameplay,planning,specs,effects,tech,ui,sound,motion,graphics}.md
```

## How to use it on Toko Drop 2.0 (house rules)

1. **Apply the principles, cite the chapter.** In PRs and notes, write e.g. "Sakurai §2 (fast retry, #116)". The § numbers match the upstream SKILL.md chapters, and #NNN is the video number.
2. **Every criticism comes with a fix** (§12). Violation → concrete change → which `TUNING` value or level JSON it touches.
3. **Bring design questions back to D-sign/Mikael instead of deciding quietly.** The producer doc `toko-drop-2/DESIGN.md` §6 maps these principles to Drop 2.0. Its entries are **PROPOSAL** until Mikael decides. Pillar 1, "keep the feel that already works", wins on conflict. Put feel changes behind a `TUNING` toggle so they can be A/B'd on a phone.
4. Sakurai's experience is big-studio action. Read through to the aim (entertaining the player) when a rule doesn't fit a phone twin-stick swarm game.

## The chapters, condensed

- **§0 Root:** the goal is always the player's fun, not the maker's convenience. Break fun down → understand why it works → rebuild it your own way. "It's like X" is not enough; stack several charms X doesn't have.
- **§1 Gameplay = risk and return** (#006, #191, #236): put the risk and the return **close together and balanced** (the closer you get, the more dangerous, and the more you can kill). Ask "did the player do something that good?" for every reward and penalty. Mix in the opposite to make a pleasure land (floating needs falling). The core shape is **squeeze, then release (ギュッとしてパッと, #009/#071)**. **Average is mediocre** (#216/#245): don't trim strengths and fill weaknesses until everything is the same; grow strengths *and* weaknesses, and fix on another axis (startup, recovery, hitbox) instead of the signature stat. **Sharpen each character/enemy until it fits in one phrase** (#204). Randomness is fine for freshness but not where skill should decide. Allow in-game exploits.
- **§2 Difficulty and retry** (#105, #116, #127, #211, #254): devs are used to their game, so tune **lower than you think**. Getting stuck with no way through is the worst outcome; offer help without humiliation. **Retry fast**: the time from death to control cools players more than the penalty does. Make defeat beats short and loud, and never respawn into danger. **Don't make strength a straight ramp**: alternate bosses (a problem to think through) with flats and farming spots. Runs that repeat must keep showing what's ahead.
- **§3 Rewards** (#023, #075, #095, #149, #198): decide the rewards as soon as the skeleton works. Numeric rewards need a use. **Hang the goal in front of the player** ("N more to the next level"). Stage **praise**. Score gains meaning when shown as a real-world measure.
- **§4 Onboarding and tempo** (#017, #073, #085, #171, #233, #244, #248): **show the fun in the first 3 minutes**, and open on a climax. **The tutorial lives inside the real game**: no empty practice yards or walls of text. **Slowness is a sin**: fades, waits and transitions all count, so trim slightly too much. Every press gets a reaction. Everything can be skipped and paused.
- **§5 Feel and specs** (#003, #047, #037, #253): **always use hitstop**. Shake the receiver more than the attacker (visual only, not the hitbox), sideways on the ground, decaying from big to small. Length = power × per-move factor, with a ~4F blend into the hurt pose. Boss kill and player death get a stop plus a flash. Fall faster than you rise. Offset sprite position or pivot slightly so motion has life. Recheck difficulty after any performance change (frame rate changes difficulty).
- **§6 Motion:** idle → windup → strike → follow-through. The windup jumps to an extreme pose on frame 1. The hit pose and follow-through are what players remember. Overdo it; small or far characters move bigger. Hitboxes slightly bigger than they look.
- **§7 Effects** (#016, #056, #103, #130, #221, #242): don't rely on mushy additive glow. Use drawn shapes with dark tones mixed in so effects read on bright floors. Hit marks: as loud as the effect, crisp, spawned at the overlap, several elements, don't bury the character, gone fast, readable on light and dark. Explosions go **flash → fireball → black smoke → settle**. Shake big/medium/small with different *patterns*, strong first and then decaying. Flashes alternate light and dark. Particles: short life, few, not stacked.
- **§8 Graphics:** paint the light, not the material colour. **Emphasise what has collision (floor, blockers) and keep backgrounds quiet.** Unify the art touch across characters. Characters should read in silhouette. Check on cheap screens, in grayscale and with a colour-blindness simulation.
- **§9 UI:** choose clarity vs style per the game's goal. Big things are important things. Help text shouldn't repeat the label. Remappable controls. HUD shows only what makes play easier or more fun.
- **§10 Sound:** prioritise by impact on the player (KO > hit > special > explosion > dodge > whiff > jump/land > steps > ambience). Hits get a strong attack and moderate reverb, ideally done inside the hitstop. BGM tempo matches the game's speed. An arrangement keeps the original melody.
- **§11 Tuning and tech** (#046, #193, #215): **parameters live outside the code** ("program = skeleton, parameters = muscle"). Changes go live in the running game with one action, because the number of iterations decides how deep the tuning gets. Build a **debug mode** (set health, freeze, free camera, swap characters, hide parts) that runs on the normal controller. Bugs cluster in forced control, scene transitions, crazy terrain and growth parameters.
- **§12 Team and decisions:** decide on the spot, never put it off. Don't decide by vote (that leaves you with the safe, average choice). The concept is the lighthouse. The director's job is cutting. Criticism always comes with a fix. Watch first-time players react instead of asking them.
- **§13 Pitch and PR:** show gameplay first. The product image must match the contents. A sequel must feel clearly powered up.

## Quick checklists

- **"Feels weak":** hitstop → hit mark → attack of the hit sound → shake/flash → windup snap and hit-pose exaggeration.
- **"Feels slow":** share of time actually in control, transitions and fades, death-to-retry time, windup frame 1.
- **Reviewing a wave/room:** what's the one squeeze and the one release? Is risk next to return? Can every enemy be said in one phrase? Is the world rule the *ask*, or only a backdrop? What reward is in front of the player? How fast is the retry?

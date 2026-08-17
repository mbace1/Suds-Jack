// Kindling v9 — short, deterministic, one-hand turn-based combat under Journey.
// Combat never spends care points, Flames or Bond XP and can never undo real-life progress.
// Companion combat tendency now changes the encounter while preserving the original Ember baseline.

const wait = ms => new Promise(r => setTimeout(r, ms));
while (!window.__kd || !window.__bettermentUx || !window.__bettermentGdd) await wait(10);

const kd = window.__kd;
const ux = window.__bettermentUx;
const gdd = window.__bettermentGdd;
const { save, note } = await import('./state.js?v=5');
const meta = gdd.meta;

const ENEMY = {
  id: 'moss-knight',
  name: 'Moss Knight',
  maxHp: 24,
  region: 'Birch Ruins',
};

const INTENTS = [
  { id: 'swing', label: 'ROOT SWING', damage: 4, text: 'A steady hit is coming.' },
  { id: 'crush', label: 'OVERHEAD CRUSH', damage: 7, text: 'A heavy blow. Guarding matters.' },
  { id: 'mend', label: 'MOSS REKNITS', damage: 0, heal: 2, text: 'It pauses to pull itself together.' },
];

const STYLES = {
  'quick striker': {
    label: 'Quick striker', hp: 20, sparks: 1, strike: 4, skill: 9, guardFactor: .25, counter: 0,
    note: 'Balanced prototype kit. Strike builds Sparks quickly.',
  },
  'guard-heavy': {
    label: 'Guard-heavy', hp: 24, sparks: 1, strike: 3, skill: 8, guardFactor: .12, counter: 0,
    note: 'More HP and a stronger Guard, with lighter attacks.',
  },
  'skill-focused': {
    label: 'Skill-focused', hp: 18, sparks: 2, strike: 3, skill: 11, guardFactor: .25, counter: 0,
    note: 'Starts charged and hits harder with Ember Lash.',
  },
  counterattacker: {
    label: 'Counterattacker', hp: 20, sparks: 1, strike: 4, skill: 8, guardFactor: .25, counter: 2,
    note: 'Guard returns 2 damage whenever it catches an attack.',
  },
};

const make = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function ensureCombat() {
  meta.combat ||= {};
  const c = meta.combat;
  if (!Number.isFinite(c.wins)) c.wins = 0;
  if (!Number.isFinite(c.retreats)) c.retreats = 0;
  if (!Number.isFinite(c.mossFragments)) c.mossFragments = 0;
  if (!('current' in c)) c.current = null;
  return c;
}

const combat = ensureCombat();
const styleOf = id => STYLES[id] || STYLES['quick striker'];

function freshFight() {
  const styleId = meta.companion?.combatStyle || 'quick striker';
  const profile = styleOf(styleId);
  return {
    id: ENEMY.id,
    status: 'active',
    companionId: meta.companion?.id || null,
    companionName: meta.companion?.name || 'Ember',
    style: styleId,
    playerHp: profile.hp,
    playerMaxHp: profile.hp,
    enemyHp: ENEMY.maxHp,
    enemyMaxHp: ENEMY.maxHp,
    sparks: profile.sparks,
    maxSparks: 3,
    turn: 0,
    guarded: false,
    log: 'A Moss Knight pulls itself upright between the birches.',
  };
}

function currentIntent(fight = combat.current) {
  if (!fight) return INTENTS[0];
  return INTENTS[fight.turn % INTENTS.length];
}

function pct(now, max) {
  return `${Math.max(0, Math.min(100, Math.round((now / max) * 100)))}%`;
}

function startFight() {
  if (meta.kindling?.event?.pending) return false;
  combat.current = freshFight();
  save();
  renderFight();
  return true;
}

function finishVictory(fight) {
  fight.status = 'victory';
  fight.enemyHp = 0;
  fight.log = 'The Moss Knight folds into wet bark and moss.';
  combat.wins += 1;
  combat.mossFragments += 1;
  note('Defeated a Moss Knight in the Birch Ruins.');
  save();
}

function finishRetreat(fight) {
  fight.status = 'retreat';
  fight.playerHp = 0;
  fight.log = 'Your companion slips back through the ruins to the bonfire.';
  combat.retreats += 1;
  save();
}

function enemyTurn(fight) {
  if (fight.status !== 'active' || fight.enemyHp <= 0) return;
  const intent = currentIntent(fight);
  const profile = styleOf(fight.style);

  if (intent.heal) {
    const before = fight.enemyHp;
    fight.enemyHp = Math.min(fight.enemyMaxHp, fight.enemyHp + intent.heal);
    const healed = fight.enemyHp - before;
    fight.log += healed ? ` The knight reknits ${healed} HP.` : ' The moss has nothing left to mend.';
  } else if (intent.damage > 0) {
    const wasGuarded = fight.guarded;
    const incoming = wasGuarded ? Math.max(1, Math.floor(intent.damage * profile.guardFactor)) : intent.damage;
    fight.playerHp = Math.max(0, fight.playerHp - incoming);
    fight.log += wasGuarded
      ? ` Guard catches the blow. ${incoming} damage gets through.`
      : ` ${intent.damage} damage lands.`;
    if (wasGuarded && profile.counter > 0) {
      fight.enemyHp = Math.max(0, fight.enemyHp - profile.counter);
      fight.log += ` The counter returns ${profile.counter}.`;
    }
  }

  fight.guarded = false;
  fight.turn += 1;
  if (fight.enemyHp <= 0) finishVictory(fight);
  else if (fight.playerHp <= 0) finishRetreat(fight);
}

function act(kind) {
  const fight = combat.current;
  if (!fight || fight.status !== 'active') return false;
  const profile = styleOf(fight.style);

  if (kind === 'strike') {
    fight.enemyHp = Math.max(0, fight.enemyHp - profile.strike);
    fight.sparks = Math.min(fight.maxSparks, fight.sparks + 1);
    fight.log = `Strike bites through the moss for ${profile.strike}.`;
  } else if (kind === 'guard') {
    fight.guarded = true;
    fight.sparks = Math.min(fight.maxSparks, fight.sparks + 1);
    fight.log = profile.counter
      ? 'You brace. A caught attack will answer with a counter.'
      : 'You brace. The next hit will be heavily reduced.';
  } else if (kind === 'skill') {
    if (fight.sparks < 2) return false;
    fight.sparks -= 2;
    fight.enemyHp = Math.max(0, fight.enemyHp - profile.skill);
    fight.log = `EMBER LASH tears across the knight for ${profile.skill}.`;
  } else {
    return false;
  }

  if (fight.enemyHp <= 0) finishVictory(fight);
  else enemyTurn(fight);

  save();
  renderFight();
  return true;
}

function hpBlock(label, hp, max, enemy = false) {
  const wrap = make('div', `bm-combat-hp${enemy ? ' enemy' : ''}`);
  const top = make('div', 'bm-combat-hp-top');
  top.append(make('strong', '', label), make('span', '', `${hp} / ${max}`));
  const track = make('div', 'bm-combat-hp-track');
  const fill = make('div', 'bm-combat-hp-fill');
  fill.style.width = pct(hp, max);
  track.appendChild(fill);
  wrap.append(top, track);
  return wrap;
}

function fighter(cls, mark, name) {
  const wrap = make('div', `bm-fighter ${cls}`);
  wrap.append(make('div', 'bm-fighter-mark', mark), make('strong', '', name));
  return wrap;
}

function sparksRow(fight) {
  const wrap = make('div', 'bm-sparks');
  wrap.appendChild(make('span', 'bm-eyebrow', 'SPARKS'));
  const pips = make('div', 'bm-spark-pips');
  for (let i = 0; i < fight.maxSparks; i++) pips.appendChild(make('span', `bm-spark${i < fight.sparks ? ' on' : ''}`));
  wrap.appendChild(pips);
  return wrap;
}

function resultPanel(fight) {
  const result = make('section', `bm-combat-result ${fight.status}`);
  if (fight.status === 'victory') {
    result.append(
      make('span', 'bm-eyebrow', 'VICTORY'),
      make('h3', '', 'Moss Knight defeated'),
      make('p', 'bm-page-copy', 'The fight changes nothing about Today. You found a Moss Fragment for the journey collection.'),
      make('strong', 'bm-combat-reward', `Moss Fragment ×${combat.mossFragments}`),
    );
  } else {
    result.append(
      make('span', 'bm-eyebrow', 'RETREAT'),
      make('h3', '', 'Back to the bonfire'),
      make('p', 'bm-page-copy', 'No care progress, Bond, Flames or collected items were lost.'),
    );
  }

  const buttons = make('div', 'bm-combat-result-actions');
  const retry = make('button', 'btn', 'Fight again');
  retry.type = 'button';
  retry.addEventListener('click', startFight);
  const back = make('button', 'btn', 'Return to Journey');
  back.type = 'button';
  back.addEventListener('click', () => {
    combat.current = null;
    save();
    ux.navigate('journey');
    setTimeout(sync, 0);
  });
  buttons.append(retry, back);
  result.appendChild(buttons);
  return result;
}

function fightView() {
  const fight = combat.current;
  if (!fight) return null;
  const profile = styleOf(fight.style);

  const wrap = make('div', 'bm-page bm-combat-page');
  wrap.append(make('span', 'bm-eyebrow', ENEMY.region.toUpperCase()), make('h2', '', ENEMY.name));

  const arena = make('section', 'bm-combat-arena');
  const enemyName = ENEMY.name;
  const companionName = fight.companionName || meta.companion?.name || 'Ember';
  const actors = make('div', 'bm-combat-actors');
  actors.append(fighter('player', '●', companionName), fighter('foe', '♜', enemyName));
  arena.append(actors, hpBlock(companionName, fight.playerHp, fight.playerMaxHp), hpBlock(enemyName, fight.enemyHp, fight.enemyMaxHp, true));
  const styleLine = make('p', 'bm-combat-style', `${profile.label} · ${profile.note}`);
  arena.appendChild(styleLine);
  wrap.appendChild(arena);

  if (fight.status !== 'active') {
    wrap.appendChild(resultPanel(fight));
    return wrap;
  }

  const intent = currentIntent(fight);
  const telegraph = make('section', 'bm-combat-intent');
  telegraph.append(
    make('span', 'bm-eyebrow', 'ENEMY INTENT'),
    make('strong', '', intent.label),
    make('p', '', intent.damage ? `${intent.damage} incoming damage · ${intent.text}` : intent.text),
  );
  wrap.appendChild(telegraph);
  wrap.appendChild(sparksRow(fight));
  wrap.appendChild(make('p', 'bm-combat-log', fight.log));

  const actions = make('div', 'bm-combat-actions');
  const guardText = profile.counter ? `Reduce hit + ${profile.counter} counter · +1 Spark` : 'Reduce next hit · +1 Spark';
  const specs = [
    ['strike', 'STRIKE', `${profile.strike} dmg · +1 Spark`],
    ['guard', 'GUARD', guardText],
    ['skill', 'EMBER LASH', `${profile.skill} dmg · costs 2 Sparks`],
  ];
  for (const [id, title, sub] of specs) {
    const b = make('button', `bm-combat-action ${id}`);
    b.type = 'button';
    b.append(make('strong', '', title), make('span', '', sub));
    if (id === 'skill') b.disabled = fight.sparks < 2;
    b.addEventListener('click', () => act(id));
    actions.appendChild(b);
  }
  wrap.appendChild(actions);

  const leave = make('button', 'bm-combat-leave', 'Leave encounter');
  leave.type = 'button';
  leave.addEventListener('click', () => {
    combat.current = null;
    save();
    ux.navigate('journey');
    setTimeout(sync, 0);
  });
  wrap.appendChild(leave);
  return wrap;
}

function renderFight() {
  const view = fightView();
  if (!view) return;
  document.getElementById('panel').replaceChildren(view);
  kd.debug.say(combat.current?.status === 'active'
    ? 'The Moss Knight watches your companion through the roots.'
    : combat.current?.status === 'victory'
      ? 'A fragment of green stone is left in the moss.'
      : 'The ruins can wait. Nothing from Today was lost.');
}

function encounterCard() {
  const styleId = meta.companion?.combatStyle || 'quick striker';
  const profile = styleOf(styleId);
  const card = make('section', 'bm-card bm-encounter-card');
  card.dataset.combatEncounter = 'moss-knight';
  const copy = make('div', 'bm-encounter-copy');
  copy.append(
    make('span', 'bm-eyebrow', 'ENCOUNTER'),
    make('strong', '', 'Moss Knight'),
    make('p', 'bm-page-copy', `A 30–60 second prototype fight. ${meta.companion?.name || 'Ember'} enters as ${profile.label.toLowerCase()}. Care progress is never at risk.`),
  );
  const stats = make('div', 'bm-encounter-stats', `${combat.wins} wins · ${combat.mossFragments} fragments`);
  const button = make('button', 'btn bm-fight', combat.current?.status === 'active' ? 'Resume fight' : 'Fight');
  button.type = 'button';
  button.addEventListener('click', () => {
    if (!combat.current || combat.current.status !== 'active') combat.current = freshFight();
    save();
    renderFight();
  });
  card.append(copy, stats, button);
  return card;
}

function onJourneyPage() {
  const panel = document.getElementById('panel');
  const page = panel.querySelector('.bm-page');
  if (!page || page.classList.contains('bm-combat-page')) return false;
  const eyebrow = page.querySelector('.bm-eyebrow');
  if (!eyebrow || eyebrow.textContent.trim().toUpperCase() !== 'JOURNEY') return false;
  if (meta.kindling?.event?.pending) return false;
  const old = page.querySelector('[data-combat-encounter]');
  if (old) old.replaceWith(encounterCard()); else page.appendChild(encounterCard());
  return true;
}

function sync() {
  ensureCombat();
  onJourneyPage();
}

new MutationObserver(() => setTimeout(sync, 0)).observe(document.getElementById('panel'), { childList: true });
setInterval(sync, 500);
sync();

window.__bettermentCombat = {
  state: combat,
  enemy: ENEMY,
  intents: INTENTS,
  styles: STYLES,
  start: startFight,
  act,
  render: renderFight,
  reset() { combat.current = null; save(); },
};
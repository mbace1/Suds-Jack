import { rng } from './goals.js?v=2';

const EVENTS = [
  {
    id: 'sponsor',
    title: 'THE LOGO IN THE CORNER',
    body: 'A wheel company will pay for the tape. They want numbers under every clip.',
    choices: [
      {
        label: 'Take the flow',
        result: 'Every score goal is 15% higher. Every paid spot earns 35% more footage.',
        apply(run) { run.flags.sponsorQuota = 1.15; run.flags.sponsorPay = 1.35; },
      },
      { label: 'Keep the frame clean', result: 'Nothing changes. That is a choice too.', apply() {} },
    ],
  },
  {
    id: 'stoppers',
    title: 'THE PLAZA CHANGED OVERNIGHT',
    body: 'Fresh steel knobs sit along the cleanest line. Security is still asleep.',
    choices: [
      {
        label: 'Film it as it is',
        result: 'Skate-stoppers become a permanent hazard. Take 45 footage for the ugly clip.',
        apply(run) { run.flags.stoppers = Math.min(3, run.flags.stoppers + 1); run.footage += 45; },
      },
      {
        label: 'Pull them out',
        result: 'Spend one film reel documenting nothing. The line stays clean.',
        apply(run) { run.film = Math.max(0, run.film - 1); },
      },
    ],
  },
  {
    id: 'rival',
    title: 'SOMEONE POSTS YOUR LINE FIRST',
    body: 'Same rail. Better light. They tag you beneath it with one word: again?',
    choices: [
      {
        label: 'Answer in the part',
        result: 'The rival target rises by 4,000. Beating it pays 50 extra footage.',
        apply(run) { run.flags.rivalBonus += 4000; },
      },
      { label: 'Mute the account', result: 'The boss stays where it was.', apply() {} },
    ],
  },
  {
    id: 'knee',
    title: 'THE KNEE IS LOUDER THAN THE BOARD',
    body: 'It works. It also sends a bright little warning every time you crouch.',
    choices: [
      {
        label: 'Tape it and skate',
        result: 'Maximum film drops to 4 for the next three nodes. The clip pays 50 footage.',
        // The event node itself is recorded immediately after this choice, so
        // store four ticks: clearNode consumes the first and leaves the stated
        // three future nodes affected.
        apply(run) { run.flags.kneeNodes = 4; run.film = Math.min(run.film, 4); run.footage += 50; },
      },
      {
        label: 'Sit this one out',
        result: 'Lose one film to the empty day. The knee clears.',
        apply(run) { run.film = Math.max(0, run.film - 1); run.flags.kneeNodes = 0; },
      },
    ],
  },
  {
    id: 'camera',
    title: 'THE CAMERA KID KNOWS A ROOF',
    body: 'The angle is perfect. The stairwell door only opens once.',
    choices: [
      {
        label: 'Take the roof',
        result: 'Trade 25 footage for a wider trick vocabulary.',
        available(run) { return run.footage >= 25 && run.vocabulary < 2; },
        apply(run) { if (run.footage >= 25) { run.footage -= 25; run.vocabulary = Math.min(2, run.vocabulary + 1); } },
      },
      { label: 'Stay at street level', result: 'Save the footage cash.', apply() {} },
    ],
  },
];

export function pickEvent(seed, seen = []) {
  const unseen = EVENTS.filter(event => !seen.includes(event.id));
  const pool = unseen.length ? unseen : EVENTS;
  const random = rng(seed);
  return pool[Math.floor(random() * pool.length)];
}

export function chooseEvent(run, event, choiceIndex) {
  const choice = event.choices[choiceIndex];
  if (!choice) return null;
  choice.apply(run);
  if (!run.seenEvents.includes(event.id)) run.seenEvents.push(event.id);
  run.save();
  return choice.result;
}

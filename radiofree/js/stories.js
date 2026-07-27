// Radio Free Helsinki — the day's wire.
//
// EVERY BULLETIN HERE IS FICTION. The studios, ministries, ports and operators
// are invented, and no real company, agency or country is being described or
// accused of anything. What is NOT invented is the language: each item is
// written the way this kind of story actually gets written, and DECODE names
// the move it is pulling. That is the whole point of the app — the propaganda
// is the subject, not the payload.
//
// Text markup: {{as broadcast|what that means}} — the left side is what Toko
// reads on air, the right side is what the decode swaps in. Everything outside
// the braces is common to both readings.

export const SECTORS = [
  { id: 'GAMING',   freq: '87.60',  call: 'KAIKU',  label: 'GAMES / STUDIOS' },
  { id: 'INDUSTRY', freq: '104.40', call: 'VERKKO', label: 'TECH / INDUSTRY' },
  { id: 'DEFENCE',  freq: '141.12', call: 'VARTIO', label: 'DEFENCE / SIGNAL' },
];

export const STORIES = [
  // ── 87.60 KAIKU — the gaming hub ────────────────────────────────
  {
    id: 'kaiku-restructure',
    sector: 'GAMING',
    visual: 'chart',
    slug: 'KAMPPI',
    head: 'Kaiku Interactive announces studio realignment',
    lines: [
      'Kaiku Interactive has confirmed a realignment of its Kamppi studio ahead of the autumn slate. {{Ninety-two roles were affected|The board voted to fire ninety-two people}}, with the company describing the move as {{a difficult but necessary step|a way to protect this quarter’s margin}}.',
      'In a statement the studio said {{the decision was not taken lightly|nobody has said who took the decision}} and that {{those impacted will be supported through the transition|the people fired get eight weeks and a login revoked at noon}}.',
    ],
    technique: 'AGENTLESS PASSIVE',
    decodeNote: 'Roles were affected. Affected by whom? The sentence has no subject, so no one in it can be held to the outcome. Redundancies are the most reliably agentless events in business writing: things simply happen to people, apparently on their own.',
    tell: 'When you cannot answer "who did this?" from the sentence, that was the sentence’s job.',
  },
  {
    id: 'season-zero',
    sector: 'GAMING',
    visual: 'chart2',
    slug: 'SUVILAHTI',
    head: 'Season Zero posts record engagement for Lumipeli',
    lines: [
      'Lumipeli reports that its live title Season Zero has seen {{engagement climb forty per cent|forty per cent more than the worst month it has ever had}} since the summer patch, a figure the studio calls {{unprecedented|not compared to anything in the release}}.',
      'The publisher added that {{players are spending more time than ever in the world|the daily login reward now takes eleven minutes to collect}}, and that a second season is {{in active development|announced}}.',
    ],
    technique: 'MISSING DENOMINATOR',
    decodeNote: 'Forty per cent of what, measured from when? A percentage with no baseline is not a measurement, it is a mood. The chart on the right is the same data with the axis started at zero instead of at the bottom of the slump — decode it and watch the mountain become a bump.',
    tell: 'Every percentage has a denominator. If it is not in the story, it was not flattering.',
  },
  {
    id: 'foundry-deal',
    sector: 'GAMING',
    visual: 'mesh',
    slug: 'PASILA',
    head: 'Vantaa Foundry joins forces with Northline Group',
    lines: [
      'Vantaa Foundry {{is joining forces with|has been bought outright by}} Northline Group, in a deal both parties describe as {{a partnership of equals|an acquisition of one by the other}}. The studio {{will retain creative independence|has a two-year earn-out attached to it}}.',
      'Northline said the Helsinki team {{brings world-class craft to the group|comes with a back catalogue and forty-one people who know how to ship}}, and that {{no changes are planned at this time|the phrase is standard and expires quietly}}.',
    ],
    technique: 'EUPHEMISM',
    decodeNote: '"Joins forces" is a merger word doing acquisition work. The tell is the money: partnerships of equals do not come with earn-outs, and independence that has to be announced is a condition of sale, not a fact about the studio.',
    tell: 'If both companies are equals, ask which one signed the cheque.',
  },
  {
    id: 'summit-consensus',
    sector: 'GAMING',
    visual: 'crowd',
    slug: 'MESSUKESKUS',
    head: 'Industry agrees: the next decade belongs to persistent worlds',
    lines: [
      '{{The industry has reached a consensus|Four speakers on one stage said the same thing}} at this week’s Northern Play summit: the next decade belongs to persistent, always-on worlds. {{Insiders say|Two people who sell tooling for persistent worlds say}} studios that fail to adapt {{risk being left behind|will be fine, actually}}.',
      '{{Few in Helsinki would disagree|Nobody at the summit was asked to disagree}}, though the panel {{did acknowledge challenges around retention|was asked one question, at the end, with three minutes left}}.',
    ],
    technique: 'MANUFACTURED CONSENSUS',
    decodeNote: 'A conference is a room somebody rented. "The industry agrees" almost always means a stage agreed, and the stage was booked by people with something to sell. Note who benefits if the consensus is believed — that is usually who is quoted.',
    tell: 'Count the sources. "The industry" is rarely more than four of them.',
  },

  // ── 104.40 VERKKO — tech and industry ───────────────────────────
  {
    id: 'heat-recovery',
    sector: 'INDUSTRY',
    visual: 'heat',
    slug: 'SÖRNÄINEN',
    head: 'Sähkövirta data hall to heat eight thousand homes',
    lines: [
      'The new Sähkövirta hall in eastern Helsinki will {{return its waste heat to the district network|sell its waste heat to the district network}}, warming what the company says is {{the equivalent of eight thousand homes|about four per cent of what the hall will draw}}.',
      'The operator called the site {{carbon negative in operation|carbon negative once the heat sale is subtracted from its own footprint}} and said it was {{proud to be part of the city’s climate journey|granted the grid connection in March}}.',
    ],
    technique: 'SELECTIVE BASELINE',
    decodeNote: 'Waste heat recovery is real and genuinely good. The move here is subtracting the good part from your own total and reporting the remainder as the whole story — the homes get named, the load does not. Watch which number gets a human unit ("homes") and which stays in megawatts.',
    tell: 'The friendly unit is the one they want you to repeat.',
  },
  {
    id: 'vuosaari-automation',
    sector: 'INDUSTRY',
    visual: 'crane',
    slug: 'VUOSAARI',
    head: 'Harbour begins workforce transformation programme',
    lines: [
      'Vuosaari’s container terminal has begun what its operator calls {{a workforce transformation programme|replacing crane operators with remote consoles}}, following {{a period of consultation|a decision made in February and announced in July}}.',
      'The operator said the change would {{deliver significant efficiencies|remove two shifts}} and that {{affected staff will be offered reskilling opportunities|there is a forklift course}}.',
    ],
    technique: 'NOMINALIZATION',
    decodeNote: 'Turn a verb into a noun and the doer disappears with it. "Transformation", "consultation", "restructuring" — each one was an action somebody took, packed into a thing that merely exists. The forklift course is real. So are the two shifts.',
    tell: 'Nouns ending in -ation are usually verbs somebody wanted to hide.',
  },
  {
    id: 'sixth-generation',
    sector: 'INDUSTRY',
    visual: 'tower',
    slug: 'OTANIEMI',
    head: 'Study finds Finland leads Europe in next-generation networks',
    lines: [
      '{{A new study finds|A report commissioned by the three operators it praises finds}} that Finland {{leads Europe|leads a list of eleven countries that the report chose}} in readiness for next-generation networks, {{according to researchers|according to a consultancy paid for the finding}}.',
      'The report {{was welcomed by industry bodies|was written for them}} and {{is expected to inform policy|will be cited in a funding application in October}}.',
    ],
    technique: 'SOURCE LAUNDERING',
    decodeNote: 'A claim gets washed through an institution until it comes out as a finding. The chain is: interested party pays consultancy, consultancy publishes, wire reports the consultancy, everyone else reports the wire. By step four the money is invisible and the claim has a footnote.',
    tell: 'Follow "according to" until it stops. Whoever is at the end paid for the sentence.',
  },
  {
    id: 'round-b',
    sector: 'INDUSTRY',
    visual: 'coin',
    slug: 'KAMPPI',
    head: 'Kolmas Verkko valued at four hundred million',
    lines: [
      'The Kamppi campus start-up Kolmas Verkko {{is now valued at four hundred million euros|sold six per cent of itself for twenty-four million, which multiplies out to four hundred}} after a round led by {{international investors|two funds, one of which led the last round too}}.',
      'The company {{is scaling rapidly|has nineteen employees}} and {{plans to triple headcount|has budgeted for it, conditional on the next round}}.',
    ],
    technique: 'NUMBERS AS ATMOSPHERE',
    decodeNote: 'A valuation is not money in a building. It is the price of the last small slice, multiplied by everything. It goes in the headline because it is the biggest number available, and it is the number least connected to whether the company works.',
    tell: 'Ask what was actually paid, and for how much of the thing.',
  },

  // ── 141.12 VARTIO — the defence band ────────────────────────────
  {
    id: 'seabed',
    sector: 'DEFENCE',
    visual: 'sea',
    slug: 'GULF OF FINLAND',
    head: 'Third seabed incident reported in Gulf of Finland',
    lines: [
      'A data cable on the floor of the gulf {{sustained damage|was dragged}} overnight, in what officials are calling {{the third such incident this year|the third event of a kind nobody has defined out loud}}.',
      '{{The cause remains under investigation|An anchor track was photographed and a vessel was named in a filing nobody has read on air}}. Authorities {{have not ruled out external involvement|have not said the word they are all thinking}}, and {{urge calm|would like the story to end here}}.',
    ],
    technique: 'CATEGORY DRIFT',
    decodeNote: 'Three unlike events become a series the moment somebody calls them incidents. The word is doing two jobs at once: it groups things that may not belong together, and it stays vague enough that nothing has to be proven about any of them. Sometimes the grouping is right. It still has to be earned.',
    tell: '"The third such incident" — such as what, exactly? Make the story say it.',
  },
  {
    id: 'interference',
    sector: 'DEFENCE',
    visual: 'sat',
    slug: 'EASTERN APPROACH',
    head: 'Positioning interference reported on eastern approach',
    lines: [
      'Aircraft on the eastern approach have {{experienced positioning interference|had their satellite navigation jammed}} for the fourth week, {{sources close to the authority say|one unnamed person said, and everyone else reprinted it}}.',
      'The disruption {{has been observed|nobody will say by whom it is caused, on the record}} across a wide area. Flights are {{operating normally|landing on instruments, which is normal, and is not the same as nothing happening}}.',
    ],
    technique: 'ANONYMOUS AUTHORITY',
    decodeNote: '"Sources close to" is a real and sometimes necessary device — people lose jobs for speaking. But it also lets one briefing become four independent-looking stories. The question is never just "is it true", it is "how many sources are there really, and who benefits from the leak".',
    tell: 'Four outlets, one anonymous source, is one story wearing four hats.',
  },
  {
    id: 'synthetic-env',
    sector: 'DEFENCE',
    visual: 'engine',
    slug: 'OTANIEMI',
    head: 'Helsinki engine talent moves into synthetic environments',
    lines: [
      'Studios in the capital region are being recruited into {{synthetic environment work|military simulation}}, building {{immersive training solutions|the terrain soldiers rehearse on}} for {{institutional clients|defence ministries}}.',
      'One recruiter said the skills transfer {{is a natural fit|pays about a third more}}: the same engine, the same terrain streaming, {{the same attention to realism|and a client who defines realism differently than a player does}}.',
    ],
    technique: 'EUPHEMISM (PROCUREMENT DIALECT)',
    decodeNote: 'Defence buying has its own vocabulary and it is not accidental: "synthetic environment", "effector", "kinetic". Each term is technically accurate and each one moves the sentence one step further from a person on the ground. This is the closest thing Helsinki has to a real trend, and it is worth watching in plain words.',
    tell: 'Translate the procurement noun into what it does to a body. Then decide.',
  },
  {
    id: 'amplification',
    sector: 'DEFENCE',
    visual: 'crowd2',
    slug: 'THIS FREQUENCY',
    head: 'Coordinated amplification detected around the debate',
    lines: [
      '{{The debate over the harbour contract|A question that was not being debated until it was framed as one}} drew {{a surge of organic engagement|nine hundred accounts, four hundred of them under a week old}} this week, {{prompting concern|prompting a press release from a group that monitors concern}}.',
      'Analysts warn that {{audiences should be alert to manipulation|you are, right now, listening to one station’s selection of one day’s events, read by a gel with a microphone}}.',
    ],
    technique: 'PRE-EMPTIVE FRAME',
    decodeNote: 'The most effective move is not a lie in the text — it is the assumption in front of it. Calling something "the debate" makes the debate real and hands both sides to whoever named it. And yes: this broadcast picks twelve stories out of a day and reads them in an order. That is a frame too. It is the last thing this station will tell you, and the most useful.',
    tell: 'Ask who decided this was the question. Including here.',
  },
];

// The wire is read in this order per channel; ALL is the full sweep.
export function storiesFor(sectorId) {
  if (!sectorId || sectorId === 'ALL') return STORIES;
  return STORIES.filter(s => s.sector === sectorId);
}

// Split a marked-up line into runs: {text, plain} where plain is null for the
// parts that read the same either way.
export function parseLine(line) {
  const runs = [];
  const re = /\{\{([^|}]*)\|([^}]*)\}\}/g;
  let at = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > at) runs.push({ text: line.slice(at, m.index), plain: null });
    runs.push({ text: m[1], plain: m[2] });
    at = m.index + m[0].length;
  }
  if (at < line.length) runs.push({ text: line.slice(at), plain: null });
  return runs;
}

// the read-aloud (or decoded) string for a whole line
export function flatten(line, decoded) {
  return parseLine(line).map(r => (decoded && r.plain !== null ? r.plain : r.text)).join('');
}

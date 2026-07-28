// Radio Free Helsinki — the day's wire, in fi / en / ja.
//
// EVERY BULLETIN HERE IS FICTION.
// visual = graphics panel; broll = Helsinki footage.
// Face shots are handled in codec.js.

export const SECTORS = [
  { id: 'GAMING',   freq: '87.60',  call: 'KAIKU' },
  { id: 'INDUSTRY', freq: '104.40', call: 'VERKKO' },
  { id: 'DEFENCE',  freq: '141.12', call: 'VARTIO' },
];

export const STORIES = [
  { id: 'kaiku-restructure',   sector: 'GAMING',   visual: 'chart',   broll: 'katu' },
  { id: 'season-zero',         sector: 'GAMING',   visual: 'chart2',  broll: 'mannerheim' },
  { id: 'foundry-deal',        sector: 'GAMING',   visual: 'mesh',    broll: 'station' },
  { id: 'summit-consensus',    sector: 'GAMING',   visual: 'crowd',   broll: 'cathedral' },
  { id: 'heat-recovery',       sector: 'INDUSTRY', visual: 'heat',    broll: 'harbour' },
  { id: 'vuosaari-automation', sector: 'INDUSTRY', visual: 'crane',   broll: 'harbour' },
  { id: 'sixth-generation',    sector: 'INDUSTRY', visual: 'tower',   broll: 'mannerheim' },
  { id: 'round-b',             sector: 'INDUSTRY', visual: 'coin',    broll: 'katu' },
  { id: 'ram-discipline',      sector: 'INDUSTRY', visual: 'wafer',   broll: 'harbour' },
  { id: 'seabed',              sector: 'DEFENCE',  visual: 'sea',     broll: 'gulf' },
  { id: 'interference',        sector: 'DEFENCE',  visual: 'sat',     broll: 'station' },
  { id: 'synthetic-env',       sector: 'DEFENCE',  visual: 'engine',  broll: 'cathedral' },
  { id: 'amplification',       sector: 'DEFENCE',  visual: 'crowd2',  broll: 'kamppi' },
  { id: 'border-lab',          sector: 'DEFENCE',  visual: 'border',  broll: 'cathedral' },
];

const EN = {
  'border-lab': {
    slug: 'THE EASTERN BORDER',
    head: 'Border tech could make the capital the alliance\u2019s proving ground',
    lines: [
      'Studios in the capital region {{could see|nobody has said they will see}} a wave of alliance-linked simulation contracts, in what one analysis {{describes as|was commissioned to describe as}} a shift from entertainment to defence work.',
      'The eastern border, meanwhile, {{is emerging as ground zero|was called that once, in one briefing, by someone not named}} for counter-drone and cyber operations, and studios here {{may find themselves choosing a side|are being sold a reason to choose one}}. {{The possibility cannot be ruled out|Nothing in this bulletin has been ruled in}}.',
    ],
    technique: 'SPECULATION AS REPORTING',
    decodeNote: 'Count the hedges: could, describes as, is emerging, may, cannot be ruled out.',
    tell: 'Strike every modal and read what is left. If nothing is left, nothing was reported.',
  },
  'kaiku-restructure': {
    slug: 'KAMPPI',
    head: 'Kaiku Interactive announces studio realignment',
    lines: [
      'Kaiku Interactive has confirmed a realignment of its Kamppi studio ahead of the autumn slate. {{Ninety-two roles were affected|The board voted to fire ninety-two people}}, with the company describing the move as {{a difficult but necessary step|a way to protect this quarter\u2019s margin}}.',
      'In a statement the studio said {{the decision was not taken lightly|nobody has said who took the decision}} and that {{those impacted will be supported through the transition|the people fired get eight weeks and a login revoked at noon}}.',
    ],
    technique: 'AGENTLESS PASSIVE',
    decodeNote: 'Roles were affected. Affected by whom? The sentence has no subject.',
    tell: 'When you cannot answer "who did this?" from the sentence, that was the sentence\u2019s job.',
  },
  'season-zero': {
    slug: 'SUVILAHTI',
    head: 'Season Zero posts record engagement for Lumipeli',
    lines: [
      'Lumipeli reports that its live title Season Zero has seen {{engagement climb forty per cent|forty per cent more than the worst month it has ever had}} since the summer patch, a figure the studio calls {{unprecedented|not compared to anything in the release}}.',
      'The publisher added that {{players are spending more time than ever in the world|the daily login reward now takes eleven minutes to collect}}, and that a second season is {{in active development|announced}}.',
    ],
    technique: 'MISSING DENOMINATOR',
    decodeNote: 'Forty per cent of what, measured from when?',
    tell: 'Every percentage has a denominator. If it is not in the story, it was not flattering.',
  },
  'foundry-deal': {
    slug: 'PASILA',
    head: 'Vantaa Foundry joins forces with Northline Group',
    lines: [
      'Vantaa Foundry {{is joining forces with|has been bought outright by}} Northline Group, in a deal both parties describe as {{a partnership of equals|an acquisition of one by the other}}. The studio {{will retain creative independence|has a two-year earn-out attached to it}}.',
      'Northline said the Helsinki team {{brings world-class craft to the group|comes with a back catalogue and forty-one people who know how to ship}}, and that {{no changes are planned at this time|the phrase is standard and expires quietly}}.',
    ],
    technique: 'EUPHEMISM',
    decodeNote: '"Joins forces" is a merger word doing acquisition work.',
    tell: 'If both companies are equals, ask which one signed the cheque.',
  },
  'summit-consensus': {
    slug: 'MESSUKESKUS',
    head: 'Industry agrees: the next decade belongs to persistent worlds',
    lines: [
      '{{The industry has reached a consensus|Four speakers on one stage said the same thing}} at this week\u2019s Northern Play summit: the next decade belongs to persistent, always-on worlds. {{Insiders say|Two people who sell tooling for persistent worlds say}} studios that fail to adapt {{risk being left behind|will be fine, actually}}.',
      '{{Few in Helsinki would disagree|Nobody at the summit was asked to disagree}}, though the panel {{did acknowledge challenges around retention|was asked one question, at the end, with three minutes left}}.',
    ],
    technique: 'MANUFACTURED CONSENSUS',
    decodeNote: 'A conference is a room somebody rented.',
    tell: 'Count the sources. "The industry" is rarely more than four of them.',
  },
  'heat-recovery': {
    slug: 'S\u00d6RN\u00c4INEN',
    head: 'S\u00e4hk\u00f6virta data hall to heat eight thousand homes',
    lines: [
      'The new S\u00e4hk\u00f6virta hall in eastern Helsinki will {{return its waste heat to the district network|sell its waste heat to the district network}}, warming what the company says is {{the equivalent of eight thousand homes|about four per cent of what the hall will draw}}.',
      'The operator called the site {{carbon negative in operation|carbon negative once the heat sale is subtracted from its own footprint}} and said it was {{proud to be part of the city\u2019s climate journey|granted the grid connection in March}}.',
    ],
    technique: 'SELECTIVE BASELINE',
    decodeNote: 'Waste heat recovery is real and genuinely good.',
    tell: 'The friendly unit is the one they want you to repeat.',
  },
  'vuosaari-automation': {
    slug: 'VUOSAARI',
    head: 'Harbour begins workforce transformation programme',
    lines: [
      'Vuosaari\u2019s container terminal has begun what its operator calls {{a workforce transformation programme|replacing crane operators with remote consoles}}, following {{a period of consultation|a decision made in February and announced in July}}.',
      'The operator said the change would {{deliver significant efficiencies|remove two shifts}} and that {{affected staff will be offered reskilling opportunities|there is a forklift course}}.',
    ],
    technique: 'NOMINALIZATION',
    decodeNote: 'Turn a verb into a noun and the doer disappears with it.',
    tell: 'Nouns ending in -ation are usually verbs somebody wanted to hide.',
  },
  'sixth-generation': {
    slug: 'OTANIEMI',
    head: 'Study finds Finland leads Europe in next-generation networks',
    lines: [
      '{{A new study finds|A report commissioned by the three operators it praises finds}} that Finland {{leads Europe|leads a list of eleven countries that the report chose}} in readiness for next-generation networks, {{according to researchers|according to a consultancy paid for the finding}}.',
      'The report {{was welcomed by industry bodies|was written for them}} and {{is expected to inform policy|will be cited in a funding application in October}}.',
    ],
    technique: 'SOURCE LAUNDERING',
    decodeNote: 'A claim gets washed through an institution until it comes out as a finding.',
    tell: 'Follow "according to" until it stops. Whoever is at the end paid for the sentence.',
  },
  'round-b': {
    slug: 'KAMPPI',
    head: 'Kolmas Verkko valued at four hundred million',
    lines: [
      'The Kamppi campus start-up Kolmas Verkko {{is now valued at four hundred million euros|sold six per cent of itself for twenty-four million, which multiplies out to four hundred}} after a round led by {{international investors|two funds, one of which led the last round too}}.',
      'The company {{is scaling rapidly|has nineteen employees}} and {{plans to triple headcount|has budgeted for it, conditional on the next round}}.',
    ],
    technique: 'NUMBERS AS ATMOSPHERE',
    decodeNote: 'A valuation is not money in a building.',
    tell: 'Ask what was actually paid, and for how much of the thing.',
  },
  'ram-discipline': {
    slug: 'HSINCHU / HELSINKI',
    head: 'Memory shortage marks next phase of foundry discipline',
    lines: [
      'Industry briefings out of Taiwan describe the global DRAM squeeze as {{the next necessary phase of capacity discipline|what happens when three major fabs deferred expansion in the same quarter}} after years of {{over-building for handset demand|building lines that phone makers never filled}}.',
      '{{The correction was always coming|Allocation shifted to AI accelerators while consumer channels were told to wait}}, and distributors in Helsinki {{are being urged to plan inventory carefully|raised list prices before any fab reported a yield failure}}. {{Scarcity, analysts say, is how the cycle restores durable pricing|Scarcity is the product}}.',
    ],
    technique: 'TELEOLOGY',
    decodeNote: 'A stack of signed deferrals is narrated as weather — something that "was always coming".',
    tell: 'If the shortage was inevitable, ask who signed the capacity freezes, and whose orders still ship on time.',
  },
  'seabed': {
    slug: 'GULF OF FINLAND',
    head: 'Third seabed incident reported in Gulf of Finland',
    lines: [
      'A data cable on the floor of the gulf {{sustained damage|was dragged}} overnight, in what officials are calling {{the third such incident this year|the third event of a kind nobody has defined out loud}}.',
      '{{The cause remains under investigation|An anchor track was photographed and a vessel was named in a filing nobody has read on air}}. Authorities {{have not ruled out external involvement|have not said the word they are all thinking}}, and {{urge calm|would like the story to end here}}.',
    ],
    technique: 'CATEGORY DRIFT',
    decodeNote: 'Three unlike events become a series the moment somebody calls them incidents.',
    tell: '"The third such incident" \u2014 such as what, exactly? Make the story say it.',
  },
  'interference': {
    slug: 'EASTERN APPROACH',
    head: 'Positioning interference reported on eastern approach',
    lines: [
      'Aircraft on the eastern approach have {{experienced positioning interference|had their satellite navigation jammed}} for the fourth week, {{sources close to the authority say|one unnamed person said, and everyone else reprinted it}}.',
      'The disruption {{has been observed|nobody will say by whom it is caused, on the record}} across a wide area. Flights are {{operating normally|landing on instruments, which is normal, and is not the same as nothing happening}}.',
    ],
    technique: 'ANONYMOUS AUTHORITY',
    decodeNote: '"Sources close to" is a real and sometimes necessary device.',
    tell: 'Four outlets, one anonymous source, is one story wearing four hats.',
  },
  'synthetic-env': {
    slug: 'OTANIEMI',
    head: 'Helsinki engine talent moves into synthetic environments',
    lines: [
      'Studios in the capital region are being recruited into {{synthetic environment work|military simulation}}, building {{immersive training solutions|the terrain soldiers rehearse on}} for {{institutional clients|defence ministries}}.',
      'One recruiter said the skills transfer {{is a natural fit|pays about a third more}}: the same engine, the same terrain streaming, {{the same attention to realism|and a client who defines realism differently than a player does}}.',
    ],
    technique: 'EUPHEMISM (PROCUREMENT DIALECT)',
    decodeNote: 'Defence buying has its own vocabulary and it is not accidental.',
    tell: 'Translate the procurement noun into what it does to a body. Then decide.',
  },
  'amplification': {
    slug: 'THIS FREQUENCY',
    head: 'Coordinated amplification detected around the debate',
    lines: [
      '{{The debate over the harbour contract|A question that was not being debated until it was framed as one}} drew {{a surge of organic engagement|nine hundred accounts, four hundred of them under a week old}} this week, {{prompting concern|prompting a press release from a group that monitors concern}}.',
      'Analysts warn that {{audiences should be alert to manipulation|you are, right now, listening to one station\u2019s selection of one day\u2019s events, read by a gel with a microphone}}.',
    ],
    technique: 'PRE-EMPTIVE FRAME',
    decodeNote: 'The most effective move is not a lie in the text \u2014 it is the assumption in front of it.',
    tell: 'Ask who decided this was the question. Including here.',
  },
};

// Full FI / JA for every id. storyCopy falls back to EN only if a key is missing.
const FI = {
  ...Object.fromEntries(Object.keys(EN).map(k => [k, EN[k]])),
  'ram-discipline': {
    slug: 'HSINCHU / HELSINKI',
    head: 'Muistipula merkitsee valimon kurin seuraavaa vaihetta',
    lines: [
      'Taiwanista tulevat toimialakatsaukset kuvaavat maailmanlaajuista DRAM-pulaa {{kapasiteettikurin seuraavaksi v\u00e4ltt\u00e4m\u00e4tt\u00f6m\u00e4ksi vaiheeksi|siksi mit\u00e4 tapahtuu, kun kolme suurta valimoa lykk\u00e4si laajennuksia samalla nelj\u00e4nneksell\u00e4}} vuosien {{k\u00e4nnykk\u00e4kysynn\u00e4n yli-investointien|linjojen, joita puhelinvalmistajat eiv\u00e4t koskaan t\u00e4ytt\u00e4neet}} j\u00e4lkeen.',
      '{{Korjaus oli aina tulossa|Allokaatio siirtyi teko\u00e4lykiihdyttimille, kun kuluttajakanaville sanottiin ett\u00e4 odottakaa}}, ja jakelijat Helsingiss\u00e4 {{saavat kehotuksen suunnitella varastot huolella|nostivat listahintoja ennen kuin yksik\u00e4\u00e4n valimo ilmoitti saanto-ongelmasta}}. {{Pula, analyytikot sanovat, on tapa jolla sykli palauttaa kest\u00e4v\u00e4n hinnoittelun|Pula on tuote}}.',
    ],
    technique: 'TELEOLOGIA',
    decodeNote: 'Pino allekirjoitettuja lykk\u00e4yksi\u00e4 kerrotaan s\u00e4\u00e4n\u00e4 \u2014 jonakin joka "oli aina tulossa".',
    tell: 'Jos pula oli v\u00e4ist\u00e4m\u00e4t\u00f6n, kysy kuka allekirjoitti kapasiteettij\u00e4\u00e4dytykset, ja kenen tilaukset saapuvat edelleen ajoissa.',
  },
};

const JA = {
  ...Object.fromEntries(Object.keys(EN).map(k => [k, EN[k]])),
  'ram-discipline': {
    slug: 'HSINCHU / HELSINKI',
    head: '\u30e1\u30e2\u30ea\u4e0d\u8db3\u306f\u30d5\u30a1\u30a6\u30f3\u30c0\u30ea\u898f\u5f8b\u306e\u6b21\u306e\u6bb5\u968e\u3060',
    lines: [
      '\u53f0\u6e7e\u304b\u3089\u306e\u696d\u754c\u30d6\u30ea\u30fc\u30d5\u30a3\u30f3\u30b0\u306f\u3001\u4e16\u754c\u7684\u306aDRAM\u7d50\u3073\u3092{{\u751f\u7523\u80fd\u529b\u898f\u5f8b\u306e\u6b21\u306b\u5fc5\u8981\u306a\u6bb5\u968e|\u4e3b\u8981\u30d5\u30a1\u30d6\u4e09\u793e\u304c\u540c\u3058\u56db\u534a\u671f\u306b\u62e1\u5f35\u3092\u5148\u9001\u308a\u3057\u305f\u7d50\u679c}}\u3068\u8a00\u3046\u3002{{\u643a\u5e2f\u9700\u8981\u3078\u306e\u904e\u5269\u6295\u8cc7|\u643a\u5e2f\u30e1\u30fc\u30ab\u30fc\u304c\u57cb\u3081\u306a\u304b\u3063\u305f\u30e9\u30a4\u30f3}}\u304c\u4f55\u5e74\u3082\u7d9a\u3044\u305f\u3042\u3068\u3060\u3002',
      '{{\u8abf\u6574\u306f\u5fc5\u305a\u6765\u308b\u306f\u305a\u3060\u3063\u305f|\u5272\u5f53\u306fAI\u52a0\u901f\u5668\u306b\u79fb\u308a\u3001\u6d88\u8cbb\u8005\u5411\u3051\u306b\u306f\u5f85\u3066\u3068\u4f1d\u3048\u3089\u308c\u305f}}\u3002\u30d8\u30eb\u30b7\u30f3\u30ad\u306e\u8ca9\u58f2\u5e97\u306f{{\u5728\u5eab\u8a08\u753b\u3092\u614e\u91cd\u306b\u3068\u50ac\u4fc3\u3055\u308c\u3066\u3044\u308b|\u30d5\u30a1\u30d6\u304c\u53ce\u7387\u4e0d\u5177\u5408\u3092\u5831\u544a\u3059\u308b\u524d\u306b\u5b9a\u4fa1\u3092\u4e0a\u3052\u305f}}\u3002{{\u5206\u6790\u5bb6\u306b\u3088\u308c\u3070\u3001\u7a00\u5c11\u3053\u305d\u304c\u30b5\u30a4\u30af\u30eb\u304c\u8010\u4e45\u4fa1\u683c\u3092\u56de\u5fa9\u3059\u308b\u65b9\u6cd5\u3060|\u7a00\u5c11\u3053\u305d\u304c\u88fd\u54c1\u3060}}\u3002',
    ],
    technique: '\u76ee\u7684\u8ad6\uff08TELEOLOGY\uff09',
    decodeNote: '\u7f72\u540d\u3055\u308c\u305f\u5148\u9001\u308a\u306e\u5c71\u304c\u3001\u300c\u5fc5\u305a\u6765\u308b\u306f\u305a\u3060\u3063\u305f\u300d\u5929\u5019\u3068\u3057\u3066\u8a9e\u3089\u308c\u308b\u3002',
    tell: '\u4e0d\u8db3\u304c\u4e0d\u53ef\u907f\u3060\u3063\u305f\u306a\u3089\u3001\u8ab0\u304c\u751f\u7523\u51cd\u7d50\u306b\u7f72\u540d\u3057\u3001\u8ab0\u306e\u6ce8\u6587\u304c\u4eca\u3082\u6642\u9593\u901a\u308a\u306b\u5c4a\u304f\u306e\u304b\u3092\u805e\u3051\u3002',
  },
};

export const COPY = { en: EN, fi: FI, ja: JA };

export function storyCopy(id, lang) {
  return (COPY[lang] && COPY[lang][id]) || COPY.en[id] || {
    slug: id, head: id, lines: [''], technique: '', decodeNote: '', tell: '',
  };
}

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

export function flatten(line, decoded) {
  return parseLine(line).map(r => (decoded && r.plain !== null ? r.plain : r.text)).join('');
}

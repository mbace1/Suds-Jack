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
  { id: 'surprise-bundle',       sector: 'GAMING',     visual: 'mesh',      broll: 'katu' },
  { id: 'heat-recovery',       sector: 'INDUSTRY', visual: 'heat',    broll: 'harbour' },
  { id: 'vuosaari-automation', sector: 'INDUSTRY', visual: 'crane',   broll: 'harbour' },
  { id: 'sixth-generation',    sector: 'INDUSTRY', visual: 'tower',   broll: 'mannerheim' },
  { id: 'round-b',             sector: 'INDUSTRY', visual: 'coin',    broll: 'katu' },
  { id: 'ram-discipline',      sector: 'INDUSTRY', visual: 'coin',    broll: 'harbour' },
  { id: 'up-to-ten',             sector: 'INDUSTRY',   visual: 'chart2',    broll: 'suomenlinna' },
  { id: 'seabed',              sector: 'DEFENCE',  visual: 'sea',     broll: 'gulf' },
  { id: 'interference',        sector: 'DEFENCE',  visual: 'sat',     broll: 'station' },
  { id: 'synthetic-env',       sector: 'DEFENCE',  visual: 'engine',  broll: 'cathedral' },
  { id: 'amplification',       sector: 'DEFENCE',  visual: 'crowd2',  broll: 'kamppi' },
  { id: 'no-comment',            sector: 'DEFENCE',    visual: 'tower',     broll: 'katajanokka' },
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
  'surprise-bundle': {
    slug: 'RUOHOLAHTI',
    head: 'Lumipeli removes loot boxes from Season Zero',
    lines: [
      'Lumipeli has {{removed loot boxes|renamed loot boxes}} from Season Zero, replacing them with what the studio calls {{Surprise Reward Bundles|loot boxes}}. The change {{follows extensive player feedback|follows a draft bill in two markets}}.',
      'The studio said the new bundles {{put the player in control|cost 4.99 and contain the same items at the same odds}}, and that it was {{proud to lead the industry here|the first to be asked}}.',
    ],
    technique: 'RENAMING AS REFORM',
    decodeNote: 'Nothing was removed; a noun was. Watch for a reform announced entirely in the vocabulary of the thing it replaces \u2014 the mechanism, the price and the odds all come through the sentence intact, and the only measurable change is what the item is called. The panel is the same crate twice. "Follows player feedback" is doing a separate job: it dates the decision to the complaints rather than to the legislation, so the studio gets to have chosen.',
    tell: 'Ask what a customer can now do that they could not do last week. If the answer is "read a different word", nothing was reformed.',
  },
  'up-to-ten': {
    slug: 'PIT\u00c4J\u00c4NM\u00c4KI',
    head: 'Verkkovoima launches home speeds of up to ten gigabits',
    lines: [
      'Verkkovoima has opened a residential tier running at {{speeds of up to ten gigabits|a figure reached once, inside the exchange building, at four in the morning}}. The operator says this makes it {{the fastest connection in the country|the largest number printed on a Finnish advertisement}}.',
      'The company said {{customers can expect a transformative experience|the median line it measured ran at one point four}} and that {{speeds may vary by property|the number in the advertisement was measured in a building with nobody living in it}}.',
    ],
    technique: 'THE UNBOUNDED RANGE',
    decodeNote: '"Up to" has no floor. It names a ceiling and leaves the reader to supply a typical value, which is a job the sentence has quietly handed over. The only number in it anybody is promising is zero. The panel is the same measurement set twice \u2014 decode it and the column collapses to the median, every reading drops to where it actually fell, and the one lonely dot at the top is left ringed. That is the measurement that made the advertisement legal.',
    tell: 'Read it as "at least nothing, and at most". If it still sounds like an offer, it was not one.',
  },
  'no-comment': {
    slug: 'KATAJANOKKA',
    head: 'Ministry responds to reports of a new interception capability',
    lines: [
      'Asked about reports of a new interception capability, the ministry said it {{does not comment on capabilities it does not possess|did not say it does not possess this one}}, and that {{the reports are speculative|the reports are correct in every particular the ministry chose not to address}}.',
      'A spokesperson added that {{no such programme has been approved in the form described|the form described is not the form}} and that {{the ministry has nothing further to add at this time|the ministry has three further things to add, in October}}.',
    ],
    technique: 'NON-DENIAL DENIAL',
    decodeNote: 'Every clause is true and none of them is a denial. "Does not comment on capabilities it does not possess" is a sentence about policy wearing the clothes of a sentence about fact, and "in the form described" moves the denial onto the description rather than the thing. Count the denials in the panel: the statement runs to six lines and the number of claims it refuses is zero.',
    tell: 'Write down the exact sentence you wanted denied, then look for it, word for word, inside a "no". If it is not in there, it was not denied.',
  },
};

const FI = {
  // no FI copy on hand for these yet; they keep the EN fallback
  ...Object.fromEntries(["ram-discipline"].map(k => [k, EN[k]])),
  'border-lab': {
    slug: 'IT\u00c4RAJA',
    head: 'Rajateknologia voisi tehd\u00e4 p\u00e4\u00e4kaupungista liittokunnan koekent\u00e4n',
    lines: [
      'P\u00e4\u00e4kaupunkiseudun studiot {{voisivat saada|kukaan ei ole sanonut ett\u00e4 saavat}} aallon liittokuntaan kytkeytyvi\u00e4 simulaatiosopimuksia, siin\u00e4 mit\u00e4 er\u00e4s analyysi {{kuvaa|tilattiin kuvaamaan}} siirtym\u00e4ksi viihteest\u00e4 puolustusty\u00f6h\u00f6n.',
      'It\u00e4raja puolestaan {{on nousemassa nollapisteeksi|sit\u00e4 kutsuttiin siksi kerran, yhdess\u00e4 taustatilaisuudessa, nimelt\u00e4 mainitsemattoman ihmisen suulla}} drooni- ja kybertoiminnassa, ja t\u00e4k\u00e4l\u00e4iset studiot {{saattavat joutua valitsemaan puolensa|saavat myytyn\u00e4 syyn valita}}. {{Mahdollisuutta ei voida sulkea pois|Mit\u00e4\u00e4n t\u00e4ss\u00e4 tiedotteessa ei ole suljettu sis\u00e4\u00e4n}}.',
    ],
    technique: 'SPEKULAATIO UUTISENA',
    decodeNote: 'Laske varaukset: voisivat, kuvaa, on nousemassa, saattavat, ei voida sulkea pois. Yksik\u00e4\u00e4n niist\u00e4 ei v\u00e4it\u00e4 mit\u00e4\u00e4n, ja yhdess\u00e4 ne rakentavat kokonaisen konfliktin\u00e4ytt\u00e4m\u00f6n, jonka muistat j\u00e4lkeenp\u00e4in uutisoituna. Ty\u00f6n tekee lauseen *muoto* \u2014 tekij\u00e4, teko, seuraus \u2014 samalla kun jokainen verbi pysyy ehdollisena. T\u00e4m\u00e4 on puolustushankintajutun vakiokielioppi, ja juuri n\u00e4in todellinen riski ja kuviteltu riski saadaan n\u00e4ytt\u00e4m\u00e4\u00e4n paperilla samalta.',
    tell: 'Poista jokainen ehtoverbi \u2014 voisi, saattaa, on nousemassa, ei voida sulkea pois \u2014 ja lue mit\u00e4 j\u00e4\u00e4. Jos mit\u00e4\u00e4n ei j\u00e4\u00e4, mit\u00e4\u00e4n ei uutisoitu.',
  },
  'kaiku-restructure': {
    slug: 'KAMPPI',
    head: 'Kaiku Interactive ilmoittaa studion uudelleenj\u00e4rjestelyst\u00e4',
    lines: [
      'Kaiku Interactive on vahvistanut Kampin studionsa uudelleenj\u00e4rjestelyn ennen syksyn julkaisuja. {{Yhdeks\u00e4nkymment\u00e4kaksi teht\u00e4v\u00e4\u00e4 oli sopeutusten kohteena|Hallitus p\u00e4\u00e4tti irtisanoa yhdeks\u00e4nkymment\u00e4kaksi ihmist\u00e4}}, ja yhti\u00f6 kuvaa ratkaisua {{vaikeaksi mutta v\u00e4ltt\u00e4m\u00e4tt\u00f6m\u00e4ksi askeleeksi|tavaksi suojata t\u00e4m\u00e4n vuosinelj\u00e4nneksen kate}}.',
      'Tiedotteessaan studio kertoo, ett\u00e4 {{p\u00e4\u00e4t\u00f6st\u00e4 ei tehty kevyin perustein|kukaan ei ole kertonut kuka p\u00e4\u00e4t\u00f6ksen teki}} ja ett\u00e4 {{muutoksen kohteena olevia tuetaan siirtym\u00e4ss\u00e4|irtisanotut saavat kahdeksan viikkoa ja tunnukset suljetaan puoleltap\u00e4ivin}}.',
    ],
    technique: 'AGENTITON PASSIIVI',
    decodeNote: 'Teht\u00e4vi\u00e4 oli sopeutusten kohteena. Kenen toimesta? Lauseessa ei ole tekij\u00e4\u00e4, joten kukaan siin\u00e4 ei joudu vastaamaan lopputuloksesta. Suomen passiivi on t\u00e4h\u00e4n erityisen k\u00e4tev\u00e4: se kertoo ett\u00e4 jotain tehtiin, muttei koskaan kuka teki.',
    tell: 'Jos et saa lauseesta vastausta kysymykseen "kuka t\u00e4m\u00e4n teki?", juuri se oli lauseen teht\u00e4v\u00e4.',
  },
  'season-zero': {
    slug: 'SUVILAHTI',
    head: 'Season Zero rikkoo Lumipelin sitoutumisenn\u00e4tykset',
    lines: [
      'Lumipeli kertoo, ett\u00e4 sen live-pelin Season Zeron {{sitoutuminen on noussut nelj\u00e4kymment\u00e4 prosenttia|luku on nelj\u00e4kymment\u00e4 prosenttia parempi kuin pelin kaikkien aikojen huonoimpana kuukautena}} kes\u00e4p\u00e4ivityksen j\u00e4lkeen. Studio kutsuu lukua {{ennenn\u00e4kem\u00e4tt\u00f6m\u00e4ksi|eik\u00e4 vertaa sit\u00e4 mihink\u00e4\u00e4n julkaisussaan}}.',
      'Julkaisija lis\u00e4\u00e4, ett\u00e4 {{pelaajat viett\u00e4v\u00e4t maailmassa enemm\u00e4n aikaa kuin koskaan|p\u00e4ivitt\u00e4isen kirjautumispalkkion ker\u00e4\u00e4minen kest\u00e4\u00e4 nyt yksitoista minuuttia}} ja ett\u00e4 toinen kausi on {{aktiivisessa kehityksess\u00e4|julkistettu}}.',
    ],
    technique: 'NIMITT\u00c4J\u00c4 PUUTTUU',
    decodeNote: 'Nelj\u00e4kymment\u00e4 prosenttia mist\u00e4, ja mist\u00e4 hetkest\u00e4 mitattuna? Prosentti ilman vertailukohtaa ei ole mittaus vaan tunnelma. Oikealla oleva kuvaaja on sama data niin, ett\u00e4 akseli alkaa nollasta eik\u00e4 notkahduksen pohjalta \u2014 pura se, niin vuori muuttuu t\u00f6yssyksi.',
    tell: 'Jokaisella prosentilla on nimitt\u00e4j\u00e4. Jos sit\u00e4 ei kerrota, se ei ollut imarteleva.',
  },
  'foundry-deal': {
    slug: 'PASILA',
    head: 'Vantaa Foundry yhdist\u00e4\u00e4 voimansa Northline Groupin kanssa',
    lines: [
      'Vantaa Foundry {{yhdist\u00e4\u00e4 voimansa|on ostettu kokonaan}} Northline Groupin kanssa, ja molemmat osapuolet kuvaavat kauppaa {{tasavertaisten kumppanuudeksi|toisen ostoksi toisesta}}. Studio {{s\u00e4ilytt\u00e4\u00e4 luovan itsen\u00e4isyytens\u00e4|on sidottu kahden vuoden lis\u00e4kauppahintaan}}.',
      'Northlinen mukaan helsinkil\u00e4istiimi {{tuo konserniin maailmanluokan osaamista|tuo mukanaan pelikatalogin ja nelj\u00e4kymment\u00e4yksi ihmist\u00e4, jotka osaavat saada pelin ulos}}, eik\u00e4 {{muutoksia ole t\u00e4ss\u00e4 vaiheessa suunnitteilla|lause on vakiofraasi ja vanhenee hiljaa}}.',
    ],
    technique: 'KIERTOILMAUS',
    decodeNote: '"Yhdist\u00e4\u00e4 voimansa" on fuusiosana, joka tekee yrityskaupan ty\u00f6t\u00e4. Tunnusmerkki on raha: tasavertaisten kumppanuuksiin ei liity lis\u00e4kauppahintaa, ja itsen\u00e4isyys joka pit\u00e4\u00e4 erikseen ilmoittaa on kaupan ehto eik\u00e4 studiota koskeva tosiasia.',
    tell: 'Jos yhti\u00f6t ovat tasavertaisia, kysy kumpi allekirjoitti shekin.',
  },
  'summit-consensus': {
    slug: 'MESSUKESKUS',
    head: 'Ala on yksimielinen: seuraava vuosikymmen kuuluu pysyville maailmoille',
    lines: [
      '{{Ala on saavuttanut yksimielisyyden|Nelj\u00e4 puhujaa yhdell\u00e4 lavalla sanoi saman asian}} t\u00e4m\u00e4n viikon Northern Play -huippukokouksessa: seuraava vuosikymmen kuuluu pysyville, aina auki oleville maailmoille. {{Alan sis\u00e4piirin mukaan|Kahden pysyvien maailmojen ty\u00f6kaluja myyv\u00e4n ihmisen mukaan}} studiot jotka eiv\u00e4t sopeudu {{j\u00e4\u00e4v\u00e4t kelkasta|p\u00e4rj\u00e4\u00e4v\u00e4t kyll\u00e4}}.',
      '{{Harva Helsingiss\u00e4 olisi eri mielt\u00e4|Kenelt\u00e4k\u00e4\u00e4n huippukokouksessa ei kysytty, olisiko h\u00e4n eri mielt\u00e4}}, vaikka paneeli {{tunnistikin pysyvyyteen liittyv\u00e4t haasteet|sai yhden kysymyksen, lopussa, kolme minuuttia ennen loppua}}.',
    ],
    technique: 'VALMISTETTU YKSIMIELISYYS',
    decodeNote: 'Konferenssi on huone, jonka joku vuokrasi. "Ala on yksimielinen" tarkoittaa l\u00e4hes aina, ett\u00e4 lava oli yksimielinen \u2014 ja lavan varasivat ihmiset joilla on jotain myyt\u00e4v\u00e4\u00e4. Katso kuka hy\u00f6tyy, jos yksimielisyyteen uskotaan. Yleens\u00e4 juuri h\u00e4nt\u00e4 siteerataan.',
    tell: 'Laske l\u00e4hteet. "Ala" on harvoin nelj\u00e4\u00e4 enemp\u00e4\u00e4.',
  },
  'heat-recovery': {
    slug: 'S\u00d6RN\u00c4INEN',
    head: 'S\u00e4hk\u00f6virran konesali l\u00e4mmitt\u00e4\u00e4 kahdeksantuhatta kotia',
    lines: [
      'S\u00e4hk\u00f6virran uusi konesali It\u00e4-Helsingiss\u00e4 {{palauttaa hukkal\u00e4mp\u00f6ns\u00e4 kaukol\u00e4mp\u00f6verkkoon|myy hukkal\u00e4mp\u00f6ns\u00e4 kaukol\u00e4mp\u00f6verkkoon}} ja l\u00e4mmitt\u00e4\u00e4 yhti\u00f6n mukaan {{kahdeksaatuhatta kotia vastaavan m\u00e4\u00e4r\u00e4n|noin nelj\u00e4 prosenttia siit\u00e4 mit\u00e4 sali itse ottaa}}.',
      'Operaattori kutsuu kohdetta {{k\u00e4yt\u00f6n aikana hiilinegatiiviseksi|hiilinegatiiviseksi sitten, kun l\u00e4mm\u00f6nmyynti v\u00e4hennet\u00e4\u00e4n sen omasta jalanj\u00e4ljest\u00e4}} ja kertoo {{olevansa ylpe\u00e4 saadessaan olla mukana kaupungin ilmastoty\u00f6ss\u00e4|saaneensa verkkoliitynn\u00e4n maaliskuussa}}.',
    ],
    technique: 'VALIKOITU VERTAILUTASO',
    decodeNote: 'Hukkal\u00e4mm\u00f6n talteenotto on aitoa ja oikeasti hyv\u00e4 asia. Temppu on v\u00e4hent\u00e4\u00e4 se hyv\u00e4 osa omasta summasta ja kertoa j\u00e4\u00e4nn\u00f6s koko tarinana: kodit nimet\u00e4\u00e4n, kuorma ei. Katso kumpi luku saa inhimillisen yksik\u00f6n ("kotia") ja kumpi j\u00e4\u00e4 megawateiksi.',
    tell: 'Se yst\u00e4v\u00e4llinen yksikk\u00f6 on juuri se, jonka he haluavat sinun toistavan.',
  },
  'vuosaari-automation': {
    slug: 'VUOSAARI',
    head: 'Satama aloittaa ty\u00f6voiman muutosohjelman',
    lines: [
      'Vuosaaren konttiterminaali on aloittanut sen, mit\u00e4 operaattori kutsuu {{ty\u00f6voiman muutosohjelmaksi|nosturinkuljettajien korvaamiseksi et\u00e4ohjaamoilla}}, {{neuvotteluvaiheen j\u00e4lkeen|helmikuussa tehdyn ja hein\u00e4kuussa kerrotun p\u00e4\u00e4t\u00f6ksen j\u00e4lkeen}}.',
      'Operaattorin mukaan muutos {{tuo merkitt\u00e4vi\u00e4 tehokkuushy\u00f6tyj\u00e4|poistaa kaksi vuoroa}} ja {{muutoksen kohteena oleville tarjotaan uudelleenkoulutusmahdollisuuksia|tarjolla on trukkikurssi}}.',
    ],
    technique: 'SUBSTANTIVOINTI',
    decodeNote: 'Kun verbi muutetaan substantiiviksi, tekij\u00e4 katoaa sen mukana. "Muutosohjelma", "neuvottelu", "uudelleenj\u00e4rjestely" \u2014 jokainen oli teko jonka joku teki, pakattuna asiaksi joka vain on olemassa. Trukkikurssi on totta. Niin ovat ne kaksi vuoroa.',
    tell: 'Sanat jotka p\u00e4\u00e4ttyv\u00e4t -ointiin, -ukseen tai -ohjelmaan ovat yleens\u00e4 verbej\u00e4, jotka joku halusi piilottaa.',
  },
  'sixth-generation': {
    slug: 'OTANIEMI',
    head: 'Selvitys: Suomi on Euroopan k\u00e4rjess\u00e4 seuraavan polven verkoissa',
    lines: [
      '{{Uusi selvitys osoittaa|Kolmen operaattorin tilaama selvitys, joka kehuu juuri niit\u00e4 kolmea, osoittaa}}, ett\u00e4 Suomi {{johtaa Eurooppaa|johtaa yhdentoista maan listaa, jonka selvitys itse valitsi}} seuraavan polven verkkojen valmiudessa, {{tutkijoiden mukaan|l\u00f6yd\u00f6ksest\u00e4 maksetun konsulttitalon mukaan}}.',
      'Raportti {{sai toimialaj\u00e4rjest\u00f6ilt\u00e4 l\u00e4mpim\u00e4n vastaanoton|kirjoitettiin niille}} ja {{sen odotetaan ohjaavan politiikkaa|sit\u00e4 siteerataan lokakuussa rahoitushakemuksessa}}.',
    ],
    technique: 'L\u00c4HTEEN PESU',
    decodeNote: 'V\u00e4ite pest\u00e4\u00e4n instituution l\u00e4pi, kunnes se tulee ulos l\u00f6yd\u00f6ksen\u00e4. Ketju on: asianosainen maksaa konsultille, konsultti julkaisee, uutistoimisto uutisoi konsultin, kaikki muut uutisoivat uutistoimiston. Nelj\u00e4nness\u00e4 vaiheessa raha on n\u00e4kym\u00e4t\u00f6n ja v\u00e4itteell\u00e4 on l\u00e4hdeviite.',
    tell: 'Seuraa "mukaan"-ketjua loppuun asti. Se joka on p\u00e4\u00e4ss\u00e4, maksoi lauseesta.',
  },
  'round-b': {
    slug: 'KAMPPI',
    head: 'Kolmas Verkko arvostettiin nelj\u00e4\u00e4nsataan miljoonaan',
    lines: [
      'Kampin kampuksella toimiva Kolmas Verkko {{on nyt arvoltaan nelj\u00e4sataa miljoonaa euroa|myi kuusi prosenttia itsest\u00e4\u00e4n kahdellakymmenell\u00e4nelj\u00e4ll\u00e4 miljoonalla, mik\u00e4 kerrottuna tekee nelj\u00e4sataa}} kierroksen j\u00e4lkeen, jota johtivat {{kansainv\u00e4liset sijoittajat|kaksi rahastoa, joista toinen johti my\u00f6s edellist\u00e4 kierrosta}}.',
      'Yhti\u00f6 {{skaalautuu nopeasti|ty\u00f6llist\u00e4\u00e4 yhdeks\u00e4ntoista ihmist\u00e4}} ja {{aikoo kolminkertaistaa henkil\u00f6st\u00f6ns\u00e4|on budjetoinut sen, ehdollisena seuraavalle kierrokselle}}.',
    ],
    technique: 'LUKU TUNNELMANA',
    decodeNote: 'Arvostus ei ole rahaa talossa. Se on viimeisimm\u00e4n pienen siivun hinta kerrottuna kaikella. Se p\u00e4\u00e4tyy otsikkoon, koska se on suurin saatavilla oleva luku \u2014 ja se on juuri se luku, jolla on v\u00e4hiten tekemist\u00e4 sen kanssa, toimiiko yritys.',
    tell: 'Kysy mit\u00e4 oikeasti maksettiin, ja kuinka suuresta osasta.',
  },
  'seabed': {
    slug: 'SUOMENLAHTI',
    head: 'Kolmas merenpohjan v\u00e4likohtaus Suomenlahdella',
    lines: [
      'Lahden pohjassa kulkeva datakaapeli {{vaurioitui|raahattiin poikki}} y\u00f6n aikana, ja viranomaiset kutsuvat tapausta {{kolmanneksi t\u00e4m\u00e4nvuotiseksi vastaavaksi v\u00e4likohtaukseksi|kolmanneksi tapahtumaksi lajissa, jota kukaan ei ole \u00e4\u00e4neen m\u00e4\u00e4ritellyt}}.',
      '{{Syy on yh\u00e4 tutkinnassa|Ankkurin j\u00e4lki valokuvattiin ja alus nimettiin asiakirjassa, jota kukaan ei ole lukenut \u00e4\u00e4neen}}. Viranomaiset {{eiv\u00e4t sulje pois ulkopuolista osallisuutta|eiv\u00e4t sano sit\u00e4 sanaa, jota kaikki ajattelevat}} ja {{kehottavat rauhallisuuteen|toivovat ett\u00e4 juttu p\u00e4\u00e4ttyy t\u00e4h\u00e4n}}.',
    ],
    technique: 'LUOKAN LIUKUMA',
    decodeNote: 'Kolmesta erilaisesta tapahtumasta tulee sarja sill\u00e4 hetkell\u00e4, kun joku kutsuu niit\u00e4 v\u00e4likohtauksiksi. Sana tekee kahta ty\u00f6t\u00e4 kerralla: se niputtaa asioita jotka eiv\u00e4t ehk\u00e4 kuulu yhteen, ja pysyy niin ep\u00e4m\u00e4\u00e4r\u00e4isen\u00e4, ettei mist\u00e4\u00e4n niist\u00e4 tarvitse todistaa mit\u00e4\u00e4n. Joskus niputus on oikein. Se pit\u00e4\u00e4 silti ansaita.',
    tell: '"Kolmas vastaava v\u00e4likohtaus" \u2014 vastaava mit\u00e4? Pakota juttu sanomaan se.',
  },
  'interference': {
    slug: 'IT\u00c4INEN L\u00c4HESTYMISALUE',
    head: 'Paikannush\u00e4iri\u00f6it\u00e4 it\u00e4isell\u00e4 l\u00e4hestymisalueella',
    lines: [
      'It\u00e4isen l\u00e4hestymisalueen lentokoneissa on {{esiintynyt paikannush\u00e4iri\u00f6it\u00e4|h\u00e4iritty satelliittipaikannusta}} nelj\u00e4tt\u00e4 viikkoa, {{viranomaista l\u00e4hell\u00e4 olevien l\u00e4hteiden mukaan|yhden nimett\u00f6m\u00e4n ihmisen mukaan, ja kaikki muut painoivat sen uudelleen}}.',
      'H\u00e4iri\u00f6t\u00e4 {{on havaittu|kukaan ei kerro kenen aiheuttamaa, ainakaan nimell\u00e4\u00e4n}} laajalla alueella. Lennot {{liikenn\u00f6iv\u00e4t normaalisti|laskeutuvat mittarien varassa, mik\u00e4 on normaalia eik\u00e4 ole sama asia kuin ettei mit\u00e4\u00e4n tapahtuisi}}.',
    ],
    technique: 'NIMET\u00d6N AUKTORITEETTI',
    decodeNote: '"L\u00e4hell\u00e4 olevat l\u00e4hteet" on aito ja joskus v\u00e4ltt\u00e4m\u00e4t\u00f6n keino \u2014 ihmiset menett\u00e4v\u00e4t ty\u00f6paikkoja puhumisesta. Mutta se antaa my\u00f6s yhden taustatilaisuuden muuttua nelj\u00e4ksi itsen\u00e4iselt\u00e4 n\u00e4ytt\u00e4v\u00e4ksi jutuksi. Kysymys ei ole vain onko se totta, vaan montako l\u00e4hdett\u00e4 oikeasti on ja kuka hy\u00f6tyy vuodosta.',
    tell: 'Nelj\u00e4 mediaa ja yksi nimet\u00f6n l\u00e4hde on yksi juttu nelj\u00e4ss\u00e4 hatussa.',
  },
  'synthetic-env': {
    slug: 'OTANIEMI',
    head: 'Helsingin moottoriosaaminen siirtyy synteettisiin ymp\u00e4rist\u00f6ihin',
    lines: [
      'P\u00e4\u00e4kaupunkiseudun studioita rekrytoidaan {{synteettisten ymp\u00e4rist\u00f6jen ty\u00f6h\u00f6n|sotilassimulaatioihin}} rakentamaan {{immersiivisi\u00e4 koulutusratkaisuja|maastoa, jossa sotilaat harjoittelevat}} {{institutionaalisille asiakkaille|puolustusministeri\u00f6ille}}.',
      'Er\u00e4\u00e4n rekrytoijan mukaan osaaminen siirtyy {{luontevasti|noin kolmanneksen paremmalla palkalla}}: sama moottori, sama maaston virtaus, {{sama tarkkuus realismissa|ja asiakas joka m\u00e4\u00e4rittelee realismin toisin kuin pelaaja}}.',
    ],
    technique: 'KIERTOILMAUS (HANKINTAKIELI)',
    decodeNote: 'Puolustushankinnoilla on oma sanastonsa, eik\u00e4 se ole sattumaa: "synteettinen ymp\u00e4rist\u00f6", "vaikuttaminen", "kineettinen". Jokainen termi on teknisesti t\u00e4sm\u00e4llinen ja jokainen siirt\u00e4\u00e4 lausetta askeleen kauemmas ihmisest\u00e4 maastossa. T\u00e4m\u00e4 on l\u00e4hinn\u00e4 aitoa trendi\u00e4 mit\u00e4 Helsingiss\u00e4 on, ja juuri siksi se kannattaa katsoa selkokielell\u00e4.',
    tell: 'K\u00e4\u00e4nn\u00e4 hankintasana siksi, mit\u00e4 se tekee keholle. P\u00e4\u00e4t\u00e4 vasta sitten.',
  },
  'amplification': {
    slug: 'T\u00c4M\u00c4 TAAJUUS',
    head: 'Koordinoitua vahvistusta havaittu keskustelun ymp\u00e4rill\u00e4',
    lines: [
      '{{Satamasopimusta koskeva keskustelu|Kysymys, josta ei keskusteltu ennen kuin se kehystettiin keskusteluksi}} ker\u00e4si {{aallon orgaanista sitoutumista|yhdeks\u00e4nsataa tili\u00e4, joista nelj\u00e4sataa alle viikon ik\u00e4isi\u00e4}} t\u00e4ll\u00e4 viikolla ja {{her\u00e4tti huolta|tuotti tiedotteen ryhm\u00e4lt\u00e4, joka seuraa huolta}}.',
      'Analyytikot varoittavat, ett\u00e4 {{yleis\u00f6n tulisi olla valppaana manipulaation varalta|kuuntelet juuri nyt yhden aseman valikoimaa yhden p\u00e4iv\u00e4n tapahtumista, luettuna hyytel\u00f6n suulla mikrofonin \u00e4\u00e4ress\u00e4}}.',
    ],
    technique: 'ENNAKOIVA KEHYS',
    decodeNote: 'Tehokkain temppu ei ole valhe tekstiss\u00e4 vaan oletus sen edess\u00e4. Kun jokin nimet\u00e4\u00e4n "keskusteluksi", keskustelusta tulee totta ja molemmat puolet siirtyv\u00e4t sille joka sen nimesi. Ja kyll\u00e4: t\u00e4m\u00e4 l\u00e4hetys poimii kourallisen juttuja yhdest\u00e4 p\u00e4iv\u00e4st\u00e4 ja lukee ne tietyss\u00e4 j\u00e4rjestyksess\u00e4. Sekin on kehys. Se on viimeinen asia jonka t\u00e4m\u00e4 asema kertoo sinulle, ja hy\u00f6dyllisin.',
    tell: 'Kysy kuka p\u00e4\u00e4tti, ett\u00e4 t\u00e4m\u00e4 on se kysymys. My\u00f6s t\u00e4ss\u00e4.',
  },
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
  'surprise-bundle': {
    slug: 'RUOHOLAHTI',
    head: 'Lumipeli poistaa lootboxit Season Zerosta',
    lines: [
      'Lumipeli on {{poistanut lootboxit|nimennyt lootboxit uudelleen}} Season Zerosta ja korvannut ne sill\u00e4, mit\u00e4 studio kutsuu {{yll\u00e4tyspalkintopaketeiksi|lootboxeiksi}}. Muutos {{tehtiin pelaajapalautteen pohjalta|tehtiin kahdessa maassa vireill\u00e4 olevan lakiesityksen pohjalta}}.',
      'Studion mukaan uudet paketit {{antavat pelaajalle hallinnan|maksavat 4,99 ja sis\u00e4lt\u00e4v\u00e4t samat esineet samoilla todenn\u00e4k\u00f6isyyksill\u00e4}}, ja studio {{on ylpe\u00e4 voidessaan n\u00e4ytt\u00e4\u00e4 suuntaa|ehti ensimm\u00e4isen\u00e4 kysytt\u00e4v\u00e4ksi}}.',
    ],
    technique: 'UUDELLEENNIME\u00c4MINEN UUDISTUKSENA',
    decodeNote: 'Mit\u00e4\u00e4n ei poistettu \u2014 substantiivi poistettiin. Suomessa temppu piiloutuu yhdyssanaan: "yll\u00e4tyspalkintopaketti" on yksi sana, ja yksi sana kuulostaa yhdelt\u00e4 asialta, jolloin kukaan ei pura sit\u00e4 osiin ja kysy, mik\u00e4 osa siit\u00e4 on muuttunut. Mekanismi, hinta ja todenn\u00e4k\u00f6isyydet selvi\u00e4v\u00e4t lauseesta koskemattomina. Kuvassa on sama laatikko kahdesti. "Pelaajapalautteen pohjalta" tekee oman erillisen ty\u00f6ns\u00e4: se ajoittaa p\u00e4\u00e4t\u00f6ksen valituksiin eik\u00e4 lakiesitykseen, jolloin studio saa n\u00e4ytt\u00e4\u00e4 valinneen itse.',
    tell: 'Kysy, mit\u00e4 asiakas pystyy nyt tekem\u00e4\u00e4n, mit\u00e4 h\u00e4n ei pystynyt viime viikolla. Jos vastaus on "lukemaan eri sanan", mit\u00e4\u00e4n ei uudistettu.',
  },
  'up-to-ten': {
    slug: 'PIT\u00c4J\u00c4NM\u00c4KI',
    head: 'Verkkovoima tuo koteihin jopa kymmenen gigabitin nopeudet',
    lines: [
      'Verkkovoima on avannut kuluttajaliittym\u00e4n, jonka nopeus on {{jopa kymmenen gigabitti\u00e4|kerran mitattu luku, keskuksen omassa talossa, nelj\u00e4lt\u00e4 aamuy\u00f6ll\u00e4}}. Operaattorin mukaan kyseess\u00e4 on {{maan nopein liittym\u00e4|maan suurin mainokseen painettu luku}}.',
      'Yhti\u00f6 kertoi, ett\u00e4 {{asiakkaat voivat odottaa aivan uudenlaista kokemusta|sen itse mittaama mediaaniyhteys kulki 1,4:ss\u00e4}} ja ett\u00e4 {{nopeus voi vaihdella kiinteist\u00f6kohtaisesti|mainoksen luku mitattiin talossa, jossa ei asu ket\u00e4\u00e4n}}.',
    ],
    technique: 'RAJATON VAIHTELUV\u00c4LI',
    decodeNote: '"Jopa" ei tunne alarajaa. Sana nime\u00e4\u00e4 katon ja j\u00e4tt\u00e4\u00e4 lukijan t\u00e4ytt\u00e4m\u00e4\u00e4n tyypillisen arvon itse \u2014 ty\u00f6n, jonka lause on hiljaa siirt\u00e4nyt h\u00e4nelle. Ainoa luku, jonka lause todella lupaa, on nolla. Suomessa temppu on erityisen huomaamaton, koska "jopa" kuulostaa innostuneelta eik\u00e4 varovaiselta: se on kehumisen sana, ei varauksen. Kuvassa on sama mittausaineisto kahdesti \u2014 pura se, ja palkki romahtaa mediaaniin, mittaukset asettuvat sinne minne ne osuivat, ja ylin yksin\u00e4inen piste j\u00e4\u00e4 renkaaseen. Se on se, jonka ansiosta mainos on laillinen.',
    tell: 'Lue se muodossa "v\u00e4hint\u00e4\u00e4n ei mit\u00e4\u00e4n, enint\u00e4\u00e4n". Jos se kuulostaa yh\u00e4 tarjoukselta, se ei ollut tarjous.',
  },
  'no-comment': {
    slug: 'KATAJANOKKA',
    head: 'Ministeri\u00f6 vastaa tietoihin uudesta sieppauskyvyst\u00e4',
    lines: [
      'Uudesta sieppauskyvyst\u00e4 kysytt\u00e4ess\u00e4 ministeri\u00f6 totesi, ettei se {{kommentoi kykyj\u00e4, joita sill\u00e4 ei ole|sanonut, ettei sill\u00e4 ole t\u00e4t\u00e4}}, ja ett\u00e4 {{tiedot ovat spekulatiivisia|tiedot pit\u00e4v\u00e4t paikkansa jokaisessa kohdassa, jota ministeri\u00f6 ei valinnut k\u00e4sitell\u00e4}}.',
      'Tiedottaja lis\u00e4si, ettei {{t\u00e4llaista ohjelmaa ole hyv\u00e4ksytty kuvatussa muodossa|kuvattu muoto ole se muoto}} ja ettei {{ministeri\u00f6ll\u00e4 ole t\u00e4ss\u00e4 vaiheessa lis\u00e4tt\u00e4v\u00e4\u00e4|ministeri\u00f6ll\u00e4 ole lis\u00e4tt\u00e4v\u00e4\u00e4 ennen lokakuuta, jolloin sill\u00e4 on kolme asiaa}}.',
    ],
    technique: 'KIELTO JOKA EI KIELL\u00c4',
    decodeNote: 'Jokainen lause on tosi eik\u00e4 yksik\u00e4\u00e4n ole kielto. "Ei kommentoi kykyj\u00e4, joita sill\u00e4 ei ole" on linjausta koskeva lause pukeutuneena tosiasiaa koskevaksi lauseeksi, ja "kuvatussa muodossa" siirt\u00e4\u00e4 kiellon kuvaukseen eik\u00e4 itse asiaan. Suomessa muoto tekee tempusta viel\u00e4 sile\u00e4mm\u00e4n: kieltoverbi tulee ensin ja p\u00e4\u00e4verbi kaukana per\u00e4ss\u00e4, joten korva kuulee "ei" mutta ei ehdi tarkistaa mihin se osui. Laske kuvasta kiellot: lausunto on kuusirivinen ja sen kiist\u00e4mien v\u00e4itteiden m\u00e4\u00e4r\u00e4 on nolla.',
    tell: 'Kirjoita yl\u00f6s se lause, jonka halusit kiistetyksi, ja etsi se sanasta sanaan jonkin "ei"-lauseen sis\u00e4lt\u00e4. Jos sit\u00e4 ei ole siell\u00e4, sit\u00e4 ei kiistetty.',
  },
};

const JA = {
  // no JA copy on hand for these yet; they keep the EN fallback
  ...Object.fromEntries(["ram-discipline"].map(k => [k, EN[k]])),
  'border-lab': {
    slug: '\u6771\u306e\u56fd\u5883',
    head: '\u56fd\u5883\u306e\u6280\u8853\u304c\u3001\u9996\u90fd\u3092\u540c\u76df\u306e\u5b9f\u9a13\u5834\u306b\u5909\u3048\u308b\u304b\u3082\u3057\u308c\u306a\u3044',
    lines: [
      '\u9996\u90fd\u570f\u306e\u30b9\u30bf\u30b8\u30aa\u306b\u3001\u540c\u76df\u7cfb\u306e\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3\u5951\u7d04\u306e\u6ce2\u304c{{\u6765\u308b\u53ef\u80fd\u6027\u304c\u3042\u308b|\u6765\u308b\u3068\u8a00\u3063\u305f\u8005\u306f\u3044\u306a\u3044}}\u3002\u3042\u308b\u5206\u6790\u306f\u305d\u308c\u3092\u3001\u5a2f\u697d\u304b\u3089\u9632\u885b\u3078\u306e\u79fb\u884c\u3060\u3068{{\u8a55\u3057\u3066\u3044\u308b|\u8a55\u3059\u308b\u3088\u3046\u767a\u6ce8\u3055\u308c\u305f}}\u3002',
      '\u4e00\u65b9\u3067\u6771\u306e\u56fd\u5883\u306f\u3001\u5bfe\u30c9\u30ed\u30fc\u30f3\u3068\u30b5\u30a4\u30d0\u30fc\u4f5c\u6226\u306e{{\u30b0\u30e9\u30a6\u30f3\u30c9\u30fb\u30bc\u30ed\u306b\u306a\u308a\u3064\u3064\u3042\u308b|\u305d\u3046\u547c\u3070\u308c\u305f\u306e\u306f\u4e00\u5ea6\u3001\u3042\u308b\u8aac\u660e\u4f1a\u3067\u3001\u540d\u524d\u306e\u51fa\u306a\u3044\u8ab0\u304b\u306b\u3088\u3063\u3066\u3060\u3063\u305f}}\u3068\u3055\u308c\u3001\u3053\u306e\u5730\u306e\u30b9\u30bf\u30b8\u30aa\u3082{{\u3069\u3061\u3089\u304b\u3092\u9078\u3076\u3053\u3068\u306b\u306a\u308b\u304b\u3082\u3057\u308c\u306a\u3044|\u9078\u3076\u7406\u7531\u3092\u58f2\u308a\u8fbc\u307e\u308c\u3066\u3044\u308b}}\u3002{{\u53ef\u80fd\u6027\u306f\u6392\u9664\u3067\u304d\u306a\u3044|\u3053\u306e\u901f\u5831\u3067\u78ba\u5b9a\u3055\u308c\u305f\u3053\u3068\u306f\u4f55\u3082\u306a\u3044}}\u3002',
    ],
    technique: '\u63a8\u6e2c\u3068\u3044\u3046\u540d\u306e\u5831\u9053',
    decodeNote: '\u4fdd\u967a\u306e\u8a00\u8449\u3092\u6570\u3048\u308b\u3002\u53ef\u80fd\u6027\u304c\u3042\u308b\u3001\u8a55\u3057\u3066\u3044\u308b\u3001\u306a\u308a\u3064\u3064\u3042\u308b\u3001\u304b\u3082\u3057\u308c\u306a\u3044\u3001\u6392\u9664\u3067\u304d\u306a\u3044\u3002\u3069\u308c\u3072\u3068\u3064\u4f55\u3082\u4e3b\u5f35\u3057\u3066\u3044\u306a\u3044\u306e\u306b\u3001\u5408\u308f\u3055\u308b\u3068 \u7d1b\u4e89\u306e\u5287\u5834\u304c\u307e\u308b\u3054\u3068\u7acb\u3061\u3042\u304c\u308a\u3001\u3042\u3068\u306b\u306a\u3063\u3066\u300c\u5831\u3058\u3089\u308c\u305f\u4e8b\u5b9f\u300d\u3068\u3057\u3066\u8a18\u61b6\u306b\u6b8b\u308b\u3002\u52b9\u3044\u3066\u3044\u308b\u306e\u306f\u6587\u306e*\u304b\u305f\u3061*\u2014\u2014\u4e3b\u8a9e\u3001\u52d5\u8a5e\u3001\u5e30\u7d50\u2014\u2014\u3067\u3001\u52d5\u8a5e\u306f\u3059\u3079\u3066\u6761\u4ef6\u306e\u307e\u307e\u3060\u3002\u3053\u308c\u306f\u9632\u885b\u8abf\u9054\u8a18\u4e8b\u306e\u6a19\u6e96\u6587\u6cd5\u3067\u3042\u308a\u3001\u672c\u7269\u306e\u30ea\u30b9\u30af\u3068\u60f3\u50cf\u4e0a\u306e\u30ea\u30b9\u30af\u3092\u7d19\u306e\u4e0a\u3067\u540c\u3058\u9854\u306b\u898b\u305b\u308b\u65b9\u6cd5\u3067\u3082\u3042\u308b\u3002',
    tell: '\u300c\u304b\u3082\u3057\u308c\u306a\u3044\u300d\u300c\u306a\u308a\u3064\u3064\u3042\u308b\u300d\u300c\u6392\u9664\u3067\u304d\u306a\u3044\u300d\u3092\u5168\u90e8\u6d88\u3057\u3066\u3001\u6b8b\u3063\u305f\u3082\u306e\u3092\u8aad\u3080\u3002\u4f55\u3082\u6b8b\u3089\u306a\u3044\u306a\u3089\u3001\u4f55\u3082\u5831\u3058\u3089\u308c\u3066\u3044\u306a\u3044\u3002',
  },
  'kaiku-restructure': {
    slug: '\u30ab\u30f3\u30d4',
    head: '\u30ab\u30a4\u30af\u30fb\u30a4\u30f3\u30bf\u30e9\u30af\u30c6\u30a3\u30d6\u3001\u30b9\u30bf\u30b8\u30aa\u518d\u7de8\u3092\u767a\u8868',
    lines: [
      '\u30ab\u30a4\u30af\u30fb\u30a4\u30f3\u30bf\u30e9\u30af\u30c6\u30a3\u30d6\u306f\u79cb\u306e\u30e9\u30a4\u30f3\u30ca\u30c3\u30d7\u3092\u524d\u306b\u3001\u30ab\u30f3\u30d4\u30fb\u30b9\u30bf\u30b8\u30aa\u306e\u518d\u7de8\u3092\u8a8d\u3081\u305f\u3002{{\u4e5d\u5341\u4e8c\u306e\u30ed\u30fc\u30eb\u304c\u5f71\u97ff\u3092\u53d7\u3051\u305f|\u53d6\u7de0\u5f79\u4f1a\u304c\u4e5d\u5341\u4e8c\u4eba\u3092\u89e3\u96c7\u3059\u308b\u3068\u6c7a\u3081\u305f}}\u3068\u3055\u308c\u3001\u540c\u793e\u306f\u3053\u308c\u3092{{\u82e6\u6e0b\u306e\u3001\u3057\u304b\u3057\u5fc5\u8981\u306a\u4e00\u6b69|\u4eca\u671f\u306e\u5229\u76ca\u7387\u3092\u5b88\u308b\u305f\u3081\u306e\u624b\u6bb5}}\u3068\u8aac\u660e\u3057\u3066\u3044\u308b\u3002',
      '\u58f0\u660e\u3067\u30b9\u30bf\u30b8\u30aa\u306f{{\u6c7a\u5b9a\u306f\u8efd\u3005\u306b\u4e0b\u3055\u308c\u305f\u3082\u306e\u3067\u306f\u306a\u3044|\u8ab0\u304c\u6c7a\u5b9a\u3092\u4e0b\u3057\u305f\u306e\u304b\u306f\u3001\u8ab0\u3082\u8a00\u3063\u3066\u3044\u306a\u3044}}\u3068\u3057\u3001{{\u5f71\u97ff\u3092\u53d7\u3051\u305f\u65b9\u3005\u306b\u306f\u79fb\u884c\u671f\u306e\u652f\u63f4\u3092\u884c\u3046|\u89e3\u96c7\u3055\u308c\u305f\u4eba\u306b\u306f\u516b\u9031\u9593\u304c\u4e0e\u3048\u3089\u308c\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u306f\u6b63\u5348\u306b\u6b62\u307e\u308b}}\u3068\u8ff0\u3079\u305f\u3002',
    ],
    technique: '\u4e3b\u8a9e\u306a\u304d\u53d7\u52d5\u614b',
    decodeNote: '\u30ed\u30fc\u30eb\u304c\u5f71\u97ff\u3092\u53d7\u3051\u305f\u3002\u8ab0\u306b\u3088\u3063\u3066\uff1f\u3000\u3053\u306e\u6587\u306b\u306f\u4e3b\u8a9e\u304c\u306a\u304f\u3001\u3060\u304b\u3089\u6587\u4e2d\u306e\u8ab0\u3082\u7d50\u679c\u306e\u8cac\u4efb\u3092\u8ca0\u308f\u306a\u3044\u3002\u4eba\u54e1\u524a\u6e1b\u306f\u30d3\u30b8\u30cd\u30b9\u6587\u66f8\u306e\u306a\u304b\u3067\u6700\u3082\u78ba\u5b9f\u306b\u884c\u70ba\u8005\u304c\u6d88\u3048\u308b\u51fa\u6765\u4e8b\u3067\u3001\u7269\u4e8b\u306f\u3042\u305f\u304b\u3082\u3072\u3068\u308a\u3067\u306b\u4eba\u3078\u964d\u308a\u304b\u304b\u308b\u3002',
    tell: '\u300c\u3053\u308c\u3092\u8ab0\u304c\u3084\u3063\u305f\u306e\u304b\u300d\u304c\u305d\u306e\u6587\u304b\u3089\u5206\u304b\u3089\u306a\u3044\u306a\u3089\u3001\u305d\u308c\u3053\u305d\u304c\u305d\u306e\u6587\u306e\u4ed5\u4e8b\u3060\u3063\u305f\u3002',
  },
  'season-zero': {
    slug: '\u30b9\u30f4\u30a3\u30e9\u30cf\u30c6\u30a3',
    head: '\u30b7\u30fc\u30ba\u30f3\u30fb\u30bc\u30ed\u3001\u30eb\u30df\u30da\u30ea\u53f2\u4e0a\u6700\u9ad8\u306e\u30a8\u30f3\u30b2\u30fc\u30b8\u30e1\u30f3\u30c8',
    lines: [
      '\u30eb\u30df\u30da\u30ea\u306b\u3088\u308c\u3070\u3001\u30e9\u30a4\u30d6\u30bf\u30a4\u30c8\u30eb\u300e\u30b7\u30fc\u30ba\u30f3\u30fb\u30bc\u30ed\u300f\u306f\u590f\u306e\u30d1\u30c3\u30c1\u4ee5\u964d{{\u30a8\u30f3\u30b2\u30fc\u30b8\u30e1\u30f3\u30c8\u304c\u56db\u5341\u30d1\u30fc\u30bb\u30f3\u30c8\u4e0a\u6607\u3057\u305f|\u904e\u53bb\u6700\u60aa\u306e\u6708\u3068\u6bd4\u3079\u3066\u56db\u5341\u30d1\u30fc\u30bb\u30f3\u30c8\u591a\u3044}}\u3002\u30b9\u30bf\u30b8\u30aa\u306f\u3053\u306e\u6570\u5b57\u3092{{\u524d\u4f8b\u306e\u306a\u3044\u3082\u306e|\u4f5c\u54c1\u5185\u306e\u4f55\u3068\u3082\u6bd4\u8f03\u3057\u3066\u3044\u306a\u3044}}\u3068\u547c\u3076\u3002',
      '\u30d1\u30d6\u30ea\u30c3\u30b7\u30e3\u30fc\u306f{{\u30d7\u30ec\u30a4\u30e4\u30fc\u306f\u304b\u3064\u3066\u306a\u3044\u307b\u3069\u9577\u304f\u4e16\u754c\u306b\u6ede\u5728\u3057\u3066\u3044\u308b|\u30c7\u30a4\u30ea\u30fc\u30ed\u30b0\u30a4\u30f3\u5831\u916c\u306e\u53d7\u3051\u53d6\u308a\u306b\u5341\u4e00\u5206\u304b\u304b\u308b\u3088\u3046\u306b\u306a\u3063\u305f}}\u3068\u3057\u3001\u7b2c\u4e8c\u30b7\u30fc\u30ba\u30f3\u306f{{\u92ed\u610f\u958b\u767a\u4e2d|\u767a\u8868\u6e08\u307f}}\u3060\u3068\u4ed8\u3051\u52a0\u3048\u305f\u3002',
    ],
    technique: '\u5206\u6bcd\u306e\u6b20\u843d',
    decodeNote: '\u4f55\u306b\u5bfe\u3059\u308b\u56db\u5341\u30d1\u30fc\u30bb\u30f3\u30c8\u3067\u3001\u3044\u3064\u3092\u8d77\u70b9\u306b\u3057\u305f\u6570\u5b57\u306a\u306e\u304b\u3002\u57fa\u6e96\u306e\u306a\u3044\u767e\u5206\u7387\u306f\u6e2c\u5b9a\u3067\u306f\u306a\u304f\u6c17\u5206\u3060\u3002\u53f3\u306e\u30b0\u30e9\u30d5\u306f\u540c\u3058\u30c7\u30fc\u30bf\u3092\u3001\u843d\u3061\u8fbc\u307f\u306e\u5e95\u3067\u306f\u306a\u304f\u30bc\u30ed\u304b\u3089\u59cb\u3081\u305f\u8ef8\u3067\u63cf\u3044\u305f\u3082\u306e\u2014\u2014\u89e3\u8aad\u3059\u308c\u3070\u3001\u5c71\u306f\u3082\u3068\u3069\u304a\u308a\u306e\u5c0f\u3055\u306a\u76db\u308a\u4e0a\u304c\u308a\u306b\u623b\u308b\u3002',
    tell: '\u3069\u3093\u306a\u767e\u5206\u7387\u306b\u3082\u5206\u6bcd\u304c\u3042\u308b\u3002\u8a18\u4e8b\u306b\u66f8\u304b\u308c\u3066\u3044\u306a\u3044\u306a\u3089\u3001\u305d\u308c\u306f\u90fd\u5408\u306e\u60aa\u3044\u6570\u5b57\u3060\u3063\u305f\u3002',
  },
  'foundry-deal': {
    slug: '\u30d1\u30b7\u30e9',
    head: '\u30f4\u30a1\u30f3\u30bf\u30fc\u30fb\u30d5\u30a1\u30a6\u30f3\u30c9\u30ea\u30fc\u3001\u30ce\u30fc\u30b9\u30e9\u30a4\u30f3\u3068\u624b\u3092\u7d44\u3080',
    lines: [
      '\u30f4\u30a1\u30f3\u30bf\u30fc\u30fb\u30d5\u30a1\u30a6\u30f3\u30c9\u30ea\u30fc\u306f\u30ce\u30fc\u30b9\u30e9\u30a4\u30f3\u30fb\u30b0\u30eb\u30fc\u30d7\u3068{{\u624b\u3092\u7d44\u3080|\u5b8c\u5168\u306b\u8cb7\u53ce\u3055\u308c\u305f}}\u3002\u4e21\u793e\u306f\u3053\u308c\u3092{{\u5bfe\u7b49\u306a\u30d1\u30fc\u30c8\u30ca\u30fc\u30b7\u30c3\u30d7|\u4e00\u65b9\u304c\u4ed6\u65b9\u3092\u8cb7\u3046\u53d6\u5f15}}\u3068\u8868\u73fe\u3059\u308b\u3002\u30b9\u30bf\u30b8\u30aa\u306f{{\u30af\u30ea\u30a8\u30a4\u30c6\u30a3\u30d6\u306e\u72ec\u7acb\u6027\u3092\u7dad\u6301\u3059\u308b|\u4e8c\u5e74\u9593\u306e\u30a2\u30fc\u30f3\u30a2\u30a6\u30c8\u6761\u9805\u304c\u4ed8\u3044\u3066\u3044\u308b}}\u3068\u3044\u3046\u3002',
      '\u30ce\u30fc\u30b9\u30e9\u30a4\u30f3\u306f\u30d8\u30eb\u30b7\u30f3\u30ad\u306e\u30c1\u30fc\u30e0\u304c{{\u4e16\u754c\u6c34\u6e96\u306e\u6280\u8853\u3092\u30b0\u30eb\u30fc\u30d7\u306b\u3082\u305f\u3089\u3059|\u30ab\u30bf\u30ed\u30b0\u3068\u3001\u30b2\u30fc\u30e0\u3092\u51fa\u3057\u5207\u308c\u308b\u56db\u5341\u4e00\u4eba\u3092\u9023\u308c\u3066\u304f\u308b}}\u3068\u3057\u3001{{\u73fe\u6642\u70b9\u3067\u5909\u66f4\u306e\u4e88\u5b9a\u306f\u306a\u3044|\u3053\u306e\u8a00\u3044\u56de\u3057\u306f\u5b9a\u578b\u3067\u3001\u9759\u304b\u306b\u671f\u9650\u5207\u308c\u306b\u306a\u308b}}\u3068\u8ff0\u3079\u305f\u3002',
    ],
    technique: '\u5a49\u66f2\u8868\u73fe',
    decodeNote: '\u300c\u624b\u3092\u7d44\u3080\u300d\u306f\u5408\u4f75\u306e\u8a9e\u5f59\u3067\u8cb7\u53ce\u306e\u4ed5\u4e8b\u3092\u3057\u3066\u3044\u308b\u3002\u898b\u5206\u3051\u308b\u306e\u306f\u91d1\u3060\u3002\u5bfe\u7b49\u306a\u63d0\u643a\u306b\u30a2\u30fc\u30f3\u30a2\u30a6\u30c8\u306f\u4ed8\u304b\u306a\u3044\u3057\u3001\u308f\u3056\u308f\u3056\u767a\u8868\u3057\u306a\u3051\u308c\u3070\u306a\u3089\u306a\u3044\u72ec\u7acb\u6027\u306f\u3001\u30b9\u30bf\u30b8\u30aa\u306b\u3064\u3044\u3066\u306e\u4e8b\u5b9f\u3067\u306f\u306a\u304f\u58f2\u5374\u306e\u6761\u4ef6\u3067\u3042\u308b\u3002',
    tell: '\u4e21\u793e\u304c\u5bfe\u7b49\u3060\u3068\u3044\u3046\u306a\u3089\u3001\u3069\u3061\u3089\u304c\u5c0f\u5207\u624b\u3092\u5207\u3063\u305f\u306e\u304b\u3092\u8a0a\u304f\u3002',
  },
  'summit-consensus': {
    slug: '\u30e1\u30c3\u30b9\u30b1\u30b9\u30af\u30b9',
    head: '\u696d\u754c\u306e\u7dcf\u610f\u2014\u2014\u6b21\u306e\u5341\u5e74\u306f\u6301\u7d9a\u578b\u30ef\u30fc\u30eb\u30c9\u306e\u3082\u306e',
    lines: [
      '\u4eca\u9031\u306e\u30ce\u30fc\u30b6\u30f3\u30fb\u30d7\u30ec\u30a4\u30fb\u30b5\u30df\u30c3\u30c8\u3067{{\u696d\u754c\u306f\u7dcf\u610f\u306b\u9054\u3057\u305f|\u3072\u3068\u3064\u306e\u58c7\u4e0a\u306b\u3044\u305f\u56db\u4eba\u304c\u540c\u3058\u3053\u3068\u3092\u8a00\u3063\u305f}}\u3002\u6b21\u306e\u5341\u5e74\u306f\u5e38\u6642\u63a5\u7d9a\u306e\u6301\u7d9a\u578b\u30ef\u30fc\u30eb\u30c9\u306e\u3082\u306e\u3060\u3001\u3068\u3002{{\u95a2\u4fc2\u8005\u306b\u3088\u308c\u3070|\u6301\u7d9a\u578b\u30ef\u30fc\u30eb\u30c9\u5411\u3051\u306e\u30c4\u30fc\u30eb\u3092\u58f2\u308b\u4e8c\u4eba\u306b\u3088\u308c\u3070}}\u3001\u9069\u5fdc\u3067\u304d\u306a\u3044\u30b9\u30bf\u30b8\u30aa\u306f{{\u53d6\u308a\u6b8b\u3055\u308c\u308b\u5371\u967a\u304c\u3042\u308b|\u5b9f\u969b\u306b\u306f\u554f\u984c\u306a\u304f\u3084\u3063\u3066\u3044\u3051\u308b}}\u3002',
      '{{\u30d8\u30eb\u30b7\u30f3\u30ad\u3067\u7570\u3092\u5531\u3048\u308b\u8005\u306f\u307b\u3068\u3093\u3069\u3044\u306a\u3044|\u30b5\u30df\u30c3\u30c8\u3067\u7570\u8ad6\u3092\u6c42\u3081\u3089\u308c\u305f\u4eba\u306f\u3044\u306a\u304b\u3063\u305f}}\u3002\u3082\u3063\u3068\u3082\u30d1\u30cd\u30eb\u306f{{\u30ea\u30c6\u30f3\u30b7\u30e7\u30f3\u306e\u8ab2\u984c\u3082\u8a8d\u3081\u305f|\u7d42\u4e86\u4e09\u5206\u524d\u306b\u3001\u8cea\u554f\u3092\u3072\u3068\u3064\u3060\u3051\u53d7\u3051\u305f}}\u3002',
    ],
    technique: '\u4f5c\u3089\u308c\u305f\u7dcf\u610f',
    decodeNote: '\u30ab\u30f3\u30d5\u30a1\u30ec\u30f3\u30b9\u3068\u306f\u8ab0\u304b\u304c\u501f\u308a\u305f\u90e8\u5c4b\u306e\u3053\u3068\u3060\u3002\u300c\u696d\u754c\u306e\u7dcf\u610f\u300d\u306f\u305f\u3044\u3066\u3044\u300c\u58c7\u4e0a\u306e\u7dcf\u610f\u300d\u3092\u610f\u5473\u3057\u3001\u305d\u306e\u58c7\u4e0a\u3092\u62bc\u3055\u3048\u305f\u306e\u306f\u4f55\u304b\u3092\u58f2\u308a\u305f\u3044\u4eba\u3005\u3067\u3042\u308b\u3002\u305d\u306e\u7dcf\u610f\u304c\u4fe1\u3058\u3089\u308c\u3066\u5f97\u3092\u3059\u308b\u306e\u306f\u8ab0\u304b\u2014\u2014\u305f\u3044\u3066\u3044\u305d\u306e\u4eba\u304c\u5f15\u7528\u3055\u308c\u3066\u3044\u308b\u3002',
    tell: '\u60c5\u5831\u6e90\u3092\u6570\u3048\u308b\u3002\u300c\u696d\u754c\u300d\u304c\u56db\u4eba\u3092\u8d85\u3048\u308b\u3053\u3068\u306f\u3081\u3063\u305f\u306b\u306a\u3044\u3002',
  },
  'heat-recovery': {
    slug: '\u30bb\u30eb\u30ca\u30a4\u30cd\u30f3',
    head: '\u30bb\u30cf\u30b3\u30f4\u30a3\u30eb\u30bf\u306e\u30c7\u30fc\u30bf\u30db\u30fc\u30eb\u3001\u516b\u5343\u6238\u3092\u6696\u3081\u308b',
    lines: [
      '\u6771\u30d8\u30eb\u30b7\u30f3\u30ad\u306e\u30bb\u30cf\u30b3\u30f4\u30a3\u30eb\u30bf\u65b0\u30db\u30fc\u30eb\u306f{{\u6392\u71b1\u3092\u5730\u57df\u71b1\u4f9b\u7d66\u7db2\u306b\u9084\u5143\u3059\u308b|\u6392\u71b1\u3092\u5730\u57df\u71b1\u4f9b\u7d66\u7db2\u306b\u58f2\u308b}}\u3002\u540c\u793e\u306b\u3088\u308c\u3070{{\u516b\u5343\u6238\u306b\u76f8\u5f53\u3059\u308b|\u30db\u30fc\u30eb\u81ea\u8eab\u304c\u5f15\u304f\u96fb\u529b\u306e\u304a\u3088\u305d\u56db\u30d1\u30fc\u30bb\u30f3\u30c8\u306b\u3042\u305f\u308b}}\u71b1\u91cf\u3060\u3068\u3044\u3046\u3002',
      '\u4e8b\u696d\u8005\u306f\u3053\u306e\u62e0\u70b9\u3092{{\u904b\u7528\u6642\u30ab\u30fc\u30dc\u30f3\u30cd\u30ac\u30c6\u30a3\u30d6|\u71b1\u306e\u58f2\u5374\u5206\u3092\u81ea\u793e\u306e\u30d5\u30c3\u30c8\u30d7\u30ea\u30f3\u30c8\u304b\u3089\u5dee\u3057\u5f15\u3051\u3070\u30ab\u30fc\u30dc\u30f3\u30cd\u30ac\u30c6\u30a3\u30d6}}\u3068\u547c\u3073\u3001{{\u5e02\u306e\u6c17\u5019\u306e\u6b69\u307f\u306b\u52a0\u308f\u308c\u3066\u8a87\u3089\u3057\u3044|\u4e09\u6708\u306b\u7cfb\u7d71\u63a5\u7d9a\u306e\u8a31\u53ef\u304c\u4e0b\u308a\u305f}}\u3068\u8ff0\u3079\u305f\u3002',
    ],
    technique: '\u90fd\u5408\u306e\u3088\u3044\u57fa\u6e96\u7dda',
    decodeNote: '\u6392\u71b1\u56de\u53ce\u306f\u672c\u7269\u3067\u3001\u5b9f\u969b\u306b\u826f\u3044\u3053\u3068\u3060\u3002\u624b\u53e3\u306f\u3001\u305d\u306e\u826f\u3044\u90e8\u5206\u3092\u81ea\u5206\u306e\u7dcf\u91cf\u304b\u3089\u5dee\u3057\u5f15\u304d\u3001\u6b8b\u308a\u3092\u8a71\u306e\u5168\u4f53\u3068\u3057\u3066\u5831\u544a\u3059\u308b\u3053\u3068\u306b\u3042\u308b\u3002\u6238\u6570\u306b\u306f\u540d\u524d\u304c\u4e0e\u3048\u3089\u308c\u3001\u8ca0\u8377\u306b\u306f\u4e0e\u3048\u3089\u308c\u306a\u3044\u3002\u3069\u3061\u3089\u306e\u6570\u5b57\u304c\u4eba\u9593\u306e\u5358\u4f4d\uff08\u300c\u6238\u300d\uff09\u3092\u3082\u3089\u3044\u3001\u3069\u3061\u3089\u304c\u30e1\u30ac\u30ef\u30c3\u30c8\u306e\u307e\u307e\u304b\u3092\u898b\u308b\u3002',
    tell: '\u89aa\u3057\u307f\u3084\u3059\u3044\u5358\u4f4d\u3053\u305d\u3001\u76f8\u624b\u304c\u7e70\u308a\u8fd4\u3057\u3066\u307b\u3057\u3044\u6570\u5b57\u3060\u3002',
  },
  'vuosaari-automation': {
    slug: '\u30f4\u30aa\u30b5\u30fc\u30ea',
    head: '\u6e2f\u6e7e\u3001\u52b4\u50cd\u529b\u30c8\u30e9\u30f3\u30b9\u30d5\u30a9\u30fc\u30e1\u30fc\u30b7\u30e7\u30f3\u3092\u958b\u59cb',
    lines: [
      '\u30f4\u30aa\u30b5\u30fc\u30ea\u306e\u30b3\u30f3\u30c6\u30ca\u30bf\u30fc\u30df\u30ca\u30eb\u306f\u3001\u4e8b\u696d\u8005\u306e\u3044\u3046{{\u52b4\u50cd\u529b\u30c8\u30e9\u30f3\u30b9\u30d5\u30a9\u30fc\u30e1\u30fc\u30b7\u30e7\u30f3\u8a08\u753b|\u30af\u30ec\u30fc\u30f3\u904b\u8ee2\u58eb\u3092\u9060\u9694\u30b3\u30f3\u30bd\u30fc\u30eb\u306b\u7f6e\u304d\u63db\u3048\u308b\u3053\u3068}}\u3092\u958b\u59cb\u3057\u305f\u3002{{\u5354\u8b70\u671f\u9593\u3092\u7d4c\u3066|\u4e8c\u6708\u306b\u6c7a\u307e\u308a\u4e03\u6708\u306b\u544a\u77e5\u3055\u308c\u305f\u6c7a\u5b9a\u3092\u7d4c\u3066}}\u306e\u3053\u3068\u3060\u3068\u3044\u3046\u3002',
      '\u4e8b\u696d\u8005\u306f\u3001\u3053\u306e\u5909\u66f4\u304c{{\u5927\u304d\u306a\u52b9\u7387\u5316\u3092\u3082\u305f\u3089\u3059|\u4e8c\u4ea4\u4ee3\u3092\u6d88\u3059}}\u3068\u3057\u3001{{\u5f71\u97ff\u3092\u53d7\u3051\u308b\u5f93\u696d\u54e1\u306b\u306f\u518d\u6559\u80b2\u306e\u6a5f\u4f1a\u3092\u63d0\u4f9b\u3059\u308b|\u30d5\u30a9\u30fc\u30af\u30ea\u30d5\u30c8\u306e\u8b1b\u7fd2\u304c\u3042\u308b}}\u3068\u8ff0\u3079\u305f\u3002',
    ],
    technique: '\u540d\u8a5e\u5316',
    decodeNote: '\u52d5\u8a5e\u3092\u540d\u8a5e\u306b\u5909\u3048\u308b\u3068\u3001\u884c\u70ba\u8005\u3082\u4e00\u7dd2\u306b\u6d88\u3048\u308b\u3002\u300c\u30c8\u30e9\u30f3\u30b9\u30d5\u30a9\u30fc\u30e1\u30fc\u30b7\u30e7\u30f3\u300d\u300c\u5354\u8b70\u300d\u300c\u518d\u7de8\u300d\u2014\u2014\u3069\u308c\u3082\u8ab0\u304b\u304c\u53d6\u3063\u305f\u884c\u52d5\u3067\u3001\u305d\u308c\u304c\u300c\u305f\u3060\u5b58\u5728\u3059\u308b\u7269\u300d\u306b\u8a70\u3081\u66ff\u3048\u3089\u308c\u3066\u3044\u308b\u3002\u30d5\u30a9\u30fc\u30af\u30ea\u30d5\u30c8\u306e\u8b1b\u7fd2\u306f\u672c\u5f53\u306b\u3042\u308b\u3002\u6d88\u3048\u308b\u4e8c\u4ea4\u4ee3\u3082\u672c\u5f53\u3060\u3002',
    tell: '\u300c\u301c\u5316\u300d\u3067\u7d42\u308f\u308b\u540d\u8a5e\u306f\u3001\u305f\u3044\u3066\u3044\u8ab0\u304b\u304c\u96a0\u3057\u305f\u304b\u3063\u305f\u52d5\u8a5e\u3060\u3002',
  },
  'sixth-generation': {
    slug: '\u30aa\u30bf\u30cb\u30a8\u30df',
    head: '\u8abf\u67fb\u3001\u6b21\u4e16\u4ee3\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3067\u6b27\u5dde\u9996\u4f4d\u306f\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9',
    lines: [
      '{{\u65b0\u305f\u306a\u8abf\u67fb\u306b\u3088\u308c\u3070|\u305d\u306e\u8abf\u67fb\u304c\u79f0\u8cdb\u3059\u308b\u4e09\u793e\u304c\u767a\u6ce8\u3057\u305f\u8abf\u67fb\u306b\u3088\u308c\u3070}}\u3001\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u306f\u6b21\u4e16\u4ee3\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u3078\u306e\u5099\u3048\u3067{{\u6b27\u5dde\u3092\u5148\u5c0e\u3057\u3066\u3044\u308b|\u305d\u306e\u5831\u544a\u66f8\u81ea\u8eab\u304c\u9078\u3093\u3060\u5341\u4e00\u304b\u56fd\u306e\u4e00\u89a7\u3092\u5148\u5c0e\u3057\u3066\u3044\u308b}}\u3002{{\u7814\u7a76\u8005\u3089\u306b\u3088\u308b\u3082\u306e|\u305d\u306e\u7d50\u8ad6\u306e\u305f\u3081\u306b\u5831\u916c\u3092\u53d7\u3051\u305f\u30b3\u30f3\u30b5\u30eb\u30c6\u30a3\u30f3\u30b0\u4f1a\u793e\u306b\u3088\u308b\u3082\u306e}}\u3060\u3068\u3044\u3046\u3002',
      '\u5831\u544a\u66f8\u306f{{\u696d\u754c\u56e3\u4f53\u306b\u6b53\u8fce\u3055\u308c\u305f|\u305d\u306e\u305f\u3081\u306b\u66f8\u304b\u308c\u305f}}\u3046\u3048\u3001{{\u653f\u7b56\u306b\u53cd\u6620\u3055\u308c\u308b\u898b\u901a\u3057|\u5341\u6708\u306e\u52a9\u6210\u7533\u8acb\u3067\u5f15\u7528\u3055\u308c\u308b}}\u3060\u3068\u3044\u3046\u3002',
    ],
    technique: '\u51fa\u6240\u30ed\u30f3\u30c0\u30ea\u30f3\u30b0',
    decodeNote: '\u4e3b\u5f35\u306f\u6a5f\u95a2\u3092\u901a\u3057\u3066\u6d17\u308f\u308c\u3001\u3084\u304c\u3066\u300c\u8abf\u67fb\u7d50\u679c\u300d\u3068\u3057\u3066\u51fa\u3066\u304f\u308b\u3002\u9806\u5e8f\u306f\u3053\u3046\u3060\u3002\u5229\u5bb3\u95a2\u4fc2\u8005\u304c\u30b3\u30f3\u30b5\u30eb\u306b\u6255\u3046\u3001\u30b3\u30f3\u30b5\u30eb\u304c\u516c\u8868\u3059\u308b\u3001\u901a\u4fe1\u793e\u304c\u30b3\u30f3\u30b5\u30eb\u3092\u5831\u3058\u308b\u3001\u4ed6\u793e\u304c\u901a\u4fe1\u793e\u3092\u5831\u3058\u308b\u3002\u56db\u6bb5\u76ee\u3067\u306f\u91d1\u306f\u898b\u3048\u306a\u304f\u306a\u308a\u3001\u4e3b\u5f35\u306b\u306f\u811a\u6ce8\u304c\u4ed8\u3044\u3066\u3044\u308b\u3002',
    tell: '\u300c\u301c\u306b\u3088\u308c\u3070\u300d\u3092\u3001\u6b62\u307e\u308b\u307e\u3067\u8fbf\u308b\u3002\u884c\u304d\u6b62\u307e\u308a\u306b\u3044\u308b\u8005\u304c\u3001\u305d\u306e\u4e00\u6587\u306e\u4ee3\u91d1\u3092\u6255\u3063\u305f\u3002',
  },
  'round-b': {
    slug: '\u30ab\u30f3\u30d4',
    head: '\u30b3\u30eb\u30de\u30b9\u30fb\u30f4\u30a7\u30eb\u30c3\u30b3\u3001\u8a55\u4fa1\u984d\u56db\u5104',
    lines: [
      '\u30ab\u30f3\u30d4\u306e\u30ad\u30e3\u30f3\u30d1\u30b9\u306b\u62e0\u70b9\u3092\u7f6e\u304f\u30b3\u30eb\u30de\u30b9\u30fb\u30f4\u30a7\u30eb\u30c3\u30b3\u306f{{\u8a55\u4fa1\u984d\u56db\u5104\u30e6\u30fc\u30ed\u3068\u306a\u3063\u305f|\u81ea\u793e\u306e\u516d\u30d1\u30fc\u30bb\u30f3\u30c8\u3092\u4e8c\u5343\u56db\u767e\u4e07\u3067\u58f2\u308a\u3001\u639b\u3051\u7b97\u3059\u308b\u3068\u56db\u5104\u306b\u306a\u308b}}\u3002{{\u56fd\u969b\u7684\u306a\u6295\u8cc7\u5bb6|\u4e8c\u3064\u306e\u30d5\u30a1\u30f3\u30c9\u3002\u3046\u3061\u4e00\u793e\u306f\u524d\u56de\u306e\u30e9\u30a6\u30f3\u30c9\u3082\u4e3b\u5c0e\u3057\u3066\u3044\u308b}}\u304c\u4e3b\u5c0e\u3057\u305f\u30e9\u30a6\u30f3\u30c9\u306e\u5f8c\u306e\u3053\u3068\u3060\u3002',
      '\u540c\u793e\u306f{{\u6025\u901f\u306b\u30b9\u30b1\u30fc\u30eb\u3057\u3066\u3044\u308b|\u5f93\u696d\u54e1\u306f\u5341\u4e5d\u4eba}}\u3068\u3057\u3001{{\u4eba\u54e1\u3092\u4e09\u500d\u306b\u3059\u308b\u8a08\u753b|\u6b21\u306e\u30e9\u30a6\u30f3\u30c9\u3092\u6761\u4ef6\u306b\u3001\u305d\u306e\u4e88\u7b97\u3060\u3051\u306f\u53d6\u3063\u3066\u3042\u308b}}\u3060\u3068\u3044\u3046\u3002',
    ],
    technique: '\u6570\u5b57\u3068\u3044\u3046\u96f0\u56f2\u6c17',
    decodeNote: '\u8a55\u4fa1\u984d\u306f\u5efa\u7269\u306e\u306a\u304b\u306b\u3042\u308b\u91d1\u3067\u306f\u306a\u3044\u3002\u6700\u5f8c\u306b\u58f2\u308c\u305f\u5c0f\u3055\u306a\u4e00\u7247\u306e\u5024\u6bb5\u306b\u3001\u5168\u4f53\u3092\u639b\u3051\u305f\u3082\u306e\u3060\u3002\u305d\u308c\u304c\u898b\u51fa\u3057\u306b\u6765\u308b\u306e\u306f\u624b\u306b\u5165\u308b\u306a\u304b\u3067\u4e00\u756a\u5927\u304d\u3044\u6570\u5b57\u3060\u304b\u3089\u3067\u3001\u305d\u306e\u4f1a\u793e\u304c\u6a5f\u80fd\u3057\u3066\u3044\u308b\u304b\u3069\u3046\u304b\u3068\u306f\u6700\u3082\u7e01\u306e\u9060\u3044\u6570\u5b57\u3067\u3082\u3042\u308b\u3002',
    tell: '\u5b9f\u969b\u306b\u3044\u304f\u3089\u6255\u308f\u308c\u3001\u305d\u306e\u4f55\u30d1\u30fc\u30bb\u30f3\u30c8\u5206\u3060\u3063\u305f\u306e\u304b\u3092\u8a0a\u304f\u3002',
  },
  'seabed': {
    slug: '\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u6e7e',
    head: '\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u6e7e\u3067\u4e09\u4ef6\u76ee\u306e\u6d77\u5e95\u30a4\u30f3\u30b7\u30c7\u30f3\u30c8',
    lines: [
      '\u6e7e\u306e\u6d77\u5e95\u3092\u901a\u308b\u30c7\u30fc\u30bf\u30b1\u30fc\u30d6\u30eb\u304c\u591c\u9593\u306b{{\u640d\u50b7\u3092\u53d7\u3051\u305f|\u5f15\u304d\u305a\u3089\u308c\u305f}}\u3002\u5f53\u5c40\u306f\u3053\u308c\u3092{{\u4eca\u5e74\u4e09\u4ef6\u76ee\u306e\u540c\u7a2e\u30a4\u30f3\u30b7\u30c7\u30f3\u30c8|\u8ab0\u3082\u53e3\u306b\u51fa\u3057\u3066\u5b9a\u7fa9\u3057\u3066\u3044\u306a\u3044\u7a2e\u985e\u306e\u3001\u4e09\u4ef6\u76ee\u306e\u51fa\u6765\u4e8b}}\u3068\u547c\u3093\u3067\u3044\u308b\u3002',
      '{{\u539f\u56e0\u306f\u8abf\u67fb\u4e2d|\u9328\u306e\u8de1\u306f\u64ae\u5f71\u3055\u308c\u3001\u8239\u540d\u3082\u3042\u308b\u5c4a\u51fa\u306b\u8a18\u8f09\u3055\u308c\u3066\u3044\u308b\u304c\u3001\u8ab0\u3082\u305d\u308c\u3092\u8aad\u307f\u4e0a\u3052\u3066\u3044\u306a\u3044}}\u3002\u5f53\u5c40\u306f{{\u5916\u90e8\u306e\u95a2\u4e0e\u3092\u6392\u9664\u3057\u3066\u3044\u306a\u3044|\u5168\u54e1\u304c\u8003\u3048\u3066\u3044\u308b\u305d\u306e\u8a00\u8449\u3092\u53e3\u306b\u3057\u3066\u3044\u306a\u3044}}\u3068\u3057\u3001{{\u51b7\u9759\u306a\u5bfe\u5fdc\u3092\u547c\u3073\u304b\u3051\u3066\u3044\u308b|\u8a71\u304c\u3053\u3053\u3067\u7d42\u308f\u308b\u3053\u3068\u3092\u671b\u3093\u3067\u3044\u308b}}\u3002',
    ],
    technique: '\u30ab\u30c6\u30b4\u30ea\u30fc\u306e\u6f02\u6d41',
    decodeNote: '\u4f3c\u3066\u3044\u306a\u3044\u4e09\u3064\u306e\u51fa\u6765\u4e8b\u306f\u3001\u8ab0\u304b\u304c\u305d\u308c\u3092\u300c\u30a4\u30f3\u30b7\u30c7\u30f3\u30c8\u300d\u3068\u547c\u3093\u3060\u77ac\u9593\u306b\u300c\u9023\u7d9a\u300d\u306b\u306a\u308b\u3002\u3053\u306e\u8a9e\u306f\u540c\u6642\u306b\u4e8c\u3064\u306e\u4ed5\u4e8b\u3092\u3057\u3066\u3044\u308b\u3002\u3072\u3068\u3064\u306b\u307e\u3068\u3081\u3066\u3088\u3044\u304b\u5206\u304b\u3089\u306a\u3044\u3082\u306e\u3092\u307e\u3068\u3081\u3001\u3057\u304b\u3082\u3069\u308c\u306b\u3064\u3044\u3066\u3082\u4f55\u3082\u8a3c\u660e\u3057\u306a\u304f\u3066\u6e08\u3080\u307b\u3069\u66d6\u6627\u306a\u307e\u307e\u3067\u3044\u308b\u3002\u307e\u3068\u3081\u65b9\u304c\u6b63\u3057\u3044\u3053\u3068\u3082\u3042\u308b\u3002\u305d\u308c\u3067\u3082\u6839\u62e0\u306f\u8981\u308b\u3002',
    tell: '\u300c\u4e09\u4ef6\u76ee\u306e\u540c\u7a2e\u30a4\u30f3\u30b7\u30c7\u30f3\u30c8\u300d\u2014\u2014\u540c\u7a2e\u3068\u306f\u3001\u4f55\u3068\u540c\u7a2e\u306a\u306e\u304b\u3002\u8a18\u4e8b\u306b\u305d\u308c\u3092\u8a00\u308f\u305b\u308b\u3002',
  },
  'interference': {
    slug: '\u6771\u5074\u9032\u5165\u7d4c\u8def',
    head: '\u6771\u5074\u9032\u5165\u7d4c\u8def\u3067\u6e2c\u4f4d\u969c\u5bb3',
    lines: [
      '\u6771\u5074\u9032\u5165\u7d4c\u8def\u306e\u822a\u7a7a\u6a5f\u3067{{\u6e2c\u4f4d\u969c\u5bb3\u304c\u767a\u751f\u3057\u3066\u3044\u308b|\u885b\u661f\u6e2c\u4f4d\u304c\u59a8\u5bb3\u3055\u308c\u3066\u3044\u308b}}\u72b6\u614b\u304c\u56db\u9031\u76ee\u306b\u5165\u3063\u305f\u3002{{\u5f53\u5c40\u306b\u8fd1\u3044\u7b4b\u306b\u3088\u308c\u3070|\u3042\u308b\u533f\u540d\u306e\u3072\u3068\u308a\u304c\u305d\u3046\u8a00\u3044\u3001\u3042\u3068\u306f\u5168\u54e1\u304c\u305d\u308c\u3092\u5237\u308a\u76f4\u3057\u305f}}\u3068\u3044\u3046\u3002',
      '\u969c\u5bb3\u306f\u5e83\u3044\u7bc4\u56f2\u3067{{\u78ba\u8a8d\u3055\u308c\u3066\u3044\u308b|\u8ab0\u306e\u4ed5\u696d\u306a\u306e\u304b\u3092\u3001\u8a18\u9332\u306b\u6b8b\u308b\u5f62\u3067\u8a00\u3046\u8005\u306f\u3044\u306a\u3044}}\u3002\u904b\u822a\u306f{{\u5e73\u5e38\u3069\u304a\u308a|\u8a08\u5668\u3067\u7740\u9678\u3057\u3066\u3044\u308b\u3002\u305d\u308c\u306f\u6b63\u5e38\u306a\u3053\u3068\u3067\u3042\u308a\u3001\u4f55\u3082\u8d77\u304d\u3066\u3044\u306a\u3044\u3053\u3068\u3068\u540c\u3058\u3067\u306f\u306a\u3044}}\u3060\u3068\u3044\u3046\u3002',
    ],
    technique: '\u533f\u540d\u306e\u6a29\u5a01',
    decodeNote: '\u300c\u301c\u306b\u8fd1\u3044\u7b4b\u300d\u306f\u672c\u7269\u306e\u3001\u305d\u3057\u3066\u6642\u306b\u5fc5\u8981\u306a\u624b\u6bb5\u3060\u3002\u4eba\u306f\u8a71\u3057\u305f\u305b\u3044\u3067\u8077\u3092\u5931\u3046\u3002\u3060\u304c\u305d\u308c\u306f\u540c\u6642\u306b\u3001\u3072\u3068\u3064\u306e\u30d6\u30ea\u30fc\u30d5\u30a3\u30f3\u30b0\u3092\u3001\u72ec\u7acb\u3057\u3066\u898b\u3048\u308b\u56db\u672c\u306e\u8a18\u4e8b\u306b\u5909\u3048\u3066\u3057\u307e\u3046\u3002\u554f\u3046\u3079\u304d\u306f\u300c\u672c\u5f53\u304b\u3069\u3046\u304b\u300d\u3060\u3051\u3067\u306f\u306a\u3044\u3002\u60c5\u5831\u6e90\u306f\u5b9f\u969b\u306b\u4f55\u4eba\u3044\u3066\u3001\u305d\u306e\u6f0f\u6d29\u3067\u5f97\u3092\u3059\u308b\u306e\u306f\u8ab0\u304b\u3001\u3067\u3042\u308b\u3002',
    tell: '\u56db\u793e\u3001\u533f\u540d\u306e\u60c5\u5831\u6e90\u3072\u3068\u3064\u2014\u2014\u305d\u308c\u306f\u5e3d\u5b50\u3092\u56db\u3064\u304b\u3076\u3063\u305f\u4e00\u672c\u306e\u8a18\u4e8b\u3060\u3002',
  },
  'synthetic-env': {
    slug: '\u30aa\u30bf\u30cb\u30a8\u30df',
    head: '\u30d8\u30eb\u30b7\u30f3\u30ad\u306e\u30a8\u30f3\u30b8\u30f3\u4eba\u6750\u3001\u5408\u6210\u74b0\u5883\u3078',
    lines: [
      '\u9996\u90fd\u570f\u306e\u30b9\u30bf\u30b8\u30aa\u304c{{\u5408\u6210\u74b0\u5883\u306e\u4ed5\u4e8b|\u8ecd\u4e8b\u30b7\u30df\u30e5\u30ec\u30fc\u30b7\u30e7\u30f3}}\u306b\u63a1\u7528\u3055\u308c\u3066\u3044\u308b\u3002{{\u6ca1\u5165\u578b\u8a13\u7df4\u30bd\u30ea\u30e5\u30fc\u30b7\u30e7\u30f3|\u5175\u58eb\u304c\u4e88\u884c\u3059\u308b\u5730\u5f62}}\u3092{{\u6a5f\u95a2\u9867\u5ba2|\u56fd\u9632\u7701}}\u5411\u3051\u306b\u4f5c\u308b\u4ed5\u4e8b\u3060\u3002',
      '\u3042\u308b\u30ea\u30af\u30eb\u30fc\u30bf\u30fc\u306f\u3001\u6280\u8853\u306e\u79fb\u8ee2\u306f{{\u81ea\u7136\u306a\u6d41\u308c|\u7d66\u4e0e\u304c\u304a\u3088\u305d\u4e09\u5272\u9ad8\u3044}}\u3060\u3068\u8a00\u3046\u3002\u540c\u3058\u30a8\u30f3\u30b8\u30f3\u3001\u540c\u3058\u5730\u5f62\u30b9\u30c8\u30ea\u30fc\u30df\u30f3\u30b0\u3001{{\u540c\u3058\u30ea\u30a2\u30ea\u30c6\u30a3\u3078\u306e\u3053\u3060\u308f\u308a|\u305d\u3057\u3066\u30ea\u30a2\u30ea\u30c6\u30a3\u306e\u5b9a\u7fa9\u304c\u30d7\u30ec\u30a4\u30e4\u30fc\u3068\u306f\u9055\u3046\u9867\u5ba2}}\u3002',
    ],
    technique: '\u5a49\u66f2\uff08\u8abf\u9054\u8a9e\uff09',
    decodeNote: '\u9632\u885b\u8abf\u9054\u306b\u306f\u56fa\u6709\u306e\u8a9e\u5f59\u304c\u3042\u308a\u3001\u305d\u308c\u306f\u5076\u7136\u3067\u306f\u306a\u3044\u3002\u300c\u5408\u6210\u74b0\u5883\u300d\u300c\u30a8\u30d5\u30a7\u30af\u30bf\u30fc\u300d\u300c\u30ad\u30cd\u30c6\u30a3\u30c3\u30af\u300d\u3002\u3069\u308c\u3082\u6280\u8853\u7684\u306b\u306f\u6b63\u78ba\u3067\u3001\u3069\u308c\u3082\u6587\u3092\u3001\u5730\u4e0a\u306b\u3044\u308b\u4eba\u9593\u304b\u3089\u4e00\u6b69\u305a\u3064\u9060\u3056\u3051\u308b\u3002\u3053\u308c\u306f\u30d8\u30eb\u30b7\u30f3\u30ad\u306b\u3068\u3063\u3066\u6700\u3082\u5b9f\u5728\u306b\u8fd1\u3044\u30c8\u30ec\u30f3\u30c9\u3067\u3001\u3060\u304b\u3089\u3053\u305d\u666e\u901a\u306e\u8a00\u8449\u3067\u898b\u3066\u304a\u304f\u5024\u6253\u3061\u304c\u3042\u308b\u3002',
    tell: '\u8abf\u9054\u8a9e\u3092\u3001\u305d\u308c\u304c\u4eba\u306e\u4f53\u306b\u4f55\u3092\u3059\u308b\u304b\u306b\u8a33\u3059\u3002\u5224\u65ad\u306f\u305d\u306e\u3042\u3068\u3067\u3002',
  },
  'amplification': {
    slug: '\u3053\u306e\u5468\u6ce2\u6570',
    head: '\u8b70\u8ad6\u306e\u5468\u8fba\u3067\u5354\u8abf\u7684\u306a\u5897\u5e45\u3092\u691c\u77e5',
    lines: [
      '{{\u6e2f\u6e7e\u5951\u7d04\u3092\u3081\u3050\u308b\u8b70\u8ad6|\u8b70\u8ad6\u3068\u3057\u3066\u67a0\u3065\u3051\u3089\u308c\u308b\u307e\u3067\u3001\u8ab0\u3082\u8b70\u8ad6\u3057\u3066\u3044\u306a\u304b\u3063\u305f\u554f\u3044}}\u306b\u4eca\u9031\u3001{{\u81ea\u7136\u767a\u751f\u7684\u306a\u30a8\u30f3\u30b2\u30fc\u30b8\u30e1\u30f3\u30c8\u306e\u9ad8\u307e\u308a|\u4e5d\u767e\u306e\u30a2\u30ab\u30a6\u30f3\u30c8\u3002\u3046\u3061\u56db\u767e\u306f\u958b\u8a2d\u304b\u3089\u4e00\u9031\u9593\u672a\u6e80}}\u304c\u96c6\u307e\u308a\u3001{{\u61f8\u5ff5\u3092\u547c\u3093\u3060|\u61f8\u5ff5\u3092\u76e3\u8996\u3059\u308b\u56e3\u4f53\u306e\u30d7\u30ec\u30b9\u30ea\u30ea\u30fc\u30b9\u3092\u751f\u3093\u3060}}\u3002',
      '\u30a2\u30ca\u30ea\u30b9\u30c8\u306f{{\u8996\u8074\u8005\u306f\u64cd\u4f5c\u306b\u8b66\u6212\u3059\u3079\u304d\u3060|\u3042\u306a\u305f\u306f\u3044\u307e\u3001\u3042\u308b\u4e00\u5c40\u304c\u4e00\u65e5\u306e\u51fa\u6765\u4e8b\u304b\u3089\u9078\u3093\u3060\u3082\u306e\u3092\u3001\u30de\u30a4\u30af\u306e\u524d\u306e\u30bc\u30ea\u30fc\u306e\u58f0\u3067\u805e\u3044\u3066\u3044\u308b}}\u3068\u8b66\u544a\u3059\u308b\u3002',
    ],
    technique: '\u5148\u56de\u308a\u306e\u30d5\u30ec\u30fc\u30e0',
    decodeNote: '\u6700\u3082\u52b9\u304f\u306e\u306f\u672c\u6587\u306e\u5618\u3067\u306f\u306a\u304f\u3001\u305d\u306e\u624b\u524d\u306b\u7f6e\u304b\u308c\u305f\u524d\u63d0\u3060\u3002\u4f55\u304b\u3092\u300c\u8b70\u8ad6\u300d\u3068\u547c\u3079\u3070\u8b70\u8ad6\u306f\u5b9f\u5728\u3057\u3066\u3057\u307e\u3044\u3001\u8cdb\u5426\u306e\u4e21\u65b9\u304c\u3001\u305d\u308c\u3092\u540d\u3065\u3051\u305f\u8005\u306e\u624b\u306b\u6e21\u308b\u3002\u305d\u3057\u3066\u2014\u2014\u3053\u306e\u653e\u9001\u3082\u4e00\u65e5\u304b\u3089\u4f55\u672c\u304b\u3092\u9078\u3073\u3001\u3042\u308b\u9806\u756a\u3067\u8aad\u3093\u3067\u3044\u308b\u3002\u305d\u308c\u3082\u30d5\u30ec\u30fc\u30e0\u3060\u3002\u305d\u308c\u304c\u3053\u306e\u5c40\u306e\u6700\u5f8c\u306e\u8a71\u3067\u3042\u308a\u3001\u3044\u3061\u3070\u3093\u5f79\u306b\u7acb\u3064\u8a71\u3067\u3082\u3042\u308b\u3002',
    tell: '\u3053\u308c\u304c\u554f\u3044\u3060\u3068\u8ab0\u304c\u6c7a\u3081\u305f\u306e\u304b\u3092\u8a0a\u304f\u3002\u3053\u3053\u306b\u3064\u3044\u3066\u3082\u3002',
  },
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
  'surprise-bundle': {
    slug: '\u30eb\u30aa\u30db\u30e9\u30cf\u30c6\u30a3',
    head: '\u30eb\u30df\u30da\u30ea\u3001\u30b7\u30fc\u30ba\u30f3\u30fb\u30bc\u30ed\u304b\u3089\u30eb\u30fc\u30c8\u30dc\u30c3\u30af\u30b9\u3092\u64a4\u53bb',
    lines: [
      '\u30eb\u30df\u30da\u30ea\u306f\u30b7\u30fc\u30ba\u30f3\u30fb\u30bc\u30ed\u304b\u3089\u30eb\u30fc\u30c8\u30dc\u30c3\u30af\u30b9\u3092{{\u64a4\u53bb\u3057\u305f|\u540d\u524d\u3092\u5909\u3048\u305f}}\u3068\u767a\u8868\u3057\u3001\u4ee3\u308f\u308a\u306b\u30b9\u30bf\u30b8\u30aa\u304c{{\u30b5\u30d7\u30e9\u30a4\u30ba\u5831\u916c\u30d1\u30c3\u30af|\u30eb\u30fc\u30c8\u30dc\u30c3\u30af\u30b9}}\u3068\u547c\u3076\u3082\u306e\u3092\u5c0e\u5165\u3057\u305f\u3002\u5909\u66f4\u306f{{\u30d7\u30ec\u30a4\u30e4\u30fc\u306e\u58f0\u3092\u53d7\u3051\u305f\u3082\u306e|\u4e8c\u3064\u306e\u5e02\u5834\u3067\u5be9\u8b70\u4e2d\u306e\u6cd5\u6848\u3092\u53d7\u3051\u305f\u3082\u306e}}\u3060\u3068\u3044\u3046\u3002',
      '\u30b9\u30bf\u30b8\u30aa\u306b\u3088\u308c\u3070\u65b0\u3057\u3044\u30d1\u30c3\u30af\u306f{{\u30d7\u30ec\u30a4\u30e4\u30fc\u306b\u4e3b\u5c0e\u6a29\u3092\u6e21\u3059|4.99\u3067\u3001\u540c\u3058\u54c1\u3092\u540c\u3058\u78ba\u7387\u3067\u542b\u3080}}\u3082\u306e\u3067\u3042\u308a\u3001{{\u3053\u306e\u5206\u91ce\u3067\u5148\u982d\u306b\u7acb\u3066\u305f\u3053\u3068\u3092\u8a87\u308a\u306b\u601d\u3046|\u6700\u521d\u306b\u554f\u308f\u308c\u305f\u5074\u306b\u306a\u3063\u305f}}\u3068\u3057\u3066\u3044\u308b\u3002',
    ],
    technique: '\u6539\u540d\u3068\u3044\u3046\u6539\u9769',
    decodeNote: '\u64a4\u53bb\u3055\u308c\u305f\u306e\u306f\u4ed5\u7d44\u307f\u3067\u306f\u306a\u304f\u540d\u8a5e\u3072\u3068\u3064\u3060\u3002\u7f6e\u304d\u63db\u3048\u305f\u306f\u305a\u306e\u3082\u306e\u306e\u8a9e\u5f59\u3060\u3051\u3067\u8a9e\u3089\u308c\u308b\u6539\u9769\u306b\u6c17\u3092\u3064\u3051\u305f\u3044\u2014\u2014\u4ed5\u639b\u3051\u3082\u4fa1\u683c\u3082\u78ba\u7387\u3082\u6587\u306e\u306a\u304b\u3092\u7121\u50b7\u3067\u901a\u308a\u629c\u3051\u3001\u6e2c\u308c\u308b\u5909\u5316\u306f\u547c\u3073\u540d\u3060\u3051\u3002\u65e5\u672c\u8a9e\u3067\u306f\u30ab\u30bf\u30ab\u30ca\u306b\u7f6e\u304d\u63db\u3048\u308b\u3060\u3051\u3067\u65b0\u3057\u3055\u306e\u898b\u305f\u76ee\u304c\u51fa\u308b\u306e\u3067\u3001\u3053\u306e\u624b\u306f\u3044\u3063\u305d\u3046\u5b89\u304f\u6e08\u3080\u3002\u56f3\u306f\u540c\u3058\u7bb1\u3092\u4e8c\u5ea6\u6620\u3057\u3066\u3044\u308b\u3002\u300c\u30d7\u30ec\u30a4\u30e4\u30fc\u306e\u58f0\u3092\u53d7\u3051\u305f\u300d\u3082\u5225\u306e\u4ed5\u4e8b\u3092\u3057\u3066\u3044\u3066\u3001\u6c7a\u5b9a\u306e\u65e5\u4ed8\u3092\u6cd5\u6848\u3067\u306f\u306a\u304f\u82e6\u60c5\u306e\u307b\u3046\u306b\u5bc4\u305b\u3001\u30b9\u30bf\u30b8\u30aa\u304c\u81ea\u5206\u3067\u9078\u3093\u3060\u3053\u3068\u306b\u3057\u3066\u3044\u308b\u3002',
    tell: '\u5148\u9031\u3067\u304d\u306a\u304b\u3063\u305f\u4f55\u304c\u3001\u4eca\u9031\u304b\u3089\u5ba2\u306b\u3067\u304d\u308b\u3088\u3046\u306b\u306a\u3063\u305f\u306e\u304b\u3092\u8a0a\u304f\u3002\u7b54\u3048\u304c\u300c\u9055\u3046\u5358\u8a9e\u3092\u8aad\u3080\u3053\u3068\u300d\u306a\u3089\u3001\u6539\u9769\u3055\u308c\u305f\u3082\u306e\u306f\u306a\u3044\u3002',
  },
  'up-to-ten': {
    slug: '\u30d4\u30bf\u30e4\u30f3\u30de\u30ad',
    head: '\u30f4\u30a7\u30eb\u30c3\u30b3\u30f4\u30a9\u30a4\u30de\u3001\u5bb6\u5ead\u5411\u3051\u306b\u6700\u592710\u30ae\u30ac\u306e\u56de\u7dda',
    lines: [
      '\u30f4\u30a7\u30eb\u30c3\u30b3\u30f4\u30a9\u30a4\u30de\u304c\u5bb6\u5ead\u5411\u3051\u56de\u7dda\u3092\u958b\u59cb\u3057\u305f\u3002\u901f\u5ea6\u306f{{\u6700\u592710\u30ae\u30ac\u30d3\u30c3\u30c8|\u4ea4\u63db\u5c40\u306e\u5efa\u7269\u306e\u4e2d\u3067\u3001\u5348\u524d\u56db\u6642\u306b\u3001\u4e00\u5ea6\u3060\u3051\u51fa\u305f\u6570\u5b57}}\u3067\u3001\u540c\u793e\u306b\u3088\u308c\u3070\u3053\u308c\u306f{{\u56fd\u5185\u6700\u901f\u306e\u63a5\u7d9a|\u30d5\u30a3\u30f3\u30e9\u30f3\u30c9\u306e\u5e83\u544a\u306b\u5370\u5237\u3055\u308c\u305f\u6570\u5b57\u3068\u3057\u3066\u306f\u6700\u5927}}\u3060\u3068\u3044\u3046\u3002',
      '\u540c\u793e\u306f{{\u3053\u308c\u307e\u3067\u306b\u306a\u3044\u4f53\u9a13\u304c\u671f\u5f85\u3067\u304d\u308b|\u81ea\u793e\u304c\u6e2c\u3063\u305f\u56de\u7dda\u306e\u4e2d\u592e\u5024\u306f1.4\u3060\u3063\u305f}}\u3068\u3057\u3001{{\u901f\u5ea6\u306f\u5efa\u7269\u306b\u3088\u308a\u5909\u52d5\u3059\u308b\u5834\u5408\u304c\u3042\u308b|\u5e83\u544a\u306e\u6570\u5b57\u306f\u3001\u4f4f\u4eba\u306e\u3044\u306a\u3044\u5efa\u7269\u3067\u6e2c\u3089\u308c\u305f}}\u3068\u8ff0\u3079\u305f\u3002',
    ],
    technique: '\u4e0a\u9650\u3060\u3051\u306e\u5e45',
    decodeNote: '\u300c\u6700\u5927\u300d\u306b\u4e0b\u9650\u306f\u306a\u3044\u3002\u5929\u4e95\u306e\u6570\u5b57\u3060\u3051\u3092\u793a\u3057\u3001\u3075\u3064\u3046\u306f\u3069\u306e\u304f\u3089\u3044\u304b\u306f\u8aad\u307f\u624b\u306b\u57cb\u3081\u3055\u305b\u308b\u2014\u2014\u6587\u304c\u9ed9\u3063\u3066\u6e21\u3057\u305f\u4ed5\u4e8b\u3060\u3002\u3053\u306e\u6587\u304c\u672c\u5f53\u306b\u7d04\u675f\u3057\u3066\u3044\u308b\u6570\u5b57\u306f\u30bc\u30ed\u3072\u3068\u3064\u3060\u3051\u3002\u65e5\u672c\u8a9e\u3067\u306f\u6570\u5b57\u306e\u524d\u306b\u4e8c\u5b57\u3092\u7f6e\u304f\u3060\u3051\u3067\u6e08\u3080\u3076\u3093\u3001\u3044\u3063\u305d\u3046\u8efd\u304f\u901a\u308a\u904e\u304e\u3066\u3044\u304f\u3002\u56f3\u306f\u540c\u3058\u6e2c\u5b9a\u7d50\u679c\u3092\u4e8c\u5ea6\u898b\u305b\u3066\u3044\u308b\u3002\u89e3\u304f\u3068\u67f1\u306f\u4e2d\u592e\u5024\u307e\u3067\u5d29\u308c\u3001\u6e2c\u5b9a\u5024\u306f\u305d\u308c\u305e\u308c\u843d\u3061\u305f\u5834\u6240\u306b\u6563\u3089\u3070\u308a\u3001\u3044\u3061\u3070\u3093\u4e0a\u306e\u5b64\u7acb\u3057\u305f\u70b9\u3060\u3051\u304c\u4e38\u3067\u56f2\u307e\u308c\u308b\u2014\u2014\u305d\u306e\u5e83\u544a\u3092\u5408\u6cd5\u306b\u3057\u305f\u4e00\u70b9\u3060\u3002',
    tell: '\u300c\u6700\u4f4e\u30bc\u30ed\u3001\u6700\u9ad8\u3067\u300d\u3068\u8aad\u307f\u66ff\u3048\u3066\u307f\u308b\u3002\u305d\u308c\u3067\u3082\u58f2\u308a\u6587\u53e5\u306b\u805e\u3053\u3048\u308b\u306a\u3089\u3001\u58f2\u308a\u6587\u53e5\u3067\u306f\u306a\u304b\u3063\u305f\u3002',
  },
  'no-comment': {
    slug: '\u30ab\u30bf\u30e4\u30ce\u30c3\u30ab',
    head: '\u7701\u3001\u65b0\u305f\u306a\u508d\u53d7\u80fd\u529b\u3092\u3081\u3050\u308b\u5831\u9053\u306b\u5fdc\u3058\u308b',
    lines: [
      '\u65b0\u305f\u306a\u508d\u53d7\u80fd\u529b\u306b\u3064\u3044\u3066\u306e\u5831\u9053\u3092\u554f\u308f\u308c\u3001\u7701\u306f{{\u4fdd\u6709\u3057\u3066\u3044\u306a\u3044\u80fd\u529b\u306b\u3064\u3044\u3066\u306f\u8ad6\u8a55\u3057\u306a\u3044|\u4fdd\u6709\u3057\u3066\u3044\u306a\u3044\u3068\u306f\u8a00\u3063\u3066\u3044\u306a\u3044}}\u3068\u3057\u3001{{\u5831\u9053\u306f\u61b6\u6e2c\u3067\u3042\u308b|\u5831\u9053\u306f\u3001\u7701\u304c\u3042\u3048\u3066\u89e6\u308c\u306a\u304b\u3063\u305f\u3059\u3079\u3066\u306e\u70b9\u3067\u6b63\u3057\u3044}}\u3068\u8ff0\u3079\u305f\u3002',
      '\u5831\u9053\u5b98\u306f\u3055\u3089\u306b\u3001{{\u8a18\u8ff0\u3055\u308c\u305f\u304b\u305f\u3061\u3067\u306e\u8a08\u753b\u306f\u627f\u8a8d\u3055\u308c\u3066\u3044\u306a\u3044|\u8a18\u8ff0\u3055\u308c\u305f\u304b\u305f\u3061\u304c\u3001\u305d\u306e\u304b\u305f\u3061\u3067\u306f\u306a\u3044}}\u3068\u3057\u3001{{\u73fe\u6642\u70b9\u3067\u4ed8\u3051\u52a0\u3048\u308b\u3053\u3068\u306f\u306a\u3044|\u4ed8\u3051\u52a0\u3048\u308b\u3053\u3068\u306f\u4e09\u3064\u3042\u308a\u3001\u305d\u308c\u306f\u5341\u6708\u306b\u306a\u308b}}\u3068\u8a9e\u3063\u305f\u3002',
    ],
    technique: '\u5426\u5b9a\u3057\u306a\u3044\u5426\u5b9a',
    decodeNote: '\u3069\u306e\u7bc0\u3082\u771f\u3067\u3001\u3069\u308c\u3072\u3068\u3064\u5426\u5b9a\u3067\u306f\u306a\u3044\u3002\u300c\u4fdd\u6709\u3057\u3066\u3044\u306a\u3044\u80fd\u529b\u306b\u3064\u3044\u3066\u306f\u8ad6\u8a55\u3057\u306a\u3044\u300d\u306f\u65b9\u91dd\u306e\u8a71\u304c\u4e8b\u5b9f\u306e\u8a71\u306e\u670d\u3092\u7740\u305f\u3082\u306e\u3067\u3001\u300c\u8a18\u8ff0\u3055\u308c\u305f\u304b\u305f\u3061\u3067\u306f\u300d\u306f\u5426\u5b9a\u306e\u77db\u5148\u3092\u4e2d\u8eab\u304b\u3089\u8a18\u8ff0\u306e\u307b\u3046\u3078\u79fb\u3057\u3066\u3044\u308b\u3002\u65e5\u672c\u8a9e\u3067\u306f\u5426\u5b9a\u304c\u6587\u672b\u306b\u6765\u308b\u3076\u3093\u3001\u805e\u304d\u624b\u306f\u6700\u5f8c\u307e\u3067\u5f85\u305f\u3055\u308c\u3001\u5f85\u3063\u305f\u5148\u3067\u5426\u5b9a\u3055\u308c\u305f\u306e\u304c\u4f55\u3060\u3063\u305f\u306e\u304b\u3092\u78ba\u304b\u3081\u308b\u4f59\u88d5\u304c\u306a\u3044\u3002\u56f3\u306e\u5426\u5b9a\u3092\u6570\u3048\u3066\u307b\u3057\u3044\u2014\u2014\u516d\u884c\u306e\u58f0\u660e\u304c\u9000\u3051\u305f\u4e3b\u5f35\u306f\u3001\u30bc\u30ed\u3060\u3002',
    tell: '\u5426\u5b9a\u3057\u3066\u307b\u3057\u304b\u3063\u305f\u4e00\u6587\u3092\u305d\u306e\u307e\u307e\u66f8\u304d\u51fa\u3057\u3001\u3069\u308c\u304b\u306e\u300c\u301c\u306a\u3044\u300d\u306e\u4e2d\u306b\u4e00\u8a9e\u4e00\u53e5\u305d\u306e\u307e\u307e\u5165\u3063\u3066\u3044\u308b\u304b\u63a2\u3059\u3002\u7121\u3051\u308c\u3070\u3001\u5426\u5b9a\u3055\u308c\u3066\u3044\u306a\u3044\u3002',
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

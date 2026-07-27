// Radio Free Helsinki — the day's wire, in fi / en / ja.
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
//
// The three languages are NOT translations of each other's tricks. Each one
// spins the story the way that language really does it — Finnish reaches for
// the passiivi, Japanese for 〜される and the polite noun — so the technique on
// display is the one a reader of that language would actually meet.
//
// visual = graphics panel (20% of cuts); broll = Helsinki footage (50%).
// Face shots (30%) are handled in codec.js.

export const SECTORS = [
  { id: 'GAMING',   freq: '87.60',  call: 'KAIKU' },
  { id: 'INDUSTRY', freq: '104.40', call: 'VERKKO' },
  { id: 'DEFENCE',  freq: '141.12', call: 'VARTIO' },
];

// structure only — every word of these lives in the language blocks below
export const STORIES = [
  { id: 'kaiku-restructure',   sector: 'GAMING',   visual: 'chart',   broll: 'kamppi' },
  { id: 'season-zero',         sector: 'GAMING',   visual: 'chart2',  broll: 'kamppi' },
  { id: 'foundry-deal',        sector: 'GAMING',   visual: 'mesh',    broll: 'kamppi' },
  { id: 'summit-consensus',    sector: 'GAMING',   visual: 'crowd',   broll: 'esplanadi' },
  { id: 'heat-recovery',       sector: 'INDUSTRY', visual: 'heat',    broll: 'harbour' },
  { id: 'vuosaari-automation', sector: 'INDUSTRY', visual: 'crane',   broll: 'harbour' },
  { id: 'sixth-generation',    sector: 'INDUSTRY', visual: 'tower',   broll: 'esplanadi' },
  { id: 'round-b',             sector: 'INDUSTRY', visual: 'coin',    broll: 'kamppi' },
  { id: 'seabed',              sector: 'DEFENCE',  visual: 'sea',     broll: 'gulf' },
  { id: 'interference',        sector: 'DEFENCE',  visual: 'sat',     broll: 'gulf' },
  { id: 'synthetic-env',       sector: 'DEFENCE',  visual: 'engine',  broll: 'esplanadi' },
  { id: 'amplification',       sector: 'DEFENCE',  visual: 'crowd2',  broll: 'kamppi' },
  { id: 'border-lab',          sector: 'DEFENCE',  visual: 'border',  broll: 'esplanadi' },
];

// ── English ────────────────────────────────────────────────────────
const EN = {
  'border-lab': {
    slug: 'THE EASTERN BORDER',
    head: 'Border tech could make the capital the alliance’s proving ground',
    lines: [
      'Studios in the capital region {{could see|nobody has said they will see}} a wave of alliance-linked simulation contracts, in what one analysis {{describes as|was commissioned to describe as}} a shift from entertainment to defence work.',
      'The eastern border, meanwhile, {{is emerging as ground zero|was called that once, in one briefing, by someone not named}} for counter-drone and cyber operations, and studios here {{may find themselves choosing a side|are being sold a reason to choose one}}. {{The possibility cannot be ruled out|Nothing in this bulletin has been ruled in}}.',
    ],
    technique: 'SPECULATION AS REPORTING',
    decodeNote: 'Count the hedges: could, describes as, is emerging, may, cannot be ruled out. Not one of them claims anything, and together they build a whole theatre of conflict you will remember afterwards as something that was reported. The work is done by the *shape* of the sentence — subject, verb, consequence — while every verb stays conditional. It is the standard grammar of a defence-procurement story, and it is also how a real risk and an imagined one are made to look identical on the page.',
    tell: 'Strike every modal — could, may, might, is emerging, cannot be ruled out — and read what is left. If nothing is left, nothing was reported.',
  },
  'kaiku-restructure': {
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
  'season-zero': {
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
  'foundry-deal': {
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
  'summit-consensus': {
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
  'heat-recovery': {
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
  'vuosaari-automation': {
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
  'sixth-generation': {
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
  'round-b': {
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
  'seabed': {
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
  'interference': {
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
  'synthetic-env': {
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
  'amplification': {
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
};

// ── Suomi ──────────────────────────────────────────────────────────
// Finnish has a real agentless passive (tehtiin, oli kohteena), so the
// bulletins lean on it exactly where an institution would.
const FI = {
  'border-lab': {
    slug: 'ITÄRAJA',
    head: 'Rajateknologia voisi tehdä pääkaupungista liittokunnan koekentän',
    lines: [
      'Pääkaupunkiseudun studiot {{voisivat saada|kukaan ei ole sanonut että saavat}} aallon liittokuntaan kytkeytyviä simulaatiosopimuksia, siinä mitä eräs analyysi {{kuvaa|tilattiin kuvaamaan}} siirtymäksi viihteestä puolustustyöhön.',
      'Itäraja puolestaan {{on nousemassa nollapisteeksi|sitä kutsuttiin siksi kerran, yhdessä taustatilaisuudessa, nimeltä mainitsemattoman ihmisen suulla}} drooni- ja kybertoiminnassa, ja täkäläiset studiot {{saattavat joutua valitsemaan puolensa|saavat myytynä syyn valita}}. {{Mahdollisuutta ei voida sulkea pois|Mitään tässä tiedotteessa ei ole suljettu sisään}}.',
    ],
    technique: 'SPEKULAATIO UUTISENA',
    decodeNote: 'Laske varaukset: voisivat, kuvaa, on nousemassa, saattavat, ei voida sulkea pois. Yksikään niistä ei väitä mitään, ja yhdessä ne rakentavat kokonaisen konfliktinäyttämön, jonka muistat jälkeenpäin uutisoituna. Työn tekee lauseen *muoto* — tekijä, teko, seuraus — samalla kun jokainen verbi pysyy ehdollisena. Tämä on puolustushankintajutun vakiokielioppi, ja juuri näin todellinen riski ja kuviteltu riski saadaan näyttämään paperilla samalta.',
    tell: 'Poista jokainen ehtoverbi — voisi, saattaa, on nousemassa, ei voida sulkea pois — ja lue mitä jää. Jos mitään ei jää, mitään ei uutisoitu.',
  },
  'kaiku-restructure': {
    slug: 'KAMPPI',
    head: 'Kaiku Interactive ilmoittaa studion uudelleenjärjestelystä',
    lines: [
      'Kaiku Interactive on vahvistanut Kampin studionsa uudelleenjärjestelyn ennen syksyn julkaisuja. {{Yhdeksänkymmentäkaksi tehtävää oli sopeutusten kohteena|Hallitus päätti irtisanoa yhdeksänkymmentäkaksi ihmistä}}, ja yhtiö kuvaa ratkaisua {{vaikeaksi mutta välttämättömäksi askeleeksi|tavaksi suojata tämän vuosineljänneksen kate}}.',
      'Tiedotteessaan studio kertoo, että {{päätöstä ei tehty kevyin perustein|kukaan ei ole kertonut kuka päätöksen teki}} ja että {{muutoksen kohteena olevia tuetaan siirtymässä|irtisanotut saavat kahdeksan viikkoa ja tunnukset suljetaan puoleltapäivin}}.',
    ],
    technique: 'AGENTITON PASSIIVI',
    decodeNote: 'Tehtäviä oli sopeutusten kohteena. Kenen toimesta? Lauseessa ei ole tekijää, joten kukaan siinä ei joudu vastaamaan lopputuloksesta. Suomen passiivi on tähän erityisen kätevä: se kertoo että jotain tehtiin, muttei koskaan kuka teki.',
    tell: 'Jos et saa lauseesta vastausta kysymykseen "kuka tämän teki?", juuri se oli lauseen tehtävä.',
  },
  'season-zero': {
    slug: 'SUVILAHTI',
    head: 'Season Zero rikkoo Lumipelin sitoutumisennätykset',
    lines: [
      'Lumipeli kertoo, että sen live-pelin Season Zeron {{sitoutuminen on noussut neljäkymmentä prosenttia|luku on neljäkymmentä prosenttia parempi kuin pelin kaikkien aikojen huonoimpana kuukautena}} kesäpäivityksen jälkeen. Studio kutsuu lukua {{ennennäkemättömäksi|eikä vertaa sitä mihinkään julkaisussaan}}.',
      'Julkaisija lisää, että {{pelaajat viettävät maailmassa enemmän aikaa kuin koskaan|päivittäisen kirjautumispalkkion kerääminen kestää nyt yksitoista minuuttia}} ja että toinen kausi on {{aktiivisessa kehityksessä|julkistettu}}.',
    ],
    technique: 'NIMITTÄJÄ PUUTTUU',
    decodeNote: 'Neljäkymmentä prosenttia mistä, ja mistä hetkestä mitattuna? Prosentti ilman vertailukohtaa ei ole mittaus vaan tunnelma. Oikealla oleva kuvaaja on sama data niin, että akseli alkaa nollasta eikä notkahduksen pohjalta — pura se, niin vuori muuttuu töyssyksi.',
    tell: 'Jokaisella prosentilla on nimittäjä. Jos sitä ei kerrota, se ei ollut imarteleva.',
  },
  'foundry-deal': {
    slug: 'PASILA',
    head: 'Vantaa Foundry yhdistää voimansa Northline Groupin kanssa',
    lines: [
      'Vantaa Foundry {{yhdistää voimansa|on ostettu kokonaan}} Northline Groupin kanssa, ja molemmat osapuolet kuvaavat kauppaa {{tasavertaisten kumppanuudeksi|toisen ostoksi toisesta}}. Studio {{säilyttää luovan itsenäisyytensä|on sidottu kahden vuoden lisäkauppahintaan}}.',
      'Northlinen mukaan helsinkiläistiimi {{tuo konserniin maailmanluokan osaamista|tuo mukanaan pelikatalogin ja neljäkymmentäyksi ihmistä, jotka osaavat saada pelin ulos}}, eikä {{muutoksia ole tässä vaiheessa suunnitteilla|lause on vakiofraasi ja vanhenee hiljaa}}.',
    ],
    technique: 'KIERTOILMAUS',
    decodeNote: '"Yhdistää voimansa" on fuusiosana, joka tekee yrityskaupan työtä. Tunnusmerkki on raha: tasavertaisten kumppanuuksiin ei liity lisäkauppahintaa, ja itsenäisyys joka pitää erikseen ilmoittaa on kaupan ehto eikä studiota koskeva tosiasia.',
    tell: 'Jos yhtiöt ovat tasavertaisia, kysy kumpi allekirjoitti shekin.',
  },
  'summit-consensus': {
    slug: 'MESSUKESKUS',
    head: 'Ala on yksimielinen: seuraava vuosikymmen kuuluu pysyville maailmoille',
    lines: [
      '{{Ala on saavuttanut yksimielisyyden|Neljä puhujaa yhdellä lavalla sanoi saman asian}} tämän viikon Northern Play -huippukokouksessa: seuraava vuosikymmen kuuluu pysyville, aina auki oleville maailmoille. {{Alan sisäpiirin mukaan|Kahden pysyvien maailmojen työkaluja myyvän ihmisen mukaan}} studiot jotka eivät sopeudu {{jäävät kelkasta|pärjäävät kyllä}}.',
      '{{Harva Helsingissä olisi eri mieltä|Keneltäkään huippukokouksessa ei kysytty, olisiko hän eri mieltä}}, vaikka paneeli {{tunnistikin pysyvyyteen liittyvät haasteet|sai yhden kysymyksen, lopussa, kolme minuuttia ennen loppua}}.',
    ],
    technique: 'VALMISTETTU YKSIMIELISYYS',
    decodeNote: 'Konferenssi on huone, jonka joku vuokrasi. "Ala on yksimielinen" tarkoittaa lähes aina, että lava oli yksimielinen — ja lavan varasivat ihmiset joilla on jotain myytävää. Katso kuka hyötyy, jos yksimielisyyteen uskotaan. Yleensä juuri häntä siteerataan.',
    tell: 'Laske lähteet. "Ala" on harvoin neljää enempää.',
  },
  'heat-recovery': {
    slug: 'SÖRNÄINEN',
    head: 'Sähkövirran konesali lämmittää kahdeksantuhatta kotia',
    lines: [
      'Sähkövirran uusi konesali Itä-Helsingissä {{palauttaa hukkalämpönsä kaukolämpöverkkoon|myy hukkalämpönsä kaukolämpöverkkoon}} ja lämmittää yhtiön mukaan {{kahdeksaatuhatta kotia vastaavan määrän|noin neljä prosenttia siitä mitä sali itse ottaa}}.',
      'Operaattori kutsuu kohdetta {{käytön aikana hiilinegatiiviseksi|hiilinegatiiviseksi sitten, kun lämmönmyynti vähennetään sen omasta jalanjäljestä}} ja kertoo {{olevansa ylpeä saadessaan olla mukana kaupungin ilmastotyössä|saaneensa verkkoliitynnän maaliskuussa}}.',
    ],
    technique: 'VALIKOITU VERTAILUTASO',
    decodeNote: 'Hukkalämmön talteenotto on aitoa ja oikeasti hyvä asia. Temppu on vähentää se hyvä osa omasta summasta ja kertoa jäännös koko tarinana: kodit nimetään, kuorma ei. Katso kumpi luku saa inhimillisen yksikön ("kotia") ja kumpi jää megawateiksi.',
    tell: 'Se ystävällinen yksikkö on juuri se, jonka he haluavat sinun toistavan.',
  },
  'vuosaari-automation': {
    slug: 'VUOSAARI',
    head: 'Satama aloittaa työvoiman muutosohjelman',
    lines: [
      'Vuosaaren konttiterminaali on aloittanut sen, mitä operaattori kutsuu {{työvoiman muutosohjelmaksi|nosturinkuljettajien korvaamiseksi etäohjaamoilla}}, {{neuvotteluvaiheen jälkeen|helmikuussa tehdyn ja heinäkuussa kerrotun päätöksen jälkeen}}.',
      'Operaattorin mukaan muutos {{tuo merkittäviä tehokkuushyötyjä|poistaa kaksi vuoroa}} ja {{muutoksen kohteena oleville tarjotaan uudelleenkoulutusmahdollisuuksia|tarjolla on trukkikurssi}}.',
    ],
    technique: 'SUBSTANTIVOINTI',
    decodeNote: 'Kun verbi muutetaan substantiiviksi, tekijä katoaa sen mukana. "Muutosohjelma", "neuvottelu", "uudelleenjärjestely" — jokainen oli teko jonka joku teki, pakattuna asiaksi joka vain on olemassa. Trukkikurssi on totta. Niin ovat ne kaksi vuoroa.',
    tell: 'Sanat jotka päättyvät -ointiin, -ukseen tai -ohjelmaan ovat yleensä verbejä, jotka joku halusi piilottaa.',
  },
  'sixth-generation': {
    slug: 'OTANIEMI',
    head: 'Selvitys: Suomi on Euroopan kärjessä seuraavan polven verkoissa',
    lines: [
      '{{Uusi selvitys osoittaa|Kolmen operaattorin tilaama selvitys, joka kehuu juuri niitä kolmea, osoittaa}}, että Suomi {{johtaa Eurooppaa|johtaa yhdentoista maan listaa, jonka selvitys itse valitsi}} seuraavan polven verkkojen valmiudessa, {{tutkijoiden mukaan|löydöksestä maksetun konsulttitalon mukaan}}.',
      'Raportti {{sai toimialajärjestöiltä lämpimän vastaanoton|kirjoitettiin niille}} ja {{sen odotetaan ohjaavan politiikkaa|sitä siteerataan lokakuussa rahoitushakemuksessa}}.',
    ],
    technique: 'LÄHTEEN PESU',
    decodeNote: 'Väite pestään instituution läpi, kunnes se tulee ulos löydöksenä. Ketju on: asianosainen maksaa konsultille, konsultti julkaisee, uutistoimisto uutisoi konsultin, kaikki muut uutisoivat uutistoimiston. Neljännessä vaiheessa raha on näkymätön ja väitteellä on lähdeviite.',
    tell: 'Seuraa "mukaan"-ketjua loppuun asti. Se joka on päässä, maksoi lauseesta.',
  },
  'round-b': {
    slug: 'KAMPPI',
    head: 'Kolmas Verkko arvostettiin neljäänsataan miljoonaan',
    lines: [
      'Kampin kampuksella toimiva Kolmas Verkko {{on nyt arvoltaan neljäsataa miljoonaa euroa|myi kuusi prosenttia itsestään kahdellakymmenelläneljällä miljoonalla, mikä kerrottuna tekee neljäsataa}} kierroksen jälkeen, jota johtivat {{kansainväliset sijoittajat|kaksi rahastoa, joista toinen johti myös edellistä kierrosta}}.',
      'Yhtiö {{skaalautuu nopeasti|työllistää yhdeksäntoista ihmistä}} ja {{aikoo kolminkertaistaa henkilöstönsä|on budjetoinut sen, ehdollisena seuraavalle kierrokselle}}.',
    ],
    technique: 'LUKU TUNNELMANA',
    decodeNote: 'Arvostus ei ole rahaa talossa. Se on viimeisimmän pienen siivun hinta kerrottuna kaikella. Se päätyy otsikkoon, koska se on suurin saatavilla oleva luku — ja se on juuri se luku, jolla on vähiten tekemistä sen kanssa, toimiiko yritys.',
    tell: 'Kysy mitä oikeasti maksettiin, ja kuinka suuresta osasta.',
  },
  'seabed': {
    slug: 'SUOMENLAHTI',
    head: 'Kolmas merenpohjan välikohtaus Suomenlahdella',
    lines: [
      'Lahden pohjassa kulkeva datakaapeli {{vaurioitui|raahattiin poikki}} yön aikana, ja viranomaiset kutsuvat tapausta {{kolmanneksi tämänvuotiseksi vastaavaksi välikohtaukseksi|kolmanneksi tapahtumaksi lajissa, jota kukaan ei ole ääneen määritellyt}}.',
      '{{Syy on yhä tutkinnassa|Ankkurin jälki valokuvattiin ja alus nimettiin asiakirjassa, jota kukaan ei ole lukenut ääneen}}. Viranomaiset {{eivät sulje pois ulkopuolista osallisuutta|eivät sano sitä sanaa, jota kaikki ajattelevat}} ja {{kehottavat rauhallisuuteen|toivovat että juttu päättyy tähän}}.',
    ],
    technique: 'LUOKAN LIUKUMA',
    decodeNote: 'Kolmesta erilaisesta tapahtumasta tulee sarja sillä hetkellä, kun joku kutsuu niitä välikohtauksiksi. Sana tekee kahta työtä kerralla: se niputtaa asioita jotka eivät ehkä kuulu yhteen, ja pysyy niin epämääräisenä, ettei mistään niistä tarvitse todistaa mitään. Joskus niputus on oikein. Se pitää silti ansaita.',
    tell: '"Kolmas vastaava välikohtaus" — vastaava mitä? Pakota juttu sanomaan se.',
  },
  'interference': {
    slug: 'ITÄINEN LÄHESTYMISALUE',
    head: 'Paikannushäiriöitä itäisellä lähestymisalueella',
    lines: [
      'Itäisen lähestymisalueen lentokoneissa on {{esiintynyt paikannushäiriöitä|häiritty satelliittipaikannusta}} neljättä viikkoa, {{viranomaista lähellä olevien lähteiden mukaan|yhden nimettömän ihmisen mukaan, ja kaikki muut painoivat sen uudelleen}}.',
      'Häiriötä {{on havaittu|kukaan ei kerro kenen aiheuttamaa, ainakaan nimellään}} laajalla alueella. Lennot {{liikennöivät normaalisti|laskeutuvat mittarien varassa, mikä on normaalia eikä ole sama asia kuin ettei mitään tapahtuisi}}.',
    ],
    technique: 'NIMETÖN AUKTORITEETTI',
    decodeNote: '"Lähellä olevat lähteet" on aito ja joskus välttämätön keino — ihmiset menettävät työpaikkoja puhumisesta. Mutta se antaa myös yhden taustatilaisuuden muuttua neljäksi itsenäiseltä näyttäväksi jutuksi. Kysymys ei ole vain onko se totta, vaan montako lähdettä oikeasti on ja kuka hyötyy vuodosta.',
    tell: 'Neljä mediaa ja yksi nimetön lähde on yksi juttu neljässä hatussa.',
  },
  'synthetic-env': {
    slug: 'OTANIEMI',
    head: 'Helsingin moottoriosaaminen siirtyy synteettisiin ympäristöihin',
    lines: [
      'Pääkaupunkiseudun studioita rekrytoidaan {{synteettisten ympäristöjen työhön|sotilassimulaatioihin}} rakentamaan {{immersiivisiä koulutusratkaisuja|maastoa, jossa sotilaat harjoittelevat}} {{institutionaalisille asiakkaille|puolustusministeriöille}}.',
      'Erään rekrytoijan mukaan osaaminen siirtyy {{luontevasti|noin kolmanneksen paremmalla palkalla}}: sama moottori, sama maaston virtaus, {{sama tarkkuus realismissa|ja asiakas joka määrittelee realismin toisin kuin pelaaja}}.',
    ],
    technique: 'KIERTOILMAUS (HANKINTAKIELI)',
    decodeNote: 'Puolustushankinnoilla on oma sanastonsa, eikä se ole sattumaa: "synteettinen ympäristö", "vaikuttaminen", "kineettinen". Jokainen termi on teknisesti täsmällinen ja jokainen siirtää lausetta askeleen kauemmas ihmisestä maastossa. Tämä on lähinnä aitoa trendiä mitä Helsingissä on, ja juuri siksi se kannattaa katsoa selkokielellä.',
    tell: 'Käännä hankintasana siksi, mitä se tekee keholle. Päätä vasta sitten.',
  },
  'amplification': {
    slug: 'TÄMÄ TAAJUUS',
    head: 'Koordinoitua vahvistusta havaittu keskustelun ympärillä',
    lines: [
      '{{Satamasopimusta koskeva keskustelu|Kysymys, josta ei keskusteltu ennen kuin se kehystettiin keskusteluksi}} keräsi {{aallon orgaanista sitoutumista|yhdeksänsataa tiliä, joista neljäsataa alle viikon ikäisiä}} tällä viikolla ja {{herätti huolta|tuotti tiedotteen ryhmältä, joka seuraa huolta}}.',
      'Analyytikot varoittavat, että {{yleisön tulisi olla valppaana manipulaation varalta|kuuntelet juuri nyt yhden aseman valikoimaa yhden päivän tapahtumista, luettuna hyytelön suulla mikrofonin ääressä}}.',
    ],
    technique: 'ENNAKOIVA KEHYS',
    decodeNote: 'Tehokkain temppu ei ole valhe tekstissä vaan oletus sen edessä. Kun jokin nimetään "keskusteluksi", keskustelusta tulee totta ja molemmat puolet siirtyvät sille joka sen nimesi. Ja kyllä: tämä lähetys poimii kaksitoista juttua yhdestä päivästä ja lukee ne tietyssä järjestyksessä. Sekin on kehys. Se on viimeinen asia jonka tämä asema kertoo sinulle, ja hyödyllisin.',
    tell: 'Kysy kuka päätti, että tämä on se kysymys. Myös tässä.',
  },
};

// ── 日本語 ─────────────────────────────────────────────────────────
// Japanese institutional writing hides the actor with 〜される and with polite
// nouns (再編、協議、対応), so that is what these bulletins reach for.
const JA = {
  'border-lab': {
    slug: '東の国境',
    head: '国境の技術が、首都を同盟の実験場に変えるかもしれない',
    lines: [
      '首都圏のスタジオに、同盟系のシミュレーション契約の波が{{来る可能性がある|来ると言った者はいない}}。ある分析はそれを、娯楽から防衛への移行だと{{評している|評するよう発注された}}。',
      '一方で東の国境は、対ドローンとサイバー作戦の{{グラウンド・ゼロになりつつある|そう呼ばれたのは一度、ある説明会で、名前の出ない誰かによってだった}}とされ、この地のスタジオも{{どちらかを選ぶことになるかもしれない|選ぶ理由を売り込まれている}}。{{可能性は排除できない|この速報で確定されたことは何もない}}。',
    ],
    technique: '推測という名の報道',
    decodeNote: '保険の言葉を数える。可能性がある、評している、なりつつある、かもしれない、排除できない。どれひとつ何も主張していないのに、合わさると 紛争の劇場がまるごと立ちあがり、あとになって「報じられた事実」として記憶に残る。効いているのは文の*かたち*——主語、動詞、帰結——で、動詞はすべて条件のままだ。これは防衛調達記事の標準文法であり、本物のリスクと想像上のリスクを紙の上で同じ顔に見せる方法でもある。',
    tell: '「かもしれない」「なりつつある」「排除できない」を全部消して、残ったものを読む。何も残らないなら、何も報じられていない。',
  },
  'kaiku-restructure': {
    slug: 'カンピ',
    head: 'カイク・インタラクティブ、スタジオ再編を発表',
    lines: [
      'カイク・インタラクティブは秋のラインナップを前に、カンピ・スタジオの再編を認めた。{{九十二のロールが影響を受けた|取締役会が九十二人を解雇すると決めた}}とされ、同社はこれを{{苦渋の、しかし必要な一歩|今期の利益率を守るための手段}}と説明している。',
      '声明でスタジオは{{決定は軽々に下されたものではない|誰が決定を下したのかは、誰も言っていない}}とし、{{影響を受けた方々には移行期の支援を行う|解雇された人には八週間が与えられ、アカウントは正午に止まる}}と述べた。',
    ],
    technique: '主語なき受動態',
    decodeNote: 'ロールが影響を受けた。誰によって？　この文には主語がなく、だから文中の誰も結果の責任を負わない。人員削減はビジネス文書のなかで最も確実に行為者が消える出来事で、物事はあたかもひとりでに人へ降りかかる。',
    tell: '「これを誰がやったのか」がその文から分からないなら、それこそがその文の仕事だった。',
  },
  'season-zero': {
    slug: 'スヴィラハティ',
    head: 'シーズン・ゼロ、ルミペリ史上最高のエンゲージメント',
    lines: [
      'ルミペリによれば、ライブタイトル『シーズン・ゼロ』は夏のパッチ以降{{エンゲージメントが四十パーセント上昇した|過去最悪の月と比べて四十パーセント多い}}。スタジオはこの数字を{{前例のないもの|作品内の何とも比較していない}}と呼ぶ。',
      'パブリッシャーは{{プレイヤーはかつてないほど長く世界に滞在している|デイリーログイン報酬の受け取りに十一分かかるようになった}}とし、第二シーズンは{{鋭意開発中|発表済み}}だと付け加えた。',
    ],
    technique: '分母の欠落',
    decodeNote: '何に対する四十パーセントで、いつを起点にした数字なのか。基準のない百分率は測定ではなく気分だ。右のグラフは同じデータを、落ち込みの底ではなくゼロから始めた軸で描いたもの——解読すれば、山はもとどおりの小さな盛り上がりに戻る。',
    tell: 'どんな百分率にも分母がある。記事に書かれていないなら、それは都合の悪い数字だった。',
  },
  'foundry-deal': {
    slug: 'パシラ',
    head: 'ヴァンター・ファウンドリー、ノースラインと手を組む',
    lines: [
      'ヴァンター・ファウンドリーはノースライン・グループと{{手を組む|完全に買収された}}。両社はこれを{{対等なパートナーシップ|一方が他方を買う取引}}と表現する。スタジオは{{クリエイティブの独立性を維持する|二年間のアーンアウト条項が付いている}}という。',
      'ノースラインはヘルシンキのチームが{{世界水準の技術をグループにもたらす|カタログと、ゲームを出し切れる四十一人を連れてくる}}とし、{{現時点で変更の予定はない|この言い回しは定型で、静かに期限切れになる}}と述べた。',
    ],
    technique: '婉曲表現',
    decodeNote: '「手を組む」は合併の語彙で買収の仕事をしている。見分けるのは金だ。対等な提携にアーンアウトは付かないし、わざわざ発表しなければならない独立性は、スタジオについての事実ではなく売却の条件である。',
    tell: '両社が対等だというなら、どちらが小切手を切ったのかを訊く。',
  },
  'summit-consensus': {
    slug: 'メッスケスクス',
    head: '業界の総意——次の十年は持続型ワールドのもの',
    lines: [
      '今週のノーザン・プレイ・サミットで{{業界は総意に達した|ひとつの壇上にいた四人が同じことを言った}}。次の十年は常時接続の持続型ワールドのものだ、と。{{関係者によれば|持続型ワールド向けのツールを売る二人によれば}}、適応できないスタジオは{{取り残される危険がある|実際には問題なくやっていける}}。',
      '{{ヘルシンキで異を唱える者はほとんどいない|サミットで異論を求められた人はいなかった}}。もっともパネルは{{リテンションの課題も認めた|終了三分前に、質問をひとつだけ受けた}}。',
    ],
    technique: '作られた総意',
    decodeNote: 'カンファレンスとは誰かが借りた部屋のことだ。「業界の総意」はたいてい「壇上の総意」を意味し、その壇上を押さえたのは何かを売りたい人々である。その総意が信じられて得をするのは誰か——たいていその人が引用されている。',
    tell: '情報源を数える。「業界」が四人を超えることはめったにない。',
  },
  'heat-recovery': {
    slug: 'セルナイネン',
    head: 'セハコヴィルタのデータホール、八千戸を暖める',
    lines: [
      '東ヘルシンキのセハコヴィルタ新ホールは{{排熱を地域熱供給網に還元する|排熱を地域熱供給網に売る}}。同社によれば{{八千戸に相当する|ホール自身が引く電力のおよそ四パーセントにあたる}}熱量だという。',
      '事業者はこの拠点を{{運用時カーボンネガティブ|熱の売却分を自社のフットプリントから差し引けばカーボンネガティブ}}と呼び、{{市の気候の歩みに加われて誇らしい|三月に系統接続の許可が下りた}}と述べた。',
    ],
    technique: '都合のよい基準線',
    decodeNote: '排熱回収は本物で、実際に良いことだ。手口は、その良い部分を自分の総量から差し引き、残りを話の全体として報告することにある。戸数には名前が与えられ、負荷には与えられない。どちらの数字が人間の単位（「戸」）をもらい、どちらがメガワットのままかを見る。',
    tell: '親しみやすい単位こそ、相手が繰り返してほしい数字だ。',
  },
  'vuosaari-automation': {
    slug: 'ヴオサーリ',
    head: '港湾、労働力トランスフォーメーションを開始',
    lines: [
      'ヴオサーリのコンテナターミナルは、事業者のいう{{労働力トランスフォーメーション計画|クレーン運転士を遠隔コンソールに置き換えること}}を開始した。{{協議期間を経て|二月に決まり七月に告知された決定を経て}}のことだという。',
      '事業者は、この変更が{{大きな効率化をもたらす|二交代を消す}}とし、{{影響を受ける従業員には再教育の機会を提供する|フォークリフトの講習がある}}と述べた。',
    ],
    technique: '名詞化',
    decodeNote: '動詞を名詞に変えると、行為者も一緒に消える。「トランスフォーメーション」「協議」「再編」——どれも誰かが取った行動で、それが「ただ存在する物」に詰め替えられている。フォークリフトの講習は本当にある。消える二交代も本当だ。',
    tell: '「〜化」で終わる名詞は、たいてい誰かが隠したかった動詞だ。',
  },
  'sixth-generation': {
    slug: 'オタニエミ',
    head: '調査、次世代ネットワークで欧州首位はフィンランド',
    lines: [
      '{{新たな調査によれば|その調査が称賛する三社が発注した調査によれば}}、フィンランドは次世代ネットワークへの備えで{{欧州を先導している|その報告書自身が選んだ十一か国の一覧を先導している}}。{{研究者らによるもの|その結論のために報酬を受けたコンサルティング会社によるもの}}だという。',
      '報告書は{{業界団体に歓迎された|そのために書かれた}}うえ、{{政策に反映される見通し|十月の助成申請で引用される}}だという。',
    ],
    technique: '出所ロンダリング',
    decodeNote: '主張は機関を通して洗われ、やがて「調査結果」として出てくる。順序はこうだ。利害関係者がコンサルに払う、コンサルが公表する、通信社がコンサルを報じる、他社が通信社を報じる。四段目では金は見えなくなり、主張には脚注が付いている。',
    tell: '「〜によれば」を、止まるまで辿る。行き止まりにいる者が、その一文の代金を払った。',
  },
  'round-b': {
    slug: 'カンピ',
    head: 'コルマス・ヴェルッコ、評価額四億',
    lines: [
      'カンピのキャンパスに拠点を置くコルマス・ヴェルッコは{{評価額四億ユーロとなった|自社の六パーセントを二千四百万で売り、掛け算すると四億になる}}。{{国際的な投資家|二つのファンド。うち一社は前回のラウンドも主導している}}が主導したラウンドの後のことだ。',
      '同社は{{急速にスケールしている|従業員は十九人}}とし、{{人員を三倍にする計画|次のラウンドを条件に、その予算だけは取ってある}}だという。',
    ],
    technique: '数字という雰囲気',
    decodeNote: '評価額は建物のなかにある金ではない。最後に売れた小さな一片の値段に、全体を掛けたものだ。それが見出しに来るのは手に入るなかで一番大きい数字だからで、その会社が機能しているかどうかとは最も縁の遠い数字でもある。',
    tell: '実際にいくら払われ、その何パーセント分だったのかを訊く。',
  },
  'seabed': {
    slug: 'フィンランド湾',
    head: 'フィンランド湾で三件目の海底インシデント',
    lines: [
      '湾の海底を通るデータケーブルが夜間に{{損傷を受けた|引きずられた}}。当局はこれを{{今年三件目の同種インシデント|誰も口に出して定義していない種類の、三件目の出来事}}と呼んでいる。',
      '{{原因は調査中|錨の跡は撮影され、船名もある届出に記載されているが、誰もそれを読み上げていない}}。当局は{{外部の関与を排除していない|全員が考えているその言葉を口にしていない}}とし、{{冷静な対応を呼びかけている|話がここで終わることを望んでいる}}。',
    ],
    technique: 'カテゴリーの漂流',
    decodeNote: '似ていない三つの出来事は、誰かがそれを「インシデント」と呼んだ瞬間に「連続」になる。この語は同時に二つの仕事をしている。ひとつにまとめてよいか分からないものをまとめ、しかもどれについても何も証明しなくて済むほど曖昧なままでいる。まとめ方が正しいこともある。それでも根拠は要る。',
    tell: '「三件目の同種インシデント」——同種とは、何と同種なのか。記事にそれを言わせる。',
  },
  'interference': {
    slug: '東側進入経路',
    head: '東側進入経路で測位障害',
    lines: [
      '東側進入経路の航空機で{{測位障害が発生している|衛星測位が妨害されている}}状態が四週目に入った。{{当局に近い筋によれば|ある匿名のひとりがそう言い、あとは全員がそれを刷り直した}}という。',
      '障害は広い範囲で{{確認されている|誰の仕業なのかを、記録に残る形で言う者はいない}}。運航は{{平常どおり|計器で着陸している。それは正常なことであり、何も起きていないことと同じではない}}だという。',
    ],
    technique: '匿名の権威',
    decodeNote: '「〜に近い筋」は本物の、そして時に必要な手段だ。人は話したせいで職を失う。だがそれは同時に、ひとつのブリーフィングを、独立して見える四本の記事に変えてしまう。問うべきは「本当かどうか」だけではない。情報源は実際に何人いて、その漏洩で得をするのは誰か、である。',
    tell: '四社、匿名の情報源ひとつ——それは帽子を四つかぶった一本の記事だ。',
  },
  'synthetic-env': {
    slug: 'オタニエミ',
    head: 'ヘルシンキのエンジン人材、合成環境へ',
    lines: [
      '首都圏のスタジオが{{合成環境の仕事|軍事シミュレーション}}に採用されている。{{没入型訓練ソリューション|兵士が予行する地形}}を{{機関顧客|国防省}}向けに作る仕事だ。',
      'あるリクルーターは、技術の移転は{{自然な流れ|給与がおよそ三割高い}}だと言う。同じエンジン、同じ地形ストリーミング、{{同じリアリティへのこだわり|そしてリアリティの定義がプレイヤーとは違う顧客}}。',
    ],
    technique: '婉曲（調達語）',
    decodeNote: '防衛調達には固有の語彙があり、それは偶然ではない。「合成環境」「エフェクター」「キネティック」。どれも技術的には正確で、どれも文を、地上にいる人間から一歩ずつ遠ざける。これはヘルシンキにとって最も実在に近いトレンドで、だからこそ普通の言葉で見ておく値打ちがある。',
    tell: '調達語を、それが人の体に何をするかに訳す。判断はそのあとで。',
  },
  'amplification': {
    slug: 'この周波数',
    head: '議論の周辺で協調的な増幅を検知',
    lines: [
      '{{港湾契約をめぐる議論|議論として枠づけられるまで、誰も議論していなかった問い}}に今週、{{自然発生的なエンゲージメントの高まり|九百のアカウント。うち四百は開設から一週間未満}}が集まり、{{懸念を呼んだ|懸念を監視する団体のプレスリリースを生んだ}}。',
      'アナリストは{{視聴者は操作に警戒すべきだ|あなたはいま、ある一局が一日の出来事から選んだものを、マイクの前のゼリーの声で聞いている}}と警告する。',
    ],
    technique: '先回りのフレーム',
    decodeNote: '最も効くのは本文の嘘ではなく、その手前に置かれた前提だ。何かを「議論」と呼べば議論は実在してしまい、賛否の両方が、それを名づけた者の手に渡る。そして——この放送も一日から十二本を選び、ある順番で読んでいる。それもフレームだ。それがこの局の最後の話であり、いちばん役に立つ話でもある。',
    tell: 'これが問いだと誰が決めたのかを訊く。ここについても。',
  },
};

export const COPY = { en: EN, fi: FI, ja: JA };

// English is the fallback, the same way t() falls back — a language that is
// missing a bulletin shows the English one rather than an empty post
export function storyCopy(id, lang) {
  return (COPY[lang] && COPY[lang][id]) || COPY.en[id] || {
    slug: id, head: id, lines: [''], technique: '', decodeNote: '', tell: '',
  };
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

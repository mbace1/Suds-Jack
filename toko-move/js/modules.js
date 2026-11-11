// Toko Move v3.22 — CARDS MADE FROM MODULES (owner, 2026-11-09: "game needs
// more variety, fun options, etc. There can be 100x content so it never feels
// stale. These can also be randomized from modules, so the game actually
// becomes like a roguelike").
//
// A story card is put together from three parts and a draw:
//   WHO    somebody at the stop, aboard or on the street (41)
//   WANT   what they are doing or need, with its two ordinary options and three
//          possible thirds — ordinary, special, very special (32)
//   TWIST  one line of the day around it (25)
// 41 × 32 × 25 is 32,800 cards before the third is drawn, against the 46
// written ones; the written ones stay in the deck, and a run deals both.
//
// Every part is a whole phrase in English and in Finnish, joined at the same
// seam (WHO + WANT is one sentence, the TWIST its own), so the Finnish is never
// inflected across a join: "Marimekko-huivinen mies etsii Muumikauppaa." A card
// carries its own translations (`fi`), which play.js hands to lang.js.
//
// The effects are the deck's own vocabulary (time, pay, cash, risk with odds
// as words, say), sized like the written cards, so a module card plays exactly
// like one. Drawn from a hash of the run's seed and the card's slot, never the
// run's rng: the same seed deals the same cards.
//
// Pure: no DOM. test/modules.mjs holds it in bare node.

const W = (en, fi, tags = []) => ({ en, fi, tags });
export const WHO = {
  scarf: W('A man in a Marimekko scarf', 'Marimekko-huivinen mies'),
  dog: W('A woman with a very small dog', 'Nainen, jolla on hyvin pieni koira,'),
  overalls: W('A student in pink overalls', 'Pinkkihaalarinen opiskelija'),
  trolley: W('A pensioner with a shopping trolley', 'Eläkeläinen ostoskärryjen kanssa'),
  backpack: W('A tourist with a huge backpack', 'Turisti valtavan rinkan kanssa'),
  lycra: W('A cyclist in full lycra', 'Lycra-asuinen pyöräilijä'),
  busker: W('A busker with a broken string', 'Katusoittaja katkenneen kielen kanssa'),
  snowsuit: W('A child in a snowsuit', 'Toppahaalariin puettu lapsi', ['day']),
  kiosk: W('A kiosk worker on a break', 'Tauolla oleva kioskin myyjä'),
  jersey: W('A hockey fan in a Jokerit jersey', 'Jokerit-paitainen kiekkofani'),
  coffees: W('A commuter with two coffees', 'Työmatkalainen kahden kahvin kanssa'),
  jogger: W('A jogger who has stopped jogging', 'Lenkkeilijä, joka on lopettanut lenkkeilyn,'),
  pram: W('A father with a double pram', 'Isä tuplarattaiden kanssa', ['day']),
  robot: W('A delivery robot', 'Kuljetusrobotti'),
  ladder: W('A man carrying a ladder', 'Tikkaita kantava mies', ['day']),
  cello: W('A woman with a cello case', 'Nainen sellokotelon kanssa'),
  chef: W('A chef on a break', 'Tauolla oleva kokki'),
  priest: W('A priest in a hurry', 'Kiireinen pappi'),
  grandpa: W('A grandfather with his grandson', 'Isoisä lapsenlapsensa kanssa', ['day']),
  jumper: W('A man in a reindeer jumper', 'Poroneuleinen mies'),
  violin: W('A girl with a violin', 'Tyttö viulun kanssa', ['day']),
  driver: W('A bus driver off duty', 'Vapaalla oleva bussikuski'),
  swede: W('A very tall Swede', 'Hyvin pitkä ruotsalainen'),
  cake: W('A woman holding a cake', 'Kakkua kantava nainen'),
  tuxedo: W('A man in a tuxedo', 'Smokkipukuinen mies', ['night']),
  dj: W('A sleepy DJ', 'Uninen DJ', ['night']),
  // (v3.25) fifteen more
  sailor: W('A sailor on shore leave', 'Maissa lomaileva merimies'),
  rod: W('A man with a fishing rod', 'Mies onkivavan kanssa'),
  rug: W('A woman carrying a rug', 'Mattoa kantava nainen'),
  cat: W('A man with a cat carrier', 'Mies kissankuljetuslaatikon kanssa'),
  bride: W('A bride on her way to the church', 'Kirkkoon matkalla oleva morsian', ['day']),
  pizzaguy: W('A pizza courier', 'Pizzalähetti'),
  scooter: W('A teenager on a kick scooter', 'Potkulautaileva teini'),
  sweeper: W('A street sweeper', 'Kadunlakaisija', ['day']),
  postie: W('A postman', 'Postinkantaja', ['day']),
  soprano: W('A retired opera singer', 'Eläkkeellä oleva oopperalaulaja'),
  moose: W('A woman in a moose costume', 'Hirviasuun pukeutunut nainen'),
  climber: W('A climber with a huge crash pad', 'Kiipeilijä valtavan patjan kanssa'),
  exchange: W('An exchange student from Osaka', 'Osakalainen vaihto-oppilas'),
  dachshunds: W('A man walking three dachshunds', 'Mies kolmen mäyräkoiran kanssa'),
  nightnurse: W('A nurse going home from the night shift', 'Yövuorosta kotiin menevä hoitaja', ['day']),
};

// one option: label, effects and what it says (each with its Finnish)
const O = (en, fi, eff, say, sayFi, extra = {}) => ({ label: en, fi, ...eff, say, sayFi, ...extra });
// a risk: the odds as a word, and what each way says
const R = (odds, win, winFi, lose, loseFi) => ({ odds, win: { ...win.e, say: win.s }, winFi, lose: { ...lose.e, say: lose.s }, loseFi });
export const WANT = {
  glove: { where: 'stop', mood: 'opportunity', tone: 'fun', en: 'has dropped a glove onto the tram tracks.', fi: 'on pudottanut hanskan ratikkakiskoille.',
    opts: [O('Fish it out', 'Onki se ylös', { time: 30, pay: 1.1 }, 'You hand it back. You get a handshake with the other glove.', 'Ojennat sen takaisin. Saat kädenpuristuksen toisella hanskalla.'),
      O('Point at it helpfully', 'Osoita sitä avuliaasti', { time: 0 }, 'Everyone points. Nobody fishes.', 'Kaikki osoittavat. Kukaan ei onki.')],
    thirds: [O('Wait for the tram to pass first', 'Odota, että ratikka menee ensin', { time: 90, pay: 1.05 }, 'The tram passes. The glove survives. So do you.', 'Ratikka menee. Hanska selviää. Niin sinäkin.'),
      O('Buy them new gloves at the kiosk', 'Osta heille uudet hanskat kioskilta', { time: 40, cash: -8, pay: 1.2 }, 'New gloves. They insist on carrying your parcel to the tram.', 'Uudet hanskat. He vaativat saada kantaa pakettisi ratikalle.', { tier: 'special' }),
      O('Ask the tram driver to stop', 'Pyydä ratikkakuskia pysähtymään', { time: 20, pay: 1.4 }, 'The driver stops, gets out, fetches the glove and waves you aboard. Helsinki.', 'Kuski pysähtyy, nousee ulos, hakee hanskan ja viittoo sinut kyytiin. Helsinki.', { tier: 'very' })] },
  directions: { where: 'stop', mood: 'info', tone: 'fun', en: 'is looking for the Moomin shop.', fi: 'etsii Muumikauppaa.',
    opts: [O('Point the way', 'Näytä suunta', { time: 10 }, 'Left, right, past the cathedral. They repeat it back wrong.', 'Vasemmalle, oikealle, tuomiokirkon ohi. He toistavat sen väärin.'),
      O('Draw a map on your hand', 'Piirrä kartta kämmeneesi', { time: 30, pay: 1.05 }, 'They photograph your hand. It goes viral, a little.', 'He kuvaavat kätesi. Se leviää somessa, vähän.')],
    thirds: [O('Walk them halfway', 'Saata heidät puoliväliin', { time: 60, cash: 5 }, 'Halfway is far enough. They tip you in coins.', 'Puoliväli riittää. He antavat tippiä kolikoina.'),
      O('Sell them your Moomin keyring', 'Myy heille muumiavaimenperäsi', { time: 10, cash: 12 }, 'They do not need the shop now. They have a Moomin.', 'He eivät tarvitse kauppaa enää. Heillä on muumi.', { tier: 'special' }),
      O('Introduce them to a Moomin', 'Esittele heidät muumille', { time: 40, pay: 1.3, cash: 10 }, 'A Moomin is handing out flyers around the corner. Photos, hugs, a tip for you.', 'Kulman takana muumi jakaa lentolehtisiä. Kuvia, haleja, tippi sinulle.', { tier: 'very' })] },
  ticket: { where: 'stop', mood: 'info', tone: 'fun', en: 'cannot work out the ticket app.', fi: 'ei saa lippusovellusta toimimaan.',
    opts: [O('Show them how', 'Näytä miten', { time: 40, pay: 1.05 }, 'Zone AB, two hours. They are delighted. Briefly.', 'AB-vyöhyke, kaksi tuntia. He ilahtuvat. Hetkeksi.'),
      O('Tell them to ask the driver', 'Neuvo kysymään kuskilta', { time: 0 }, 'They ask the driver. The driver points at you.', 'He kysyvät kuskilta. Kuski osoittaa sinua.')],
    thirds: [O('Buy them a ticket on your phone', 'Osta heille lippu puhelimellasi', { time: 20, cash: -3, pay: 1.15 }, 'Three euros of good karma. The tram arrives on cue.', 'Kolmen euron edestä hyvää karmaa. Ratikka saapuu kuin tilauksesta.'),
      O('Teach them the whole zone system', 'Opeta koko vyöhykejärjestelmä', { time: 90, pay: 1.2 }, 'A, B, C, D. They understand it better than you now.', 'A, B, C, D. He ymmärtävät sen nyt paremmin kuin sinä.', { tier: 'special' }),
      O('Ride with them, it is on the way', 'Matkusta heidän kanssaan, se on matkalla', { time: 0, pay: 1.35 }, 'Their stop is your stop. They talk the whole way, and pay you for it.', 'Heidän pysäkkinsä on sinun pysäkkisi. He puhuvat koko matkan ja maksavat siitä.', { tier: 'very' })] },
  carry: { where: 'walking', mood: 'opportunity', tone: 'fun', en: 'needs a hand with something heavy up the stairs.', fi: 'tarvitsee apua jonkin painavan kanssa portaissa.',
    opts: [O('Lift', 'Nosta', { time: 60, risk: R('usually', { e: { cash: 10 }, s: 'Up it goes. A ten-euro note comes down.' }, 'Ylös se menee. Kymppi tulee alas.', { e: { time: 60 }, s: 'It gets stuck on the landing. So do you, for a minute.' }, 'Se juuttuu tasanteelle. Niin sinäkin, minuutiksi.') }, '', ''),
      O('Hold the door', 'Pidä ovea', { time: 20 }, 'Door held. Respect earned.', 'Ovi pidetty. Kunnioitus ansaittu.')],
    thirds: [O('Find a second pair of hands', 'Etsi toinen kantaja', { time: 40, pay: 1.05 }, 'A jogger stops to help. Teamwork.', 'Lenkkeilijä pysähtyy auttamaan. Tiimityötä.'),
      O('Pay the removal men next door', 'Maksa naapurin muuttomiehille', { time: 10, cash: -10, pay: 1.15 }, 'Professionals. It is upstairs before you finish the sentence.', 'Ammattilaiset. Se on yläkerrassa ennen kuin ehdit lopettaa lauseen.', { tier: 'special' }),
      O('Carry it on your back, like a legend', 'Kanna se selässä kuin legenda', { time: 90, pay: 1.5 }, 'People applaud from the windows. You are faster for the rest of the day.', 'Ihmiset taputtavat ikkunoista. Olet nopeampi koko loppupäivän.', { tier: 'very' })] },
  seat: { where: 'aboard', mood: 'info', tone: 'fun', en: 'is looking at your seat very hopefully.', fi: 'katsoo istumapaikkaasi hyvin toiveikkaasti.',
    opts: [O('Give up your seat', 'Anna paikkasi', { time: 0, pay: 1.1 }, 'You stand. The parcel stands with you. Morale rises.', 'Seisot. Paketti seisoo kanssasi. Moraali nousee.'),
      O('Pretend to sleep', 'Esitä nukkuvaa', { time: 0 }, 'You pretend so well you miss nothing, but feel everything.', 'Esität niin hyvin, ettet missaa mitään, mutta tunnet kaiken.')],
    thirds: [O('Offer half the seat', 'Tarjoa puolikasta paikkaa', { time: 0, pay: 1.05 }, 'Half a seat each. Very Finnish, very quiet.', 'Puolikas paikka kummallekin. Hyvin suomalaista, hyvin hiljaista.'),
      O('Swap your seat for their coffee', 'Vaihda paikkasi heidän kahviinsa', { time: 0, pay: 1.15 }, 'Hot coffee, standing. Worth it.', 'Kuumaa kahvia seisaaltaan. Sen arvoista.', { tier: 'special' }),
      O('Start a seat rotation for the whole car', 'Aloita koko vaunun paikkakierto', { time: 30, pay: 1.4, cash: 5 }, 'Everyone sits for one stop. Nobody speaks. It is beautiful. Somebody tips.', 'Jokainen istuu yhden pysäkin. Kukaan ei puhu. Se on kaunista. Joku antaa tippiä.', { tier: 'very' })] },
  phone: { where: 'aboard', mood: 'notice', tone: 'fun', en: 'is on speakerphone, loudly, about their divorce.', fi: 'puhuu kaiuttimella, kovaa, avioerostaan.',
    opts: [O('Look out of the window', 'Katso ikkunasta', { time: 0 }, 'You learn too much about a man named Pertti.', 'Opit liikaa Pertti-nimisestä miehestä.'),
      O('Move down the car', 'Siirry vaunun toiseen päähän', { time: 20 }, 'Further away, the story continues, but quieter.', 'Kauempana tarina jatkuu, mutta hiljempaa.')],
    thirds: [O('Guess Pertti\'s side of it', 'Arvaa Pertin puoli asiasta', { time: 0, risk: R('long shot', { e: { cash: 15 }, s: 'You are exactly right. They hand you the phone. Pertti thanks you. A tip arrives.' }, 'Osut täsmälleen oikeaan. He ojentavat puhelimen. Pertti kiittää. Tippi saapuu.', { e: {}, s: 'You are wrong, loudly. The whole car agrees you are wrong.' }, 'Olet väärässä, äänekkäästi. Koko vaunu on samaa mieltä.') }, '', ''),
      O('Offer them a pulla', 'Tarjoa heille pulla', { time: 10, cash: -2, pay: 1.15 }, 'They hang up and eat it. Everyone breathes out.', 'He lopettavat puhelun ja syövät sen. Kaikki huokaisevat.', { tier: 'special' }),
      O('Give them very good advice', 'Anna heille todella hyvä neuvo', { time: 40, pay: 1.3, cash: 15 }, 'They call Pertti back and make up. The whole car claps. They tip you.', 'He soittavat Pertille takaisin ja sopivat. Koko vaunu taputtaa. He antavat tippiä.', { tier: 'very' })] },
  dropped: { where: 'aboard', mood: 'opportunity', tone: 'fun', en: 'has dropped a bag of cinnamon buns all over the floor.', fi: 'on pudottanut pussillisen korvapuusteja lattialle.',
    opts: [O('Help pick them up', 'Auta keräämään', { time: 30, pay: 1.1 }, 'You get one. It was only on the floor briefly.', 'Saat yhden. Se oli lattialla vain hetken.'),
      O('Mind your parcel', 'Varo pakettiasi', { time: 0 }, 'A bun rolls past your shoe with great dignity.', 'Pulla vierii kenkäsi ohi suurella arvokkuudella.')],
    thirds: [O('Block the door so none escape', 'Tuki ovi, ettei yksikään karkaa', { time: 10, pay: 1.05 }, 'No bun leaves this tram. You are a hero to someone.', 'Yksikään pulla ei poistu ratikasta. Olet jollekulle sankari.'),
      O('Buy the whole bag off them', 'Osta koko pussi heiltä', { time: 0, cash: -6, pay: 1.2 }, 'Six euros of slightly floor-adjacent buns. Fuel for the whole shift.', 'Kuuden euron edestä hieman lattiaa nähneitä pullia. Polttoainetta koko vuoroksi.', { tier: 'special' }),
      O('Hand them out to the whole car', 'Jaa niitä koko vaunulle', { time: 30, pay: 1.4 }, 'Twenty strangers eating buns together. The driver honks twice, approving.', 'Kaksikymmentä tuntematonta syö pullia yhdessä. Kuski tööttää kahdesti, hyväksyvästi.', { tier: 'very' })] },
  race: { where: 'stop', mood: 'warning', tone: 'risky', en: 'bets you cannot reach the next stop before the tram.', fi: 'lyö vetoa, ettet ehdi seuraavalle pysäkille ennen ratikkaa.',
    opts: [O('Take the bet', 'Ota veto', { time: 0, risk: R('maybe', { e: { cash: 20 }, s: 'You win by a nose. They pay up, impressed.' }, 'Voitat nenänmitalla. He maksavat, vaikuttuneina.', { e: { cash: -10, time: 60 }, s: 'The tram wins. You pay, and wait for the next one.' }, 'Ratikka voittaa. Maksat ja odotat seuraavaa.') }, '', ''),
      O('Decline politely', 'Kieltäydy kohteliaasti', { time: 0 }, 'They shrug and bet the gull instead.', 'He kohauttavat olkiaan ja lyövät vetoa lokin kanssa.')],
    thirds: [O('Bet on the tram instead', 'Lyö vetoa ratikan puolesta', { time: 0, risk: R('usually', { e: { cash: 10 }, s: 'The tram wins. You win. Nobody had to run.' }, 'Ratikka voittaa. Sinä voitat. Kenenkään ei tarvinnut juosta.', { e: { cash: -5 }, s: 'The tram is late. Of course it is.' }, 'Ratikka on myöhässä. Tietenkin on.') }, '', ''),
      O('Take a city bike and win easily', 'Ota kaupunkipyörä ja voita helposti', { time: 0, cash: 18, tier: 'special' }, 'Technically legal. They pay anyway, laughing.', 'Teknisesti sallittua. He maksavat silti, nauraen.'),
      O('Race them, both of you, together', 'Juoskaa kilpaa, molemmat yhdessä', { time: 0, pay: 1.4, tier: 'very' }, 'You both lose to the tram, both laughing, and ride it together. A friend.', 'Häviätte molemmat ratikalle, molemmat nauraen, ja matkustatte sillä yhdessä. Ystävä.')] },
  shortcut: { where: 'walking', mood: 'warning', tone: 'risky', en: 'swears there is a shortcut through the courtyard.', fi: 'vannoo, että sisäpihan kautta pääsee oikotietä.',
    opts: [O('Follow them', 'Seuraa heitä', { time: 0, risk: R('maybe', { e: { pay: 1.25 }, s: 'It is a real shortcut. You have been doing it wrong for years.' }, 'Se on oikea oikotie. Olet tehnyt väärin vuosia.', { e: { time: 120 }, s: 'It is a locked gate. You go back the long way.' }, 'Se on lukittu portti. Palaat pitkää reittiä.') }, '', ''),
      O('Stick to the street', 'Pysy kadulla', { time: 30 }, 'The street is the street. It works.', 'Katu on katu. Se toimii.')],
    thirds: [O('Ask a local first', 'Kysy ensin paikalliselta', { time: 20, pay: 1.1 }, 'The local knows. It is open until nine.', 'Paikallinen tietää. Se on auki yhdeksään.'),
      O('Pay the janitor to open the gate', 'Maksa talonmiehelle portin avaamisesta', { time: 10, cash: -5, pay: 1.3, tier: 'special' }, 'Five euros, a key, a nod. You are through.', 'Viisi euroa, avain, nyökkäys. Olet läpi.'),
      O('Find the secret sauna in the courtyard', 'Löydä sisäpihan salainen sauna', { time: 120, pay: 1.6, tier: 'very' }, 'There is a sauna. It is warm. You come out a faster person.', 'Siellä on sauna. Se on lämmin. Tulet ulos nopeampana ihmisenä.')] },
  dropbag: { where: 'stop', mood: 'notice', tone: 'risky', en: 'asks you to watch their bag for one minute.', fi: 'pyytää sinua vahtimaan laukkuaan minuutin.',
    opts: [O('Watch it', 'Vahdi sitä', { time: 60, risk: R('usually', { e: { cash: 10 }, s: 'They come back with a coffee for you and a ten.' }, 'He palaavat kahvin ja kympin kanssa.', { e: { time: 120 }, s: 'One minute becomes four. The bag and you become friends.' }, 'Minuutti venyy neljäksi. Sinusta ja laukusta tulee ystävät.') }, '', ''),
      O('Say you are working', 'Sano, että olet töissä', { time: 0 }, 'They nod. Everyone is working.', 'He nyökkäävät. Kaikki ovat töissä.')],
    thirds: [O('Ask the kiosk to watch it', 'Pyydä kioskia vahtimaan sitä', { time: 20 }, 'The kiosk accepts. The kiosk has seen worse.', 'Kioski suostuu. Kioski on nähnyt pahempaa.'),
      O('Watch it and sell coffee meanwhile', 'Vahdi ja myy kahvia samalla', { time: 60, cash: 14, tier: 'special' }, 'Somehow you run a coffee stand for a minute. Profit.', 'Jotenkin pyörität kahvikojua minuutin. Voittoa.'),
      O('Open it. It is ticking', 'Avaa se. Se tikittää', { time: 30, pay: 1.5, cash: 20, tier: 'very' }, 'It is an alarm clock and a cake. It is their birthday. You get cake and a reward.', 'Se on herätyskello ja kakku. On heidän syntymäpäivänsä. Saat kakkua ja löytöpalkkion.')] },
  hockey: { where: 'aboard', mood: 'opportunity', tone: 'fun', en: 'is explaining last night\'s hockey game to the whole car.', fi: 'selittää eilisillan kiekkopeliä koko vaunulle.',
    opts: [O('Nod along', 'Nyökyttele mukana', { time: 0 }, 'Two goals in overtime. You will hear it twice more.', 'Kaksi maalia jatkoajalla. Kuulet sen vielä kahdesti.'),
      O('Ask about the penalty', 'Kysy jäähystä', { time: 30, pay: 1.1 }, 'Wrong question. Right answer. The car is now a debate club.', 'Väärä kysymys. Oikea vastaus. Vaunu on nyt väittelykerho.')],
    thirds: [O('Change the subject to football', 'Vaihda aihe jalkapalloon', { time: 0, pay: 0.95 }, 'A mistake. Nobody speaks to you again.', 'Virhe. Kukaan ei puhu sinulle enää.'),
      O('Bet a euro on the wrong team', 'Lyö euro vetoa väärästä joukkueesta', { time: 10, tier: 'special', risk: R('long shot', { e: { cash: 20 }, s: 'Twenty fans each bet a euro against you. Tonight, the wrong team wins.' }, 'Kaksikymmentä fania lyö kukin euron vetoa sinua vastaan. Tänä iltana väärä joukkue voittaa.', { e: { cash: -1 }, s: 'One euro, gone. The car is very kind about it.' }, 'Euro meni. Vaunu suhtautuu siihen hyvin ystävällisesti.') }, '', ''),
      O('Lead the whole car in the anthem', 'Johda koko vaunu kannustuslauluun', { time: 30, pay: 1.4, cash: 10, tier: 'very' }, 'The car sings. The driver sings. A tourist films it and tips you.', 'Vaunu laulaa. Kuski laulaa. Turisti kuvaa ja antaa tippiä.')] },
  cold: { where: 'stop', mood: 'info', tone: 'fun', weather: ['snow'], en: 'is shivering in a summer jacket.', fi: 'palelee kesätakissa.',
    opts: [O('Lend them your scarf', 'Lainaa heille huivisi', { time: 10, pay: 1.1 }, 'Your neck is cold. Your heart is warm.', 'Kaulaa palelee. Sydäntä lämmittää.'),
      O('Point at the heated shelter', 'Osoita lämmitettyä katosta', { time: 0 }, 'There is no heated shelter. They look anyway.', 'Lämmitettyä katosta ei ole. He katsovat silti.')],
    thirds: [O('Share your hand warmer', 'Jaa käsilämmittimesi', { time: 0, pay: 1.05 }, 'Half a hand warmer each. It is enough.', 'Puolikas käsilämmitin kummallekin. Se riittää.'),
      O('Buy them a hot chocolate', 'Osta heille kaakao', { time: 40, cash: -4, pay: 1.2, tier: 'special' }, 'Hot chocolate. They thaw, and tell you a joke.', 'Kaakao. He sulavat ja kertovat vitsin.'),
      O('Take them to the sauna next door', 'Vie heidät viereiseen saunaan', { time: 150, pay: 1.6, tier: 'very' }, 'Ten minutes of steam. You both come out new people.', 'Kymmenen minuuttia löylyä. Tulette molemmat ulos uusina ihmisinä.')] },
  sun: { where: 'stop', mood: 'opportunity', tone: 'fun', weather: ['clear'], en: 'has turned their face to the sun with their eyes closed.', fi: 'on kääntänyt kasvonsa aurinkoon silmät kiinni.',
    opts: [O('Join them for a moment', 'Liity heihin hetkeksi', { time: 30, pay: 1.1 }, 'Thirty seconds of sun. The best part of the day.', 'Kolmekymmentä sekuntia aurinkoa. Päivän paras hetki.'),
      O('Leave them to it', 'Anna heidän olla', { time: 0 }, 'A Finnish rite. Not to be interrupted.', 'Suomalainen riitti. Ei saa keskeyttää.')],
    thirds: [O('Buy two ice creams', 'Osta kaksi jäätelöä', { time: 30, cash: -5, pay: 1.15 }, 'Ice cream in the sun. They nod, eyes still closed.', 'Jäätelöä auringossa. He nyökkäävät, silmät yhä kiinni.'),
      O('Lend them your sunglasses', 'Lainaa heille aurinkolasisi', { time: 10, pay: 1.2, tier: 'special' }, 'They look amazing. They tell you so.', 'He näyttävät upeilta. He kertovat sen sinulle.'),
      O('Start a sun-worshipping circle', 'Aloita auringonpalvontapiiri', { time: 60, pay: 1.5, cash: 8, tier: 'very' }, 'Twelve people, eyes closed, faces up. A tourist pays to join.', 'Kaksitoista ihmistä, silmät kiinni, kasvot ylös. Turisti maksaa päästäkseen mukaan.')] },
  lostkid: { where: 'stop', mood: 'warning', tone: 'fun', tags: ['day'], en: 'cannot find their grandmother anywhere.', fi: 'ei löydä isoäitiään mistään.',
    opts: [O('Help look', 'Auta etsimään', { time: 90, pay: 1.15 }, 'She was at the kiosk, buying lottery tickets. Reunion.', 'Hän oli kioskilla ostamassa arpoja. Jälleennäkeminen.'),
      O('Point to the station staff', 'Ohjaa aseman henkilökunnan luo', { time: 10 }, 'The staff are wonderful. You hear the announcement later.', 'Henkilökunta on ihana. Kuulet kuulutuksen myöhemmin.')],
    thirds: [O('Call out her name', 'Huuda hänen nimeään', { time: 30, pay: 1.1 }, 'Six grandmothers answer. One of them is right.', 'Kuusi isoäitiä vastaa. Yksi heistä on oikea.'),
      O('Ask the busker to announce it', 'Pyydä katusoittajaa kuuluttamaan', { time: 40, cash: -2, pay: 1.25, tier: 'special' }, 'A song about a lost grandmother. She appears by the second verse.', 'Laulu kadonneesta isoäidistä. Hän ilmestyy toisessa säkeistössä.'),
      O('Lift them onto your shoulders', 'Nosta heidät hartioillesi', { time: 30, pay: 1.5, tier: 'very' }, 'From up there they spot her at once. She gives you a whole pulla.', 'Sieltä ylhäältä he näkevät hänet heti. Hän antaa sinulle kokonaisen pullan.')] },
  inspectors: { where: 'aboard', mood: 'notice', tone: 'risky', en: 'whispers that the inspectors are getting on at the next stop.', fi: 'kuiskaa, että tarkastajat nousevat kyytiin seuraavalla pysäkillä.',
    opts: [O('Check your ticket', 'Tarkista lippusi', { time: 10 }, 'Valid. Of course it is. You check again anyway.', 'Voimassa. Tietenkin. Tarkistat silti uudestaan.'),
      O('Thank them and stay put', 'Kiitä ja pysy paikallasi', { time: 0, risk: R('usually', { e: {}, s: 'They never come. It was a rumour.' }, 'He eivät tule. Se oli huhu.', { e: { cash: -10 }, s: 'They come. Your app has logged you out. A small fine.' }, 'He tulevat. Sovellus on kirjannut sinut ulos. Pieni sakko.') }, '', '')],
    thirds: [O('Get off and walk one stop', 'Jää pois ja kävele yksi pysäkki', { time: 120 }, 'A nice walk, for no reason at all.', 'Mukava kävely, ilman mitään syytä.'),
      O('Buy a ticket for the whisperer', 'Osta lippu kuiskaajalle', { time: 10, cash: -3, pay: 1.2, tier: 'special' }, 'They had no ticket. Now they do. Lifelong friend.', 'Heillä ei ollut lippua. Nyt on. Elinikäinen ystävä.'),
      O('Help the inspectors find the actual dodger', 'Auta tarkastajia löytämään oikea pummilla matkustaja', { time: 20, cash: 15, tier: 'very' }, 'It was the man in the very large hat. The inspectors tip you, unofficially.', 'Se oli mies hyvin isossa hatussa. Tarkastajat antavat tippiä, epävirallisesti.')] },
  night: { where: 'stop', mood: 'notice', tone: 'scary', night: true, en: 'is standing perfectly still, facing the wrong way.', fi: 'seisoo täysin liikkumatta väärään suuntaan katsoen.',
    opts: [O('Say good evening', 'Toivota hyvää iltaa', { time: 10, risk: R('maybe', { e: { pay: 1.2 }, s: 'They turn. They smile. They were just waiting for their bus.' }, 'He kääntyvät. He hymyilevät. He vain odottivat bussiaan.', { e: { time: 60 }, s: 'They do not turn. You wait the next tram out further down.' }, 'He eivät käänny. Odotat seuraavan ratikan kauempana.') }, '', ''),
      O('Stand further away', 'Seiso kauempana', { time: 0 }, 'You keep one eye on them until the tram comes.', 'Pidät heitä silmällä, kunnes ratikka tulee.')],
    thirds: [O('Face the wrong way too', 'Katso sinäkin väärään suuntaan', { time: 0, pay: 1.05 }, 'Now there are two of you. It feels right.', 'Nyt teitä on kaksi. Tuntuu oikealta.'),
      O('Offer them your torch', 'Tarjoa heille taskulamppuasi', { time: 20, pay: 1.2, tier: 'special' }, 'They take it and point it at the sky. A satellite blinks back.', 'He ottavat sen ja osoittavat taivaalle. Satelliitti vilkuttaa takaisin.'),
      O('Ask them what they are looking at', 'Kysy, mitä he katsovat', { time: 30, pay: 1.6, tier: 'very' }, 'The northern lights, very faintly, over the harbour. You both watch until the tram.', 'Revontulia, hyvin heikosti, sataman yllä. Katsotte molemmat ratikkaan asti.')] },
  year: { where: 'aboard', mood: 'notice', tone: 'scary', night: true, en: 'asks you, very politely, what year it is.', fi: 'kysyy sinulta hyvin kohteliaasti, mikä vuosi nyt on.',
    opts: [O('Tell them', 'Kerro', { time: 0, risk: R('usually', { e: { pay: 1.1 }, s: 'They nod, relieved, and get off at a stop that is not on the map.' }, 'He nyökkäävät helpottuneina ja jäävät pois pysäkillä, jota ei ole kartalla.', { e: { time: 60 }, s: 'They laugh at the answer for a very long time. You miss your stop.' }, 'He nauravat vastaukselle hyvin pitkään. Missaat pysäkkisi.') }, '', ''),
      O('Pretend you did not hear', 'Esitä, ettet kuullut', { time: 0 }, 'They ask the next person. And the next.', 'He kysyvät seuraavalta. Ja seuraavalta.')],
    thirds: [O('Ask them the same question', 'Kysy heiltä samaa', { time: 10, pay: 1.05 }, 'They tell you a year. You decide not to check.', 'He kertovat vuoden. Päätät olla tarkistamatta.'),
      O('Show them the date on your phone', 'Näytä päivämäärä puhelimestasi', { time: 10, cash: 8, tier: 'special' }, 'They pay you in coins nobody has used for decades. A collector buys them at the next stop.', 'He maksavat kolikoilla, joita kukaan ei ole käyttänyt vuosikymmeniin. Keräilijä ostaa ne seuraavalla pysäkillä.'),
      O('Tell them it is their year', 'Sano, että on heidän vuotensa', { time: 20, pay: 1.5, tier: 'very' }, 'They smile, tip an old hat, and are not there when you look again. The parcel feels lighter.', 'He hymyilevät, nostavat vanhaa hattuaan, eivätkä ole siellä, kun katsot uudestaan. Paketti tuntuu kevyemmältä.')] },
  hum: { where: 'stop', mood: 'notice', tone: 'scary', night: true, en: 'is humming a song you have never heard and somehow know.', fi: 'hyräilee laulua, jota et ole koskaan kuullut ja jonka silti tunnet.',
    opts: [O('Hum along', 'Hyräile mukana', { time: 20, risk: R('maybe', { e: { pay: 1.2 }, s: 'The tram arrives on the last note, exactly.' }, 'Ratikka saapuu täsmälleen viimeisellä sävelellä.', { e: { time: 90 }, s: 'The song does not end. You let one tram go.' }, 'Laulu ei lopu. Annat yhden ratikan mennä.') }, '', ''),
      O('Put your headphones on', 'Laita kuulokkeet päähän', { time: 0 }, 'You can still hear it, a little, under the music.', 'Kuulet sen yhä vähän musiikin alta.')],
    thirds: [O('Ask what it is called', 'Kysy, mikä sen nimi on', { time: 10, pay: 1.05 }, 'It has no name. They seem glad you asked.', 'Sillä ei ole nimeä. He näyttävät iloisilta, että kysyit.'),
      O('Record it on your phone', 'Nauhoita se puhelimeesi', { time: 20, cash: 10, tier: 'special' }, 'The recording is only wind. A sound artist pays you for it anyway.', 'Nauhoitteella on vain tuulta. Äänitaiteilija maksaa siitä silti.'),
      O('Sing the next verse', 'Laula seuraava säkeistö', { time: 30, pay: 1.6, tier: 'very' }, 'You know it. The street lights brighten one by one down the line.', 'Osaat sen. Katuvalot kirkastuvat yksi kerrallaan linjan varrella.')] },
  shadow: { where: 'walking', mood: 'warning', tone: 'scary', night: true, en: 'has been walking exactly your pace for three blocks.', fi: 'on kävellyt täsmälleen sinun tahtiasi kolme korttelia.',
    opts: [O('Speed up', 'Nopeuta', { time: 0, risk: R('usually', { e: { pay: 1.1 }, s: 'You turn the corner. Nobody follows. You arrive early.' }, 'Käännyt kulmasta. Kukaan ei seuraa. Saavut ajoissa.', { e: { time: 60 }, s: 'So do they. You take the long way round to lose them.' }, 'Niin hekin. Kierrät pitkää reittiä päästäksesi heistä eroon.') }, '', ''),
      O('Stop and let them pass', 'Pysähdy ja anna mennä ohi', { time: 30 }, 'They pass. They nod. They are carrying a parcel too.', 'He menevät ohi. He nyökkäävät. Hekin kantavat pakettia.')],
    thirds: [O('Step into a kiosk', 'Astu kioskiin', { time: 40, cash: -2 }, 'A liquorice and two minutes later, the street is empty.', 'Salmiakki ja kaksi minuuttia myöhemmin katu on tyhjä.'),
      O('Turn and say good evening', 'Käänny ja toivota hyvää iltaa', { time: 10, pay: 1.2, tier: 'special' }, 'It is the other courier. She was following you for the shortcut.', 'Se on se toinen lähetti. Hän seurasi sinua oikotien takia.'),
      O('Walk together', 'Kävelkää yhdessä', { time: 0, pay: 1.5, cash: 10, tier: 'very' }, 'They know every quiet street in the city. They show you one, and tip you for the company.', 'He tuntevat kaupungin jokaisen hiljaisen kadun. He näyttävät sinulle yhden ja antavat tippiä seurasta.')] },
  music: { where: 'walking', mood: 'opportunity', tone: 'fun', en: 'is playing accordion outside the market hall.', fi: 'soittaa haitaria kauppahallin edessä.',
    opts: [O('Stop and listen', 'Pysähdy kuuntelemaan', { time: 30, pay: 1.1 }, 'A tango. Somehow it fits Helsinki perfectly.', 'Tango. Jotenkin se sopii Helsinkiin täydellisesti.'),
      O('Drop a coin and go', 'Pudota kolikko ja jatka', { time: 0, cash: -1 }, 'One euro. A nod. Back to work.', 'Yksi euro. Nyökkäys. Takaisin töihin.')],
    thirds: [O('Request a song', 'Pyydä kappaletta', { time: 60, cash: -3, pay: 1.2 }, 'They play it, badly and beautifully.', 'He soittavat sen, huonosti ja kauniisti.'),
      O('Dance the tango with a stranger', 'Tanssi tangoa tuntemattoman kanssa', { time: 60, pay: 1.3, tier: 'special' }, 'A pensioner leads. You follow. A small crowd claps.', 'Eläkeläinen vie. Sinä seuraat. Pieni väkijoukko taputtaa.'),
      O('Sing along in Finnish', 'Laula mukana suomeksi', { time: 60, pay: 1.5, cash: 12, tier: 'very' }, 'You know every word. The accordionist cries. The hat fills, and they share it.', 'Osaat jokaisen sanan. Haitaristi itkee. Hattu täyttyy, ja hän jakaa sen.')] },
  // (v3.25) twelve more: five on foot, three aboard, four at the stop
  map: { where: 'walking', mood: 'info', tone: 'fun', en: 'is holding a paper map upside down.', fi: 'pitää paperikarttaa ylösalaisin.',
    opts: [O('Turn it round for them', 'Käännä se heille oikein päin', { time: 10, pay: 1.05 }, 'They thank you, then turn it back.', 'He kiittävät ja kääntävät sen takaisin.'),
      O('Ask where they are going', 'Kysy, minne he ovat menossa', { time: 30, pay: 1.1 }, 'Same way as you. You walk together.', 'Samaan suuntaan kuin sinä. Kävelette yhdessä.')],
    thirds: [O('Show them on your phone', 'Näytä puhelimestasi', { time: 20, pay: 1.05 }, 'A blue dot. They are amazed by the blue dot.', 'Sininen piste. He ihastuvat siniseen pisteeseen.'),
      O('Point out every landmark on the way', 'Esittele jokainen nähtävyys matkalla', { time: 40, cash: 6, tier: 'special' }, 'The cathedral, the market, a very good kiosk. They tip like a tourist board.', 'Tuomiokirkko, tori, hyvin hyvä kioski. He antavat tippiä kuin matkailutoimisto.'),
      O('Lead them by the sea road', 'Vie heidät merenrantaa pitkin', { time: 90, pay: 1.5, cash: 10, tier: 'very' }, 'The long way, along the water. Nobody minds. They pay you for the view.', 'Pitkä tie veden vierellä. Kukaan ei välitä. He maksavat sinulle maisemasta.')] },
  flatbike: { where: 'walking', mood: 'opportunity', tone: 'fun', en: 'is pushing a bike with a flat tyre.', fi: 'työntää pyörää, jonka rengas on puhjennut.',
    opts: [O('Help push', 'Auta työntämään', { time: 60, pay: 1.1 }, 'Two people, one bike. Somehow it goes faster.', 'Kaksi ihmistä, yksi pyörä. Jotenkin se kulkee nopeammin.'),
      O('Point to the bike shop', 'Osoita pyöräkorjaamoa', { time: 0 }, 'Two blocks. They sigh, and push on.', 'Kaksi korttelia. He huokaisevat ja jatkavat työntämistä.')],
    thirds: [O('Patch it with chewing gum', 'Paikkaa se purukumilla', { time: 30, risk: R('maybe', { e: { pay: 1.2 }, s: 'It holds. Science.' }, 'Se pitää. Tiedettä.', { e: { time: 30 }, s: 'It does not hold. Also science.' }, 'Se ei pidä. Sekin on tiedettä.') }, '', ''),
      O('Let the parcel ride in their basket', 'Anna paketin matkustaa heidän korissaan', { time: 0, pay: 1.25, tier: 'special' }, 'The parcel has never been so comfortable. Neither have your arms.', 'Paketilla ei ole koskaan ollut näin mukavaa. Eikä käsilläsi.'),
      O('Ride it downhill together on the pegs', 'Laskekaa mäki yhdessä tappien päällä', { time: 0, pay: 1.5, tier: 'very' }, 'Downhill, a flat tyre, two people. The best thirty seconds of the year.', 'Alamäki, puhjennut rengas, kaksi ihmistä. Vuoden parhaat kolmekymmentä sekuntia.')] },
  pizza: { where: 'walking', mood: 'opportunity', tone: 'fun', en: 'is carrying eight pizza boxes and cannot see.', fi: 'kantaa kahdeksaa pizzalaatikkoa eikä näe eteensä.',
    opts: [O('Guide them', 'Opasta heitä', { time: 40, pay: 1.1 }, 'Left, left, door. Eight pizzas arrive.', 'Vasemmalle, vasemmalle, ovi. Kahdeksan pizzaa perillä.'),
      O('Take the top two', 'Ota kaksi päällimmäistä', { time: 30, cash: 4 }, 'They give you a slice as a fee.', 'He antavat sinulle palan palkkioksi.')],
    thirds: [O('Open the doors ahead of them', 'Avaa ovet heidän edeltään', { time: 20, pay: 1.05 }, 'Five doors. Five small victories.', 'Viisi ovea. Viisi pientä voittoa.'),
      O('Deliver two of them yourself', 'Toimita kaksi itse', { time: 60, cash: 12, tier: 'special' }, 'Two pizzas, one stairwell, a twelve-euro tip.', 'Kaksi pizzaa, yksi rappu, kahdentoista euron tippi.'),
      O('Notice they are for your dispatch office', 'Huomaa, että ne ovat lähettämöösi', { time: 0, pay: 1.4, cash: 10, tier: 'very' }, 'Dispatch eats well tonight. Dispatch will remember who carried them.', 'Lähettämössä syödään hyvin tänään. Lähettämö muistaa, kuka ne kantoi.')] },
  sauna: { where: 'walking', mood: 'info', tone: 'fun', en: 'asks where the public sauna is.', fi: 'kysyy, missä yleinen sauna on.',
    opts: [O('Point to the one by the sea', 'Osoita meren rannalla olevaa', { time: 10 }, 'Down by the sea. They nod seriously.', 'Alas meren rantaan. He nyökkäävät vakavina.'),
      O('Draw the way on their hand', 'Piirrä reitti heidän kämmeneensä', { time: 20, pay: 1.05 }, 'They will not wash that hand until after the sauna.', 'He eivät pese sitä kättä ennen saunaa.')],
    thirds: [O('Recommend the old one in Kallio', 'Suosittele vanhaa Kalliossa', { time: 10, pay: 1.1 }, 'A real one, wood-fired. They write it down.', 'Oikea, puulämmitteinen. He kirjoittavat sen muistiin.'),
      O('Lend them your towel', 'Lainaa heille pyyhkeesi', { time: 0, pay: 1.2, tier: 'special' }, 'A courier\'s towel. They are honoured, slightly.', 'Lähetin pyyhe. He ovat otettuja, vähän.'),
      O('Explain löyly properly', 'Selitä löyly kunnolla', { time: 120, pay: 1.5, cash: 10, tier: 'very' }, 'Two minutes of löyly theory. They understand Finland now, and tip.', 'Kaksi minuuttia löylyteoriaa. He ymmärtävät nyt Suomea ja antavat tippiä.')] },
  stuck: { where: 'aboard', mood: 'warning', tone: 'fun', en: 'is stuck in the tram doors.', fi: 'on jäänyt jumiin ratikan oviin.',
    opts: [O('Press the door button', 'Paina oven nappia', { time: 10, pay: 1.1 }, 'The doors sigh open. Everyone sighs with them.', 'Ovet huokaisevat auki. Kaikki huokaisevat niiden kanssa.'),
      O('Pull them in', 'Vedä heidät sisään', { time: 0, risk: R('maybe', { e: { pay: 1.2 }, s: 'In they come, with a bow.' }, 'Sisään he tulevat, kumarrellen.', { e: { time: 40 }, s: 'The doors win. You both get off and take the next one.' }, 'Ovet voittavat. Jäätte molemmat pois ja otatte seuraavan.') }, '', '')],
    thirds: [O('Wave to the driver', 'Vilkuta kuljettajalle', { time: 20 }, 'The driver sees. The driver has seen worse.', 'Kuljettaja näkee. Kuljettaja on nähnyt pahempaa.'),
      O('Wedge the door with your parcel', 'Kiilaa ovi paketillasi', { time: 0, pay: 1.2, tier: 'special' }, 'The parcel takes it bravely. They are free.', 'Paketti kestää sen urheasti. He ovat vapaita.'),
      O('Get the whole car to push', 'Saa koko vaunu työntämään', { time: 20, pay: 1.5, cash: 8, tier: 'very' }, 'Twenty hands. The doors give up. A cheer, and a tip.', 'Kaksikymmentä kättä. Ovet luovuttavat. Hurraa, ja tippi.')] },
  crossword: { where: 'aboard', mood: 'info', tone: 'fun', en: 'is stuck on the last word of the crossword.', fi: 'on jumissa ristikon viimeisessä sanassa.',
    opts: [O('Have a guess', 'Arvaa', { time: 10, risk: R('maybe', { e: { cash: 5 }, s: 'Five letters, "sauna". It fits. They give you their pulla money.' }, 'Viisi kirjainta, "sauna". Se sopii. He antavat sinulle pullarahansa.', { e: {}, s: 'It does not fit. They look at you differently now.' }, 'Se ei sovi. He katsovat sinua nyt eri tavalla.') }, '', ''),
      O('Pretend not to look', 'Esitä, ettet katso', { time: 0 }, 'You know it. You say nothing. It is torture.', 'Tiedät sen. Et sano mitään. Se on kidutusta.')],
    thirds: [O('Ask the whole car', 'Kysy koko vaunulta', { time: 20, pay: 1.05 }, 'Six answers. One right. Everyone is pleased with themselves.', 'Kuusi vastausta. Yksi oikein. Kaikki ovat tyytyväisiä itseensä.'),
      O('Fill it in, in pen', 'Täytä se, kuulakärkikynällä', { time: 10, pay: 1.2, tier: 'special' }, 'Confident. Correct. Applause from one pensioner.', 'Varmana. Oikein. Yksi eläkeläinen taputtaa.'),
      O('Know it before they finish asking', 'Tiedä se ennen kuin he ehtivät kysyä', { time: 0, pay: 1.5, cash: 10, tier: 'very' }, 'They frame the crossword. Your name is on it. They insist on a tip.', 'He kehystävät ristikon. Sinun nimesi on siinä. He vaativat antaa tippiä.')] },
  pickpocket: { where: 'aboard', mood: 'warning', tone: 'risky', en: 'is standing very close to your bag.', fi: 'seisoo hyvin lähellä laukkuasi.',
    opts: [O('Move your bag to the front', 'Siirrä laukku eteen', { time: 0 }, 'They move away. Probably nothing. Probably.', 'He siirtyvät pois. Luultavasti ei mitään. Luultavasti.'),
      O('Ignore it', 'Älä välitä', { time: 0, risk: R('usually', { e: {}, s: 'They get off at the next stop. Your wallet stays.' }, 'He jäävät pois seuraavalla. Lompakko pysyy.', { e: { cash: -15 }, s: 'Your coffee money is gone. So are they.' }, 'Kahvirahasi on poissa. Niin ovat hekin.') }, '', '')],
    thirds: [O('Stare at them, kindly', 'Tuijota heitä, ystävällisesti', { time: 0, pay: 1.05 }, 'They become very interested in the window.', 'Ikkuna alkaa yhtäkkiä kiinnostaa heitä kovasti.'),
      O('Tell the driver, quietly', 'Kerro kuljettajalle, hiljaa', { time: 30, cash: 10, tier: 'special' }, 'The driver waits at the next stop with two officers. A small reward.', 'Kuljettaja odottaa seuraavalla pysäkillä kahden poliisin kanssa. Pieni palkkio.'),
      O('Notice they are lifting someone else\'s wallet, and stop them', 'Huomaa heidän vievän jonkun muun lompakon, ja estä se', { time: 20, pay: 1.4, cash: 20, tier: 'very' }, 'The wallet goes back to its owner, who insists on a reward. The car approves.', 'Lompakko palaa omistajalleen, joka vaatii antaa löytöpalkkion. Vaunu hyväksyy.')] },
  proposal: { where: 'stop', mood: 'opportunity', tone: 'fun', tags: ['day'], en: 'is about to propose, and has dropped the ring.', fi: 'on kosimassa ja pudottanut sormuksen.',
    opts: [O('Search the pavement', 'Etsi jalkakäytävältä', { time: 60, risk: R('usually', { e: { pay: 1.3 }, s: 'Found, between two cobblestones. The answer is yes.' }, 'Löytyi kahden mukulakiven välistä. Vastaus on kyllä.', { e: { time: 30 }, s: 'Not found. The answer is yes anyway.' }, 'Ei löytynyt. Vastaus on silti kyllä.') }, '', ''),
      O('Hold their coffee', 'Pidä heidän kahviaan', { time: 10, pay: 1.05 }, 'Moral support. Coffee support.', 'Moraalista tukea. Kahvitukea.')],
    thirds: [O('Get the whole stop looking', 'Pane koko pysäkki etsimään', { time: 40, pay: 1.15 }, 'Twelve people bent double. The ring turns up in a boot.', 'Kaksitoista ihmistä kumarassa. Sormus löytyy saappaasta.'),
      O('Lend them your key ring', 'Lainaa heille avaimenperäsi', { time: 10, pay: 1.25, tier: 'special' }, 'A Moomin key ring. She likes it better than a ring.', 'Muumiavaimenperä. Hän pitää siitä enemmän kuin sormuksesta.'),
      O('Be the witness, there and then', 'Ole todistaja, siinä ja heti', { time: 90, pay: 1.6, cash: 15, tier: 'very' }, 'Two strangers, a tram stop, a kiss. They buy your coffee for a week.', 'Kaksi tuntematonta, ratikkapysäkki, suudelma. He tarjoavat kahvisi viikon ajan.')] },
  drone: { where: 'stop', mood: 'warning', tone: 'risky', en: 'is flying a drone right over the tram wires.', fi: 'lennättää droonia aivan ratikan ajojohtimien yllä.',
    opts: [O('Warn them', 'Varoita heitä', { time: 10, pay: 1.05 }, 'They bring it down, just. Gratitude.', 'He laskevat sen alas, nipin napin. Kiitollisuutta.'),
      O('Step back from the wires', 'Astu kauemmas johtimista', { time: 0 }, 'Wise. The drone lands in a tree.', 'Viisasta. Drooni laskeutuu puuhun.')],
    thirds: [O('Catch it as it falls', 'Ota se kiinni, kun se putoaa', { time: 0, risk: R('maybe', { e: { cash: 15 }, s: 'Caught! A finder\'s fee.' }, 'Kiinni! Löytöpalkkio.', { e: { time: 60 }, s: 'It lands in the harbour. You both watch it go.' }, 'Se laskeutuu satamaan. Katsotte molemmat, kun se menee.') }, '', ''),
      O('Ask it to film the tram coming in', 'Pyydä sitä kuvaamaan saapuva ratikka', { time: 20, cash: 8, tier: 'special' }, 'The shot is beautiful. They buy your coffee.', 'Kuva on kaunis. He ostavat kahvisi.'),
      O('Show them the open sky over the bay', 'Näytä heille avoin taivas lahden yllä', { time: 30, pay: 1.5, tier: 'very' }, 'Away from the wires, the drone climbs. The whole city on one screen, and you on it.', 'Pois johtimilta drooni nousee. Koko kaupunki yhdellä näytöllä, ja sinä siinä.')] },
  icecream: { where: 'stop', mood: 'opportunity', tone: 'fun', weather: ['clear'], en: 'is giving out free ice cream to celebrate the sun.', fi: 'jakaa ilmaista jäätelöä auringon kunniaksi.',
    opts: [O('Take one', 'Ota yksi', { time: 20, pay: 1.1 }, 'Liquorice flavour. Very Finnish. Very good.', 'Salmiakinmakuinen. Hyvin suomalainen. Hyvin hyvä.'),
      O('Say no thank you', 'Sano ei kiitos', { time: 0 }, 'Your loss. Everyone else is smiling.', 'Sinun häviösi. Kaikki muut hymyilevät.')],
    thirds: [O('Take one for the tram driver', 'Ota yksi ratikkakuskille', { time: 20, pay: 1.15 }, 'The driver eats it at the next red light. A bell, twice, for you.', 'Kuski syö sen seuraavissa punaisissa. Kello kilahtaa kahdesti, sinulle.'),
      O('Help hand them out', 'Auta jakamaan', { time: 40, cash: 8, tier: 'special' }, 'A crowd, a cooler, ten minutes of joy. They slip you eight euros.', 'Väkijoukko, kylmälaukku, kymmenen minuuttia iloa. He antavat sinulle kahdeksan euroa.'),
      O('Start a queue that goes round the block', 'Aloita jono, joka kiertää korttelin', { time: 60, pay: 1.5, cash: 10, tier: 'very' }, 'Sun, ice cream and a queue: three Finnish loves at once. They tip.', 'Aurinko, jäätelö ja jono: kolme suomalaista rakkautta kerralla. He antavat tippiä.')] },
  whistle: { where: 'walking', mood: 'notice', tone: 'scary', night: true, en: 'whistles the same three notes every time you pass a streetlight.', fi: 'viheltää samat kolme säveltä aina, kun ohitat katulampun.',
    opts: [O('Walk faster', 'Kävele nopeammin', { time: 0, risk: R('usually', { e: { pay: 1.1 }, s: 'The whistling falls behind. You arrive early, and breathless.' }, 'Vihellys jää taakse. Saavut ajoissa, hengästyneenä.', { e: { time: 60 }, s: 'The whistling keeps up. You take a long way round.' }, 'Vihellys pysyy perässä. Kierrät pitkän tien.') }, '', ''),
      O('Whistle back', 'Viheltä takaisin', { time: 10 }, 'Silence. Then four notes. You do not answer the fourth.', 'Hiljaisuus. Sitten neljä säveltä. Et vastaa neljänteen.')],
    thirds: [O('Stop under the next light', 'Pysähdy seuraavan lampun alle', { time: 30, pay: 1.05 }, 'Nothing. A cat on a wall. Probably the cat.', 'Ei mitään. Kissa muurilla. Luultavasti kissa.'),
      O('Finish the tune', 'Viheltää sävelmä loppuun', { time: 10, pay: 1.2, tier: 'special' }, 'A window opens above you and someone claps, once.', 'Ikkuna aukeaa yläpuolellasi, ja joku taputtaa, kerran.'),
      O('Turn round and ask the way', 'Käänny ja kysy tietä', { time: 20, pay: 1.6, tier: 'very' }, 'An old lamplighter, still on his round after fifty years. He knows a short cut, and shows you.', 'Vanha lampunsytyttäjä, yhä kierroksellaan viidenkymmenen vuoden jälkeen. Hän tietää oikotien ja näyttää sen.')] },
  lasttram: { where: 'stop', mood: 'notice', tone: 'scary', night: true, en: 'says the last tram left an hour ago, and is waiting anyway.', fi: 'sanoo, että viimeinen ratikka lähti tunti sitten, ja odottaa silti.',
    opts: [O('Wait with them', 'Odota heidän kanssaan', { time: 60, risk: R('maybe', { e: { pay: 1.3 }, s: 'A tram comes anyway. Lit, empty, exactly on time.' }, 'Ratikka tulee silti. Valaistu, tyhjä, täsmälleen ajallaan.', { e: { time: 60 }, s: 'Nothing comes. You walk, and they keep waiting.' }, 'Mitään ei tule. Kävelet, ja he jäävät odottamaan.') }, '', ''),
      O('Check the timetable', 'Tarkista aikataulu', { time: 10 }, 'The timetable says nothing about tonight at all.', 'Aikataulu ei kerro tästä yöstä mitään.')],
    thirds: [O('Walk to the next stop', 'Kävele seuraavalle pysäkille', { time: 90 }, 'When you look back, the stop is empty.', 'Kun katsot taaksesi, pysäkki on tyhjä.'),
      O('Ask which tram they mean', 'Kysy, mitä ratikkaa he tarkoittavat', { time: 20, pay: 1.2, tier: 'special' }, 'A line number that has not run since 1953. They smile. So do you, nervously.', 'Linjanumero, jota ei ole ajettu vuoden 1953 jälkeen. He hymyilevät. Niin sinäkin, hermostuneesti.'),
      O('Wait until it comes, and get on', 'Odota, kunnes se tulee, ja nouse kyytiin', { time: 30, pay: 1.6, tier: 'very' }, 'An old wooden tram, warm inside. It stops right at your drop. You never see it again.', 'Vanha puinen ratikka, sisältä lämmin. Se pysähtyy aivan kohteesi kohdalle. Et näe sitä enää koskaan.')] },
};

export const TWIST = {
  sunny: W('It is the first properly sunny day in weeks.', 'On ensimmäinen kunnon aurinkoinen päivä viikkoihin.', ['clear']),
  wind: W('The wind off the sea is trying to steal everyone\'s hat.', 'Merituuli yrittää varastaa kaikkien hatut.'),
  late: W('The tram is late again.', 'Ratikka on taas myöhässä.'),
  gulls: W('Three gulls are watching from the roof.', 'Kolme lokkia tarkkailee katolta.'),
  coffee: W('Somewhere nearby, somebody is roasting coffee.', 'Jossain lähellä paahdetaan kahvia.'),
  bells: W('The cathedral bells start for no reason.', 'Tuomiokirkon kellot alkavat soida ilman syytä.', ['day']),
  snowing: W('It is snowing sideways.', 'Lunta sataa sivuttain.', ['snow']),
  slush: W('The slush is ankle-deep.', 'Loska on nilkkoihin asti.', ['snow', 'rain']),
  fog: W('The fog has eaten the top of every building.', 'Sumu on syönyt jokaisen talon yläosan.', ['fog']),
  quiet: W('The city is strangely quiet.', 'Kaupunki on oudon hiljainen.'),
  market: W('It is market day, and everything smells of fish.', 'On toripäivä, ja kaikki haisee kalalle.', ['day']),
  hockey: W('Last night, Finland won at hockey.', 'Eilen illalla Suomi voitti jääkiekossa.'),
  neon: W('The street lights hum.', 'Katuvalot hurisevat.', ['night']),
  stars: W('You can see stars over the harbour.', 'Sataman yllä näkyy tähtiä.', ['night', 'clear']),
  // (v3.25) eleven more
  trumpet: W('Somebody is learning the trumpet in an open window.', 'Joku opettelee trumpetinsoittoa avoimen ikkunan ääressä.'),
  bell: W('A tram bell rings twice, for no one.', 'Ratikan kello kilahtaa kahdesti, ei kenellekään.'),
  buns: W('The air smells of cinnamon buns.', 'Ilma tuoksuu korvapuusteilta.'),
  croissant: W('A gull is eating a whole croissant.', 'Lokki syö kokonaista croissanttia.'),
  shades: W('Everyone is wearing sunglasses.', 'Kaikilla on aurinkolasit.', ['clear', 'day']),
  ferry: W('A ferry horn sounds from the harbour.', 'Lautan torvi soi satamasta.'),
  nameday: W('It is somebody\'s name day, and they want you to know.', 'Jollakulla on nimipäivä, ja hän haluaa sinun tietävän sen.'),
  ice: W('The ice on the bay is groaning.', 'Lahden jää natisee.', ['snow']),
  moon: W('The moon is very large tonight.', 'Kuu on tänä yönä hyvin suuri.', ['night']),
  organ: W('A street organ is playing a waltz.', 'Posetiivi soittaa valssia.', ['day']),
  snowman: W('Somebody has built a tiny snowman on the bench.', 'Joku on rakentanut penkille pienen lumiukon.', ['snow']),
};

// a small hash (FNV-1a with a final mix) and a generator from it
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const pickOf = (list, key) => list[hash(key) % list.length];
// The third is ordinary three times in five, special about one in four, very special one in eight.
export const TIERS = { special: 25, very: 12 };

// Which parts can go together: a WANT's place and weather, the run's tones, and the hour.
export function fits(want, { places = null, weather = 'clear', night = false, tones = { fun: 1 } } = {}) {
  const w = WANT[want]; if (!w) return false;
  if (places && !places.includes(w.where)) return false;
  if (w.weather && !w.weather.includes(weather)) return false;
  if (w.night && !night) return false; if (w.tags?.includes('day') && night) return false;
  return (tones[w.tone] || 0) > 0;
}
const whoFits = (id, night) => !(night ? WHO[id].tags.includes('day') : WHO[id].tags.includes('night'));
const twistFits = (id, weather, night) => { const t = TWIST[id].tags; return (!t.includes('day') || !night) && (!t.includes('night') || night) && (!t.some(x => ['clear', 'snow', 'rain', 'fog'].includes(x)) || t.includes(weather)); };

// Make one card from modules. `key` is any string the caller makes unique (the
// run's seed and the slot); `avoid` lists WANTs already in the deck.
export function makeCard(key, ctx = {}, avoid = []) {
  const night = !!ctx.night, weather = ctx.weather || 'clear';
  const wants = Object.keys(WANT).filter(w => fits(w, ctx) && !avoid.includes(w)); if (!wants.length) return null;
  // a want is drawn as often as the run's tones ask for it (NIGHT is mostly scary),
  // and the day's boost (days.js: a festival brings out the accordion)
  const tw = wants.map(x => (ctx.tones?.[WANT[x].tone] ?? 1) * (ctx.boost?.[x] ?? 1)), total = tw.reduce((a, b) => a + b, 0);
  let r = (hash(`${key}|want`) / 4294967296) * total, want = wants[wants.length - 1];
  for (let i = 0; i < wants.length; i++) { r -= tw[i]; if (r < 0) { want = wants[i]; break; } }
  const w = WANT[want];
  const who = pickOf(Object.keys(WHO).filter(id => whoFits(id, night)), `${key}|who`);
  const twist = pickOf(Object.keys(TWIST).filter(id => twistFits(id, weather, night)), `${key}|twist`);
  const roll = hash(`${key}|tier`) % 100, k = roll < TIERS.very ? 2 : roll < TIERS.very + TIERS.special ? 1 : 0;
  const third = w.thirds[k];
  const text = `${WHO[who].en} ${w.en} ${TWIST[twist].en}`, textFi = `${WHO[who].fi} ${w.fi} ${TWIST[twist].fi}`;
  const fi = { [text]: textFi };
  const opt = o => { const { fi: lf, sayFi, winFi, loseFi, ...e } = o; fi[o.label] = lf; if (o.say) fi[o.say] = sayFi;
    if (o.risk) { fi[o.risk.win.say] = o.risk.winFi; fi[o.risk.lose.say] = o.risk.loseFi; e.risk = { odds: o.risk.odds, win: o.risk.win, lose: o.risk.lose }; }
    return e; };
  return { id: `m:${who}.${want}.${twist}.${k}`, module: { who, want, twist, third: k }, tone: [w.tone], where: w.where, mood: w.mood, text,
    options: [...w.opts.map(opt), opt(third)], fi };
}
// How many different cards the modules can make (before the third is drawn).
export const variety = () => Object.keys(WHO).length * Object.keys(WANT).length * Object.keys(TWIST).length;

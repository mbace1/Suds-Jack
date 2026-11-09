// Toko Move v3.22 — CARDS MADE FROM MODULES (owner, 2026-11-09: "game needs
// more variety, fun options, etc. There can be 100x content so it never feels
// stale. These can also be randomized from modules, so the game actually
// becomes like a roguelike").
//
// A story card is put together from three parts and a draw:
//   WHO    somebody at the stop, aboard or on the street (26)
//   WANT   what they are doing or need, with its two ordinary options and three
//          possible thirds — ordinary, special, very special (21)
//   TWIST  one line of the day around it (14)
// 26 × 21 × 14 is over 7,500 cards before the third is drawn, against the 46
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
  // a want is drawn as often as the run's tones ask for it (NIGHT is mostly scary)
  const tw = wants.map(x => ctx.tones?.[WANT[x].tone] ?? 1), total = tw.reduce((a, b) => a + b, 0);
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

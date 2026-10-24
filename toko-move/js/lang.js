// Toko Move — LANGUAGE (v2.66, roadmap M5: "Finnish and English at least, the
// arcade's house convention (fi/en/ja) as the target").
//
// The game's words live where they are drawn — in ~20 modules' templates and
// data tables — and a rewrite of every one of them into t('key') calls would be
// the largest diff this game has had, for a change no player can see in
// English. So translation happens at the one place every word passes through:
// the DOM. English stays the SOURCE, written inline as it always was; this
// module watches the page and swaps each text node (and every aria-label,
// title and placeholder) for its Finnish, with English as the per-string
// fallback — the house convention (eeri's lang.js, toko's dialogue packs).
//
// How a string is found, in order:
//   1. EXACT — the whole trimmed text is a key in FI;
//   2. SEGMENTS — this game joins facts with " · ", so a line like
//      "from Lasipalatsi · 8 min left · tram network only" is three lookups;
//   3. PATTERNS — a regexp with the place names and numbers captured, for the
//      lines that carry them ("in 5 min", "BOARD ONE OF 3", "to Kamppi").
// Place names are Finnish already and are never inflected: a pattern puts a
// name where Finnish needs no case ending ("→ Kamppi", "vaihto: Eira"), because
// a wrong ending on a stop's name is worse than an arrow.
//
// What is NOT translated, and why it is safe: anything inside [translate="no"]
// (the language switch itself), <script>/<style>/<canvas>, and text that is
// already an output of this table (so a node rewritten by the game every tick
// is never translated twice). Canvas text (the map's TAP · GET OFF, the
// rival's countdown, the poster, the floaters) has no DOM node; those call
// tr() where they draw.
//
// The Finnish is a DRAFT written to the game's register, not a native read —
// the same caveat toko/'s packs carry. test/lang.cjs plays real shifts in
// Finnish and fails on any English left on screen, which is what keeps a new
// English line from shipping silently untranslated.
const KEY = 'tokoMoveLang';
export const LANGS = ['en', 'fi'];

function pick() {
  let q = null; try { q = new URLSearchParams(location.search).get('lang'); } catch {}
  let store = null; try { store = globalThis.localStorage; } catch {}
  if (q && LANGS.includes(q)) { try { store?.setItem(KEY, q); } catch {} return q; }
  try { const s = store?.getItem(KEY); if (LANGS.includes(s)) return s; } catch {}
  const nav = (globalThis.navigator?.languages || [globalThis.navigator?.language || '']).map(x => String(x).toLowerCase());
  return nav.some(x => x.startsWith('fi')) ? 'fi' : 'en';
}
export const LANG = typeof location === 'undefined' ? 'en' : pick();

// ── the table ────────────────────────────────────────────────────────────
// Keys are the English exactly as the game writes it, after trimming.
export const FI = new Map(Object.entries({
  // title card
  'PLAYABLE BUILD': 'PELATTAVA VERSIO',
  'five minutes': 'viisi minuuttia',
  'A courier on the real Helsinki trams. Take a job, catch what is coming, get off where it says.': 'Lähetti oikeissa Helsingin ratikoissa. Ota keikka, nappaa se mikä on tulossa, jää pois oikealla pysäkillä.',
  'Three deliveries before 08:15. Drops on the way are extra.': 'Kolme toimitusta ennen kello 8.15. Matkan varrelta saa lisää.',
  'START SHIFT': 'ALOITA VUORO',
  'LOADING HELSINKI…': 'LADATAAN HELSINKIÄ…',
  'MAP LOAD FAILED': 'KARTAN LATAUS EPÄONNISTUI',
  'TAKE ONE FIRST': 'VALITSE ENSIN YKSI',
  'OR THE WEEK': 'TAI VIIKKO',
  'five shifts, rent due Friday': 'viisi vuoroa, vuokra perjantaina',
  'OR LIVE': 'TAI LIVE',
  'the real trams, right now': 'oikeat ratikat, juuri nyt',
  'TRANSPORT BOARD': 'KULJETUSTAULU',
  'RUN THE DAY AGAIN': 'PELAA PÄIVÄ UUDELLEEN',
  'RUN THIS SHIFT AGAIN': 'PELAA VUORO UUDELLEEN',
  'ANOTHER LIVE SHIFT': 'UUSI LIVE-VUORO',
  'LIVE · THE REAL MORNING': 'LIVE · OIKEA AAMU',
  // HUD and map controls
  'MAP': 'KARTTA', 'STOP': 'LÄHI', 'ROUTE': 'REITTI', 'CITY': 'KOKO',  // the zoom rail is 44px wide
  'EXACT HSL LAYERS': 'HSL:N TARKAT LINJAT', 'TRAMS': 'RATIKAT', 'METRO': 'METRO', 'ALL': 'KAIKKI',
  'cargo': 'lasti', 'deliveries': 'toimitukset', 'bag': 'laukku', 'time left on this job': 'aikaa jäljellä tällä keikalla',
  'score': 'pisteet', 'on-time streak': 'ajallaan-putki', 'next': 'seuraava', 'back to the courier': 'takaisin lähettiin',
  'Helsinki HSL network with moving gameplay trams and metro': 'Helsingin HSL-verkko, ratikat ja metro liikkeessä',
  'HSL network': 'HSL-verkko', 'full Helsinki source pack': 'koko Helsingin lähdeaineisto',
  'LIVE · FEED LOST · TIMETABLE': 'LIVE · YHTEYS POIKKI · AIKATAULU', 'LIVE · NO FEED · TIMETABLE': 'LIVE · EI YHTEYTTÄ · AIKATAULU',
  'TAP · GET OFF': 'NAPAUTA · JÄÄ POIS',
  // the dispatch board
  'Pick a job. The badge is the tram that takes you.': 'Valitse keikka. Merkki kertoo, mikä ratikka vie perille.',
  'TAKE JOB': 'OTA KEIKKA', 'CARRY AS SECOND JOB': 'OTA TOISEKSI KEIKAKSI', '2nd': '2.',
  'change': 'vaihto', 'now': 'nyt', 'beat him': 'ehdi ensin', 'beat her': 'ehdi ensin',
  'no useful vehicle': 'ei sopivaa vuoroa', 'cannot get there': 'sinne ei pääse', 'nothing scheduled': 'ei vuoroja',
  'job offer expired': 'keikka ehti mennä', 'offer gone': 'keikka meni jo', 'the bag is full': 'laukku on täynnä',
  'TAKE ONE MORE?': 'OTATKO VIELÄ YHDEN?', 'Both clocks run at once.': 'Molemmat kellot käyvät yhtä aikaa.',
  'CARRYING 2': 'KANNAT KAHTA', 'SWAP DELIVERY ORDER': 'VAIHDA TOIMITUSJÄRJESTYS',
  'asks for you': 'kysyy sinua',
  // the catch board
  'CATCH': 'NAPPAA', 'WAIT': 'ODOTA', 'WAIT AT HUB': 'ODOTA SOLMUPYSÄKILLÄ',
  'Tap the ringed tram on the map, or here.': 'Napauta kartalta renkaalla merkittyä ratikkaa, tai tästä.',
  'Nothing to catch yet': 'Ei vielä mitään napattavaa',
  'the rest is in the fog': 'loput ovat sumussa', 'in the fog': 'sumussa',
  'full · wait for the next': 'täynnä · odota seuraavaa', 'full': 'täynnä', 'wait for the next': 'odota seuraavaa',
  'no service': 'ei liikennettä', 'that one is not catchable': 'sitä ei voi napata', 'not at your stop': 'ei sinun pysäkilläsi',
  'OR WALK': 'TAI KÄVELE', 'nothing to catch there yet': 'siellä ei vielä ole napattavaa',
  'ON YOUR WAY': 'MATKAN VARRELLA', 'drop on the way': 'jätä matkalla', 'no room in the bag': 'laukussa ei ole tilaa',
  'Nothing within reach of this stop right now.': 'Tältä pysäkiltä ei juuri nyt pääse mihinkään.',
  // riding
  'Get off here': 'Jää pois tästä', 'get off here': 'jää pois tästä',
  'GET OFF': 'JÄÄ POIS', 'not riding': 'et ole kyydissä', 'wait until the vehicle reaches another stop': 'odota, kunnes vaunu on seuraavalla pysäkillä',
  'not waiting to get off': 'et ole jäämässä pois', 'not at that stop': 'ei sillä pysäkillä',
  'full — wait for the next one': 'täynnä — odota seuraavaa', 'you are helping someone': 'autat jotakuta',
  'cannot walk now': 'nyt ei voi kävellä', 'that walking link is not available': 'sitä kävelyreittiä ei voi käyttää',
  'no service selected': 'vuoroa ei ole valittu', 'not waiting for a service': 'et odota vuoroa',
  'that service does not cover the selected leg': 'se vuoro ei kulje tätä osuutta',
  'drops are taken before boarding': 'lisäkeikat otetaan ennen kyytiin nousua', 'already carrying one for that stop': 'kannat jo yhtä sille pysäkille',
  'job order can only change before departure': 'järjestystä voi vaihtaa vain ennen lähtöä',
  'second job can only be collected before leaving this pickup hub': 'toisen keikan voi ottaa vain ennen kuin lähdet noutopaikalta',
  'TIGHT CONNECTION': 'TIUKKA VAIHTO', 'AT HUB': 'SOLMUPYSÄKILLÄ',
  'transfer hub. Wait for the next service.': 'vaihtopysäkki. Odota seuraavaa vuoroa.',
  'choose again from here.': 'valitse uudelleen tästä.', 're-plan from here.': 'suunnittele uudelleen tästä.',
  'choose transit or keep walking.': 'valitse kyyti tai jatka kävellen.',
  'choose a tram or metro to catch.': 'valitse ratikka tai metro.',
  'Choose which destination to tackle first.': 'Valitse, kumpi viedään ensin.',
  'ON TIME': 'AJALLAAN', 'FRESH BONUS': 'TUOREUSBONUS', 'FRAGILE SAFE': 'EHJÄNÄ PERILLÄ', 'EXPRESS BONUS': 'PIKABONUS',
  'shift complete': 'vuoro valmis',
  // cargo
  'documents': 'asiakirjat', 'hot food': 'lämmin ruoka', 'fresh food': 'tuoreruoka', 'market goods': 'torikamat', 'fragile': 'särkyvä', 'express': 'pika',
  'small': 'pieni', 'medium': 'keskikokoinen', 'large': 'iso', 'parcel': 'paketti',
  'Flexible routing': 'Vapaa reitti', 'Freshness falls fast': 'Tuoreus laskee nopeasti', 'No special restriction': 'Ei erityisrajoituksia',
  'Tram only — avoid transfers': 'Vain ratikka — vältä vaihtoja', 'Transit only; no walking shortcut': 'Vain joukkoliikenne; ei kävelyoikoteitä',
  'Priority courier — metro or tram': 'Kiirelähetti — metro tai ratikka', 'Freshness bonus for speed': 'tuoreusbonus nopeudesta',
  'freshness bonus for speed': 'tuoreusbonus nopeudesta', 'tram network only': 'vain ratikkaverkko', 'Tram network only': 'Vain ratikkaverkko',
  'tram only': 'vain ratikka', 'transit only': 'vain joukkoliikenne', 'priority courier': 'kiirelähetti', 'flexible routing': 'vapaa reitti',
  'freshness falls fast': 'tuoreus laskee nopeasti', 'no special restriction': 'ei erityisrajoituksia',
  // events
  'An old lady wants to cross Mannerheimintie. The lights are short.': 'Vanha rouva haluaa Mannerheimintien yli. Valot vaihtuvat nopeasti.',
  'Walk her across': 'Saata hänet yli', 'Walk on': 'Jatka matkaa',
  'A tourist with a paper map is looking for the cathedral. They have the whole city on it.': 'Turisti etsii paperikartan kanssa tuomiokirkkoa. Koko kaupunki on kartalla.',
  'Trade directions': 'Neuvo tie', 'Shrug': 'Kohauta olkiasi',
  'Ticket inspection. Everyone is looking for their phone.': 'Lipuntarkastus. Kaikki etsivät puhelintaan.',
  'Papers, please — waved through': 'Paperit, kiitos — pääset läpi', 'Show your ticket': 'Näytä lippusi', 'Look busy': 'Näytä kiireiseltä',
  'A wallet on the bench. Nobody around.': 'Lompakko penkillä. Ketään ei näy.',
  'Hand it in at the kiosk': 'Vie se kioskille', 'Pocket it': 'Pistä taskuun', 'Leave it': 'Jätä se',
  'A busker starts the one song you actually like.': 'Katusoittaja aloittaa sen yhden kappaleen, josta oikeasti pidät.',
  'Stay for the chorus': 'Jää kuuntelemaan kertosäe',
  'A stroller and three bags at the tram steps.': 'Lastenrattaat ja kolme kassia ratikan portailla.',
  'Lift it aboard': 'Nosta kyytiin', 'Look at your phone': 'Katso puhelintasi',
  'Someone from school gets on. It has been years.': 'Koulukaveri nousee kyytiin. Siitä on vuosia.',
  'Catch up': 'Vaihda kuulumiset', 'you nearly miss your stop': 'melkein ohitat pysäkkisi', 'Nod and look away': 'Nyökkää ja katso muualle',
  'nothing to answer': 'ei mitään vastattavaa', 'no such option': 'ei sellaista vaihtoehtoa',
  // city days and weather
  'MATCH DAY': 'OTTELUPÄIVÄ', 'The stadium fills from nine and the Töölö trams crawl all morning.': 'Stadion täyttyy yhdeksästä alkaen, ja Töölön ratikat matelevat koko aamun.',
  'MARKET MORNING': 'TORIAAMU', 'Hakaniemi market is setting up. Everybody has something that needs carrying.': 'Hakaniemen tori aukeaa. Kaikilla on jotain kannettavaa.',
  'HELSINKI DAY': 'HELSINKI-PÄIVÄ', 'The whole city is out on the street. You will be stopped more than once.': 'Koko kaupunki on kaduilla. Sinut pysäytetään useammin kuin kerran.',
  'QUIET SUNDAY': 'HILJAINEN SUNNUNTAI', 'Sunday timetable. Half the trams, empty pavements — your legs are the fast option today.': 'Sunnuntaiaikataulu. Puolet ratikoista, tyhjät jalkakäytävät — omat jalat ovat tänään nopein vaihtoehto.',
  'RAIN': 'SADE', 'FOG': 'SUMU', 'FIRST SNOW': 'ENSILUMI', 'CLEAR': 'SELKEÄÄ', 'CLEAR AND COLD': 'SELKEÄÄ JA KYLMÄÄ',
  'Wet rails. Every service runs a tenth slower.': 'Märät kiskot. Kaikki vuorot kulkevat kymmenyksen hitaammin.',
  'You can see 400 m. Past that, a tram is a rumour.': 'Näkyvyys 400 m. Sen takana ratikka on pelkkä huhu.',
  'Everything slows: services by a fifth, your feet by more.': 'Kaikki hidastuu: vuorot viidenneksellä, jalat vielä enemmän.',
  'A clear, cold morning. The city is very sharp.': 'Kirkas, kylmä aamu. Kaupunki on hyvin terävä.',
  // regulars
  'the florist': 'kukkakauppa', 'Always the same order. Always in a hurry.': 'Aina sama tilaus. Aina kiire.',
  'the print shop': 'kirjapaino', 'Proofs before the machines start.': 'Vedokset ennen kuin koneet käynnistyvät.',
  'the harbour office': 'satamakonttori', 'The boat does not wait for paperwork.': 'Laiva ei odota papereita.',
  'the lab courier': 'laboratorion lähetti', 'Cold chain. He checks the time.': 'Kylmäketju. Hän tarkistaa kellon.',
  'the market café': 'torikahvila', 'She feeds the gulls and the couriers.': 'Hän ruokkii lokit ja lähetit.',
  'the ceramics works': 'keramiikkapaja', 'Everything he sends is breakable.': 'Kaikki, mitä hän lähettää, on särkyvää.',
  // the end of a shift
  'ALL DELIVERED': 'KAIKKI TOIMITETTU', 'DAY OVER': 'PÄIVÄ OHI', 'Every job delivered.': 'Jokainen keikka toimitettu.', 'The shift ended.': 'Vuoro päättyi.',
  'best streak': 'paras putki', 'tips from regulars': 'tipit vakioasiakkailta', 'goodwill': 'hyvä maine',
  'drops on the way': 'lisäkeikat matkalla', 'stops you have been to': 'pysäkit, joilla olet käynyt',
  'cargo bonuses': 'lastibonukset', 'late jobs': 'myöhästyneet keikat',
  'THE SHIFT BACK': 'VUORO TAAKSEPÄIN', 'waiting': 'odotus', 'riding': 'kyyti', 'walking': 'kävely',
  "SHARE TODAY'S": 'JAA PÄIVÄN TULOS', 'A RANDOM SHIFT': 'SATUNNAINEN VUORO', "PLAY TODAY'S AGAIN": 'PELAA PÄIVÄN VUORO UUDELLEEN', 'PRACTICE': 'HARJOITUS',
  "today's result": 'päivän tulos', 'COPY THIS': 'KOPIOI TÄMÄ',
  // the week
  'The week is done, and so is the rent.': 'Viikko on ohi, ja vuokra maksettu.', 'The week is done. The rent is not.': 'Viikko on ohi. Vuokra ei ole maksettu.',
  'The week goes on. Your regulars remember today.': 'Viikko jatkuu. Vakioasiakkaasi muistavat tämän päivän.',
  'A BIGGER BAG': 'ISOMPI LAUKKU', 'Six units of room instead of five.': 'Kuusi yksikköä tilaa viiden sijaan.',
  'A BETTER CONTRACT': 'PAREMPI SOPIMUS', 'Every job pays a tenth more.': 'Jokainen keikka maksaa kymmenyksen enemmän.',
  'AN EASY DISPATCHER': 'LEPPOISA AJOJÄRJESTELIJÄ', 'Every deadline is 15% longer.': 'Jokainen määräaika on 15 % pidempi.',
  'BUSINESS CARDS': 'KÄYNTIKORTIT', 'Every regular knows you from the start: three pips.': 'Jokainen vakioasiakas tuntee sinut alusta asti: kolme pistettä.',
  'A GOOD NAME': 'HYVÄ MAINE', 'An on-time chain climbs ×0.3 a step, not ×0.25.': 'Ajallaan-putki nousee ×0,3 askeleelta, ei ×0,25.',
  'A COURIER APP': 'LÄHETTISOVELLUS', 'Drops on the way pay half again.': 'Lisäkeikat maksavat puolet enemmän.',
  'SAVE THE POSTER': 'TALLENNA JULISTE',
  // canvas: the floaters, the poster, the share lines
  'LATE': 'MYÖHÄSSÄ', 'MON–FRI': 'MA–PE', 'RENT PAID': 'VUOKRA MAKSETTU',
  // delivered, and how
  'COOLED': 'JÄÄHTYNYT', 'just in time': 'juuri ajoissa', 'today': 'tänään',
  'DOC': 'ASK', 'HOT': 'LÄM', 'PRT': 'OSA', 'FRG': 'SÄR', 'HVY': 'RAS', 'EXP': 'PIK', 'FRESH': 'TUORE', 'MRKT': 'TORI',
  'parts': 'osat', 'equipment': 'laitteet',
  'ALSO CALLING HERE': 'MYÖS TÄLLÄ PYSÄKILLÄ', 'not tappable': 'ei napautettavissa',
  'Press proofs to Central': 'Vedokset keskustaan', 'Hot lunch to Hietalahti': 'Lämmin lounas Hietalahteen',
  'Dock parts to West Harbour': 'Satamaosat Länsisatamaan', 'Fragile parcel to Töölö': 'Särkyvä paketti Töölöön',
  'Medical equipment to Meilahti': 'Hoitotarvikkeet Meilahteen', 'Expo courier to Messukeskus': 'Messulähetys Messukeskukseen',
  'Fresh food to Arabia': 'Tuoreruokaa Arabiaan', 'Express run to Kalasatama': 'Pikakeikka Kalasatamaan',
  'Harbour manifest south': 'Satamapaperit etelään', 'Final market run to Central': 'Viimeinen torikeikka keskustaan',
  // the stop panel, the bag, the replay
  'Everything at this stop, whether or not it is any use to you. Nothing here is tappable — board from the panel above.': 'Kaikki tämän pysäkin vuorot, oli niistä sinulle hyötyä tai ei. Näitä ei voi napauttaa — nouse kyytiin yläpuolen paneelista.',
  'tram': 'ratikka', 'metro': 'metro', 'bus': 'bussi', 'train': 'juna', 'ferry': 'lautta',
  'no job': 'ei keikkaa', 'NOT DELIVERED': 'EI TOIMITETTU', 'a moment': 'hetken',
  'handed to you here': 'tarjotaan sinulle tässä', 'change here': 'vaihda tässä', 'you have delivered here before': 'olet toimittanut tänne ennenkin',
  'is held': 'seisoo', 'crowded': 'ruuhkaa', 'crowded all morning': 'ruuhkaa koko aamun',
  'getoff': 'poistuminen', 'BUSY': 'VILKASTA', 'RUSH': 'RUUHKA',
  'Back to the arcade': 'Takaisin pelihalliin',
  'Every tram and metro train on the board is where HSL says it is right now. Real time: seventy-five minutes is seventy-five minutes. Nothing is recorded.': 'Jokainen ratikka ja metrojuna on kartalla siellä, missä HSL sanoo sen olevan juuri nyt. Oikea aika: seitsemänkymmentäviisi minuuttia on seitsemänkymmentäviisi minuuttia. Mitään ei tallenneta.',
  'FROST': 'PAKKANEN', 'COPIED': 'KOPIOITU', 'SAVED': 'TALLENNETTU', 'SHARED': 'JAETTU', 'REPLAN': 'SUUNNITTELE UUDELLEEN',
  'INTERCEPTED': 'KIINNI SAATU', 'AT THE STOP': 'PYSÄKILLÄ', 'TRAM': 'RATIKKA', 'SUBWAY': 'METRO', 'TRANSFER': 'VAIHTO', 'SOLO': 'YKSIN',
  'A NEW WEEK': 'UUSI VIIKKO', 'KIT': 'VARUSTEET', 'SECOND JOB ONBOARD': 'TOINEN KEIKKA MUKANA', 'SHARE THE WEEK AS TEXT': 'JAA VIIKKO TEKSTINÄ',
  'LIVE · CONNECTING': 'LIVE · YHDISTETÄÄN', 'LIVE · QUIET · TIMETABLE': 'LIVE · HILJAISTA · AIKATAULU', 'LIVE · UNAVAILABLE · TIMETABLE': 'LIVE · EI SAATAVILLA · AIKATAULU',
  'CONNECTING': 'YHDISTETÄÄN', 'QUIET': 'HILJAISTA', 'UNAVAILABLE': 'EI SAATAVILLA', 'TIMETABLE': 'AIKATAULU', 'FEED LOST': 'YHTEYS POIKKI', 'NO FEED': 'EI YHTEYTTÄ',
  'sound on': 'ääni päällä', 'sound off': 'ääni pois', 'PAUSED': 'TAUOLLA', 'RESUME': 'JATKA', 'The shift waits while the game is in the background.': 'Vuoro odottaa, kun peli on taustalla.',
  'Transit data: Helsinki Regional Transport Authority (HSL), CC BY 4.0': 'Liikennetiedot: Helsingin seudun liikenne (HSL), CC BY 4.0',
  'Map: © OpenStreetMap contributors, ODbL 1.0': 'Kartta: © OpenStreetMapin tekijät, ODbL 1.0', 'Districts: City of Helsinki': 'Kaupunginosat: Helsingin kaupunki',
  // the playtest card (the arcade build only)
  'Cross the Crown Bridge': 'Ylitä Kruunusillat', 'Deliver to Kruunuvuori': 'Toimita Kruunuvuoreen', 'Tap the tram': 'Napauta ratikkaa', 'Tell Toko': 'Kerro Tokolle',
  'A new stop across the bridge. No walk reaches it — only the tram.': 'Uusi pysäkki sillan takana. Sinne ei kävele — vain ratikalla.',
  'Board the ringed tram by tapping it on the MAP.': 'Nouse renkaalla merkittyyn ratikkaan napauttamalla sitä KARTALLA.',
  'The real trams, right now — the Crown Bridge ones included.': 'Oikeat ratikat, juuri nyt — myös Kruunusiltojen.',
  'One thing that felt wrong, or right. That is the whole test.': 'Yksi asia, joka tuntui väärältä, tai oikealta. Siinä koko testi.',
  'THANK YOU': 'KIITOS', 'TRY': 'KOKEILE',
  // missions card (arcade build only) and misc
  'Toko reads every note.': 'Toko lukee jokaisen viestin.', 'Each one ticks itself off when you actually do it.': 'Jokainen kuittaantuu itsestään, kun oikeasti teet sen.',
}));

// Lines that carry names and numbers. Each is [regexp, replacement] and is
// tried on one " · " segment at a time.
const PATTERNS = [
  [/^in (\d+) min$/, '$1 min päästä'],
  [/^in (\d+) s$/, '$1 s päästä'],
  [/^(~?\d+) min left$/, '$1 min jäljellä'],
  [/^about (\d+ min)$/, 'noin $1'],
  [/^(\d+) min ago$/, '$1 min sitten'],
  [/^about (\d+) min ago$/, 'noin $1 min sitten'],
  [/^first in (\d+) min$/, 'ensimmäinen $1 min päästä'],
  [/^first now$/, 'ensimmäinen nyt'],
  [/^BOARD ONE OF (\d+)$/, 'VALITSE KYYTI ($1)'],
  [/^to (.+)$/, 'kohde $1'],
  [/^from (.+)$/, 'lähtö $1'],
  [/^change at (.+)$/, 'vaihto: $1'],
  [/^saves (.+)$/, 'säästää $1'],
  [/^\+(\d+) min change$/, '+$1 min vaihto'],
  [/^DISPATCH$/, 'KEIKAT'],
  [/^ON (TRAM|METRO|TRANSIT|BUS|TRAIN) (\S*) → (.+)$/, (m, mode, line, to) => `${({ TRAM: 'RATIKASSA', METRO: 'METROSSA', TRANSIT: 'KYYDISSÄ', BUS: 'BUSSISSA', TRAIN: 'JUNASSA' })[mode]} ${line} → ${to}`],
  [/^GET OFF lights at (.+)\.$/, 'JÄÄ POIS syttyy pysäkillä $1.'],
  [/^(\S+) is coming for it$/, '$1 tulee hakemaan sen'],
  [/^(\S+) took the (.+) job\.$/, '$1 vei keikan: $2.'],
  [/^(\S+) delivered$/, '$1 toimitti'],
  [/^took (.+)$/, 'vei $1'],
  [/^(\d+) days running$/, '$1 päivää putkeen'],
  [/^practice — today's result stands at (.+)$/, 'harjoitus — päivän tulos on $1'],
  [/^ONE OF (\d+)$/, 'YKSI $1:STÄ'],
  [/^DAILY (\d+)$/, 'PÄIVÄN VUORO $1'],
  [/^SHIFT (\d+)$/, 'VUORO $1'],
  [/^(\d+) of (\d+)$/, '$1 / $2'],
  [/^€(\d+) banked$/, '€$1 kasassa'],
  [/^rent €(\d+) on Friday$/, 'vuokra €$1 perjantaina'],
  [/^€(\d+) of €(\d+)$/, '€$1 / €$2'],
  [/^about €(\d+) a shift to go$/, 'noin €$1 vuorolta loppuun'],
  [/^rent paid$/, 'vuokra maksettu'],
  [/^€(\d+) over$/, '€$1 yli'],
  [/^short €(\d+) on the rent$/, 'vuokrasta puuttuu €$1'],
  [/^CONTINUE THE WEEK$/, 'JATKA VIIKKOA'],
  [/^TONIGHT, TAKE ONE FOR (\w+)$/, 'TÄNÄ ILTANA: VALITSE YKSI HUOMISEEN'],
  [/^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)$/, (m, d) => DAYS_UP[d].replace(/ $/, '')],
  [/^(MON|TUE|WED|THU|FRI)$/, (m, d) => ({ MON: 'MA', TUE: 'TI', WED: 'KE', THU: 'TO', FRI: 'PE' })[d]],
  [/^(\d+) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/, (m, n, mo) => `${n}.${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(mo) + 1}.`],
  [/^\+(\d+) drops$/, '+$1 lisäkeikkaa'],
  [/^(\d+)% ([a-z].*)$/, (m, n, rest) => `${n} % ${tr(rest)}`],
  [/^ARRIVED$/, 'PERILLÄ'], [/^ARRIVED ON FOOT$/, 'KÄVELLEN PERILLÄ'],
  [/^OFF EARLY$/, 'POIS ETUAJASSA'], [/^EARLY GET OFF$/, 'POIS ETUAJASSA'],
  [/^WAITING$/, 'ODOTUS'],
  [/^DROP ON THE WAY$/, 'LISÄKEIKKA MATKALLA'],
  [/^SECOND JOB$/, 'TOINEN KEIKKA'],
  [/^CARRY 2$/, 'KANNAT KAHTA'],
  [/^STRAIGHT ON$/, 'SUORAAN'],
  [/^ORDER CHANGED$/, 'JÄRJESTYS VAIHDETTU'],
  [/^FIRST TIME AT (.+)$/, 'ENSI KERTAA: $1'],
  [/^SHOWN THE WAY$/, 'TIE NÄYTETTY'],
  [/^(.+) is walkable from here$/, '$1 on kävelymatkan päässä'],
  [/^(.+) queued\. Choose which destination to tackle first\.$/, '$1 jonossa. Valitse, kumpi viedään ensin.'],
  [/^\+(\d+)% for taking it at the door\.$/, '+$1 % kun otat sen ovelta.'],
  [/^deliver (.+) first, then (.+)\.$/, 'vie ensin $1, sitten $2.'],
  [/^still carrying (.+)\. Deliver to (.+)\.$/, (m, c, to) => `kannat yhä: ${tr(c)}. Vie: ${to}.`],
  [/^(.+) cannot use that service$/, (m, c) => `${tr(c)} ei voi käyttää sitä vuoroa`],
  [/^(.+) must stay on transit$/, (m, c) => `${tr(c)} pysyy joukkoliikenteessä`],
  [/^(\S+) is not running on the gameplay network$/, '$1 ei kulje pelin verkossa'],
  [/^(\d+) jobs available at (.+)\.$/, '$1 keikkaa tarjolla: $2.'],
  [/^Early exit at (.+)$/, 'Poistuminen etuajassa: $1'],
  [/^A car is parked on the rails — (\S+) is held for a few minutes\.$/, 'Auto parkissa kiskoilla — $1 seisoo muutaman minuutin.'],
  [/^Points failure — (\S+) is standing at the next stop\.$/, 'Vaihdevika — $1 seisoo seuraavalla pysäkillä.'],
  [/^A passenger is unwell — (\S+) waits for the ambulance\.$/, 'Matkustaja on sairastunut — $1 odottaa ambulanssia.'],
  [/^(.+) after walking$/, '$1 kävelyn jälkeen'],
  [/^(\d+ s) margin$/, '$1 marginaali'],
  [/^at (.+) you boarded a (.+) plan$/, (m, a, b) => `${a}: nousit ${tr(b)} reitille`],
  [/^a (.+) one was on the board$/, (m, b) => `${tr(b)} reitti oli tarjolla`],
  [/^Walking to (.+)$/, 'Kävelet: $1'],
  [/^(\d+) services call here$/, '$1 vuoroa pysähtyy tässä'],
  [/^TESTED$/, 'TESTATTU'],
  [/^Ride tram (\d+) or (\d+) — the new lines over the water, on the board since this morning’s HSL feed\.$/, 'Aja ratikalla $1 tai $2 — uudet linjat veden yli, kartalla tämän aamun HSL-datasta.'],
  [/^ALL (\d+)$/, 'KAIKKI $1'], [/^TEST v([\d.]+)$/, 'TESTI v$1'], [/^(\d+)\/(\d+) TRIED$/, '$1/$2 KOKEILTU'],
  [/^shift #?(\d+)$/, 'vuoro $1'], [/^covered$/, 'katettu'],
  [/^BEAT (\S+)$/, 'VOITA $1'], [/^beat (?:him|her|them)( .*)?$/, (m, rest) => `ehdi ensin${rest || ''}`],
  [/^WALK (.+?) → (\S+) (in \d+ min|now)$/, (m, a, l, w) => `KÄVELE ${tr(a)} → ${l} ${tr(w)}`],
  [/^WALK$/, 'KÄVELY'],
  [/^LIVE · HELSINKI ([\d:.]+)$/, 'LIVE · HELSINKI $1'],
  [/^HSL pack (.+)$/, 'HSL-aineisto $1'],
  [/^bag (\d+) of (\d+)$/, 'laukku $1/$2'],
  [/^MISSED (\S+)$/, 'MENI OHI $1'],
  [/^~(\d+) min ago$/, '~$1 min sitten'],
  [/^(waiting|riding|walking|getoff) (now|\d+ min|\d+%)$/, (m, k, t) => `${FI.get(k)} ${t === 'now' ? 'hetki' : t}`],
  [/^(now|~?\d+ min) left$/, (m, t) => `${t === 'now' ? 'nyt' : t} jäljellä`],
  [/^\+(now|\d+ min) change$/, (m, t) => `+${t === 'now' ? 'heti' : t} vaihto`],
  [/^([A-Z][A-Z ]+) (×[\d.,]+)$/, (m, a, x) => `${tr(a)} ${x}`],
  [/^\+(\d+) \(\+(\d+) tip\)$/, '+$1 (+$2 tippi)'],
  [/^LATE by (.+)$/, (m, t) => `MYÖHÄSSÄ ${tr(t)}`],
  [/^(\d+ min) to spare$/, '$1 aikaa jäi'],
  [/^Walk exits: (.+)$/, (m, x) => `Kävellen: ${x.replace(/ now\b/g, ' nyt')}`],
  [/^START (MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)$/, (m, d) => `ALOITA ${DAYS_UP[d].trim()}`],
  [/^([A-Z][A-Z ]+[A-Z]): (.+)$/, (m, a, b) => `${tr(a)}: ${tr(b)}`],
  [/^(\d+)\/(\d+)$/, '$1/$2'],
  [/^WEEK (\d+)$/, 'VIIKKO $1'], [/^week (\d+)$/, 'viikko $1'],
  [/^€(\d+) OVER$/, '€$1 YLI'], [/^SHORT €(\d+) ON THE RENT$/, 'VUOKRASTA PUUTTUU €$1'],
  [/^rent €(\d+)$/, 'vuokra €$1'], [/^€(\d+) earned$/, '€$1 ansaittu'],
  [/^(MON|TUE|WED|THU|FRI) (.+?)( \(left\))?$/, (m, d, rest, left) => `${({ MON: 'MA', TUE: 'TI', WED: 'KE', THU: 'TO', FRI: 'PE' })[d]} ${rest}${left ? ' (kesken)' : ''}`],
  [/^kit (.+)$/, 'varusteet $1'],
];
const DAYS_UP = { MONDAY: 'MAANANTAI ', TUESDAY: 'TIISTAI ', WEDNESDAY: 'KESKIVIIKKO ', THURSDAY: 'TORSTAI ', FRIDAY: 'PERJANTAI ' };

// What still reads as English after the table has had its go — the gate's
// test, and the record a session keeps of what this table is missing.
const ENGLISH = /\b(beat|him|her|his|she|try|the|an|and|or|of|to|in|at|from|for|with|by|is|are|was|be|it|you|your|this|that|one|two|three|more|less|now|left|off|get|catch|wait|take|job|jobs|shift|day|week|rent|score|streak|late|bag|room|drops?|walk|walking|change|first|next|nothing|tap|here|board|trams?|train|stops?|route|city|map|delivered|delivery|deliveries|start|run|again|share|today|play|random|bonus|time|minutes|seconds|ago|missed|all|only|not|yes|back|pause|speed|parcel|food|fresh|hot|fragile|express|documents|small|medium|large|courier|tips?|goodwill|regulars?|loading|failed|ended|over|paid|short|banked|earned|practice|best|saves?|ready|soon|rain|snow|wet|clear|quiet|market|match|harbour|layers|exact|copy|save|poster|continue|tonight|friday|monday|tuesday|wednesday|thursday|days|running|contract|dispatcher|bigger|better|easy|good|lights|there|which|what|when|where|before|after|every|until|while|has|have|will|can|cannot|must)\b/i;

// Finnish that happens to spell an English word (TO is torstai) is output, not a miss.
const OUT = new Set([...FI.values(), 'MA', 'TI', 'KE', 'TO', 'PE']);
const cache = new Map();
export const misses = new Set();

function seg(s) {
  if (FI.has(s)) return FI.get(s);
  if (OUT.has(s)) return s;
  for (const [re, rep] of PATTERNS) if (re.test(s)) { const r = s.replace(re, rep); OUT.add(r); return r; }
  return null;
}
// One fact: the table, then the same without its trailing full stop, colon or
// dangling separator, then without a leading glyph (an event card's emoji).
function one(p) {
  let r = seg(p); if (r != null) return r;
  const lead = /^(·\s*)(.+)$/.exec(p);
  if (lead) { r = one(lead[2]); if (r != null) return lead[1] + r; }
  const tail = /^(.*?)([.:]|\s·)$/.exec(p);
  if (tail && tail[1]) { r = one(tail[1]); if (r != null) return r + tail[2]; }
  const glyph = /^((?:\p{Extended_Pictographic}|️|‍)+\s*)(.+)$/u.exec(p);
  if (glyph) { r = one(glyph[2]); if (r != null) return glyph[1] + r; }
  return null;
}
const norm = s => s.replace(/\d+/g, '#');
// Translate one string. English in, Finnish out; anything the table does not
// know comes back as it went in, and is noted if it reads as English.
export function tr(s) {
  if (LANG === 'en' || s == null) return s;
  s = String(s);
  const hit = cache.get(s); if (hit !== undefined) return hit;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
  let out;
  if (!core || OUT.has(core) || !/[A-Za-z]/.test(core)) out = core;
  else {
    // a whole line the table knows, else fact by fact, else one pattern
    out = FI.has(core) ? FI.get(core) : null;
    if (out == null && core.includes(' · ')) out = core.split(' · ').map(p => { const r = one(p); if (r == null && ENGLISH.test(p)) misses.add(norm(p)); return r ?? p; }).join(' · ');
    if (out == null) out = one(core);
    if (out == null) { if (ENGLISH.test(core)) misses.add(norm(core)); out = core; }
    OUT.add(out);
  }
  const res = m[1] + out + m[3];
  if (cache.size > 4000) cache.clear();
  cache.set(s, res);
  return res;
}

// ── the page ─────────────────────────────────────────────────────────────
const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'TEXTAREA', 'CODE']);
const ATTRS = ['aria-label', 'title', 'placeholder'];
const quiet = el => !el || SKIP.has(el.nodeName) || !!el.closest?.('[translate="no"]');
function textNode(n) { if (quiet(n.parentElement)) return; const t = tr(n.data); if (t !== n.data) n.data = t; }
function attrs(el) { if (quiet(el)) return; for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } } }
function walk(root) {
  if (root.nodeType === 3) return textNode(root);
  if (root.nodeType !== 1 || quiet(root)) return;
  attrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? textNode(n) : attrs(n);
}
// The switch, on the title card: one link, to the other language, keeping the
// rest of the address (a shift, a week) as it was.
function mountSwitch() {
  const card = document.querySelector('#title .card'); if (!card || document.getElementById('langLink')) return;
  const other = LANG === 'fi' ? 'en' : 'fi', u = new URL(location.href); u.searchParams.set('lang', other);
  const a = document.createElement('a');
  a.id = 'langLink'; a.className = 'btn ghost wide'; a.setAttribute('translate', 'no'); a.lang = other;
  a.href = u.pathname + u.search + u.hash; a.textContent = other === 'fi' ? 'SUOMEKSI' : 'IN ENGLISH';
  card.append(a);
}
export function mountLang() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = LANG;
  mountSwitch();
  if (LANG === 'en') return;
  document.title = tr(document.title);
  walk(document.body);
  new MutationObserver(list => {
    for (const r of list) {
      if (r.type === 'characterData') textNode(r.target);
      else if (r.type === 'attributes') attrs(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
if (typeof document !== 'undefined') {
  if (document.body) mountLang(); else document.addEventListener('DOMContentLoaded', mountLang, { once: true });
  globalThis.__tmLang = { LANG, tr, misses, FI };
}

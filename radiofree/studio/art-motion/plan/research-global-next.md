# Global strand: the next five (world tech, the dystopian near future)

Researched 19 Oct 2026 for Radio Free Helsinki, by a Claude (Anthropic) model. Web search only. Window: 21 Sep to
19 Oct 2026, freshest first. The owner's new brief: "global tech and military tech … the dystopian future, trying to
see how espionage and surveillance is almost at a brink of war in Finland and similar spots." This file is the
**global tech** strand: outside US AI politics (Coxon), Nordic/EU tech (Nordic) and Google (Doodle).

**How this was sourced (read first).**
- **No article page could be opened.** WebFetch failed DNS on citizenlab.ca and techcrunch.com. curl through the
  session proxy was refused (connect_rejected) for citizenlab.ca, cyberscoop.com and therecord.media.
- **Everything below comes from search-engine excerpts and summaries** (about 55 queries, in English, Spanish and
  Indonesian sources). Those summaries are machine-written, so a phrase they show in quote marks may not be the
  outlet's exact wording.
- **CONFIRMED** = carried by two or more independent newsrooms, or by a primary document plus one newsroom.
  **SINGLE-SOURCE** = one newsroom, or one newsroom and the aggregators that copy it. Reuters copies run by CTV, Times of
  Israel, Cyprus Mail and others count as one source. Figures that all trace back to one original (Vedomosti, for
  story 5) count as one source, however many outlets repeat them.
- **Quotes: none are cleared for air.** The brief allows exact quotes only if they were read in the original, and no
  original opened. Where a quote looks useful it is listed as a *candidate*, to be checked word for word first.

**Disclosure for the editor.** None of the five involves Anthropic. The Starlink hold involves the owner of SpaceXAI, a
lab that competes with Anthropic; that is one reason it is handed to the military-tech strand rather than pitched here.

**Already made, so not pitched:** A Handful of People · Committee of the Whole · Paid For By · On the Same Voluntary
Terms · The Chair Is Taken · Kill Switch · The Day After · It Was Only a Test · Same Trick, Two Verdicts · Satire
Excepted · Biodiversity Fund · On Hold · Janitor · You Looked At It · Backup Mode, plus the five in
`research-coxon-next.md` and the Japan stories in `research-japan.md` (those belong to the Toko personas). Story 4 is a
data-centre story like *Biodiversity Fund*, *On Hold* and *The Building Is on the Ballot*, but about water on an island
in Asia rather than permits in Finland or ballots in Ohio: the "global outlook" half of the house line.

**Naming:** real names only where the story is unclear without them (README, "Naming in the films"). No person needs to
be on screen in any of the five. Institutions can be named plainly where they are the story (India's Supreme Court,
Mexico's telecom regulator). Google stays **Doodle**. Proposed parody names, used only if a brand must appear:
**Disco-Tek** for the ad firm Discover-Tech (story 1), **Envidia** for Nvidia (story 4). Neither is needed; "an ad firm"
and "a US chip giant" carry both films.

**Slots.** 12:50 Helsinki reaches the European day and the Asian evening (16:20 in Delhi, 16:50 in Batam); 00:50 reaches
the Americas (15:50 in Mexico City, 17:50 ET). POSTED.md shows **Sat 24 Oct 12:50** and **Thu 29 Oct 12:50** still open.

---

## Ranked shortlist

| # | working title | the one question | slot | why this rank |
|---|---|---|---|---|
| 1 | **Approved Vendor** | Who approved the ad that hacked them? | 12:50 | Freshest (15 Oct), primary documents on both sides (Citizen Lab's report and IAB Europe's own statement), and dead centre on the owner's "espionage and surveillance" brief. The twist is process, not crime: the firm sat on the ad industry's approved list until October. |
| 2 | **Ends in 3** | Should a phone need its owner's ID to work? | 00:50 | Mandatory ID, happening now in batches: 2.2 million lines cut on 4–5 Oct, the next batch on 31 Oct. The punchline is in the regulator's own rules (a cut-off phone still gets the earthquake alert). |
| 3 | **Four Kilometres** | Who decides when the internet goes off? | 12:50 | The cleanest "who decides?" of the month: a shutdown order with no stated reason, a Supreme Court order to switch it back on, and an "unconditional apology" the ministry then called a formality. Ranked below 2 because it sits inside a live, partisan Indian dispute. |
| 4 | **Land, Power, Water** | On an island with no rivers, who gets the water first? | 12:50 | A data-centre resource story from the other end of the boom: dry taps, a blockade, and a minister's checklist two weeks later. Strong picture. Ranked 4 because the cause of the shortage is disputed and must be handled exactly. |
| 5 | **Like a Fire Extinguisher** | Who decides which websites still work? | 12:50 | Finland's neighbour, on the brink: an internet that is a list, and state firms tripling their landline budgets. The most on-brief for "brink of war", and the riskiest for reading as propaganda against a country. |

Holds, not pitched: the **Starlink speed cap** (hand to the military-tech strand), **China's and Taiwan's new export
lists**, **judges and Copilot** in England, **Brazil's runoff deepfake orders**, **Pegasus in Serbia** before its
election, and five smaller leads. See the end.

---

## 1. Approved Vendor (spyware delivered by an online ad, no click needed)

**What happened.**
- **15 Oct:** the Citizen Lab (University of Toronto) published "Exposing AdFection". It says an advertising company,
  Discover-Tech, let spyware makers use targeted online ads to infect devices. The ad only had to be **displayed**: no
  click and no download. Citizen Lab calls it the first known in-the-wild case of zero-click mercenary spyware delivered
  through targeted ads.
- **How it worked (per the report):** a small piece of code in the ad asked a server to check the device's advertising
  ID and IP address. If they matched a target, the server sent back code that could load a browser exploit and install
  the spyware. For everyone else it sent back nothing.
- **Who was hit:** at least **45 devices at one newsroom** (Al Jazeera), Windows computers, targeted in 2024 and 2025.
  Citizen Lab links them "with high confidence" to Candiru spyware. It says it does not know which government was the
  customer.
- **Scale:** Discover-Tech's ads reached more than **120,000 websites and about 75,000 apps** (Reuters). The ad-security
  firm Confiant, which co-investigated, estimates around **10 million ad impressions a day**. Citizen Lab studied about
  four billion ad-placement records.
- **The vendor list:** IAB Europe, the industry body that runs the consent framework most European websites use, said
  on 15 Oct that Discover-Tech is **suspended from its Global Vendor List** after an IAB audit found policy violations.
  Reuters says the suspension came the week before the report. ppc.land puts it on 8 Oct and says the firm had been
  listed since 2020.
- **Responses:** Google (Doodle) said it removed Discover-Tech from its ad platforms "for systematically violating our
  policies". Comcast's Beeswax also dropped it. Discover-Tech, Candiru and Microsoft's Xandr did not respond to
  Citizen Lab before publication.
- **Caveat in the report itself:** an ad impression does not by itself prove that a device was targeted or infected.

**Sources.**
- **Primary:** Citizen Lab, "Exposing AdFection: How Discover-Tech Turned Targeted Ads Into a Pipeline for Zero-Click
  Mercenary Spyware", 15 Oct 2026: https://citizenlab.ca/research/how-discover-tech-turned-targeted-ads-into-a-pipeline-for-spyware/
- **Primary:** IAB Europe, "Recent Reports Concerning a TCF Vendor, Discover-Tech", 15 Oct 2026:
  https://iabeurope.eu/recent-reports-concerning-a-tcf-vendor-discover-tech/
- **Primary (co-investigator):** Confiant, "ADINT: Weaponized Ad Tech for Zero-Click Spyware and Mass Identity
  Vacuuming": https://blog.confiant.com/p/adint-weaponized-ad-tech-for-zero-click-spyware-and-mass-identity-vacuuming
- Reuters, "Israeli firm used online ads to run vast spy operation, researchers say", 15 Oct 2026 (via CTV and Times of
  Israel): https://www.ctvnews.ca/sci-tech/article/israeli-firm-used-online-ads-to-run-vast-spy-operation-researchers-say/ ·
  https://www.timesofisrael.com/israeli-company-used-online-ads-to-run-vast-spy-operation-researchers-say/
- TechCrunch, "Governments are hacking people with 'zero-click' spyware by showing them online ads", 15 Oct 2026:
  https://techcrunch.com/2026/10/15/citizen-lab-says-governments-are-abusing-online-ads-to-hack-people-with-zero-click-spyware/
- The Record: https://therecord.media/spyware-citizen-lab-advertising
- CyberScoop: https://cyberscoop.com/adfection-zero-click-spyware-discover-tech/
- Dark Reading: https://www.darkreading.com/data-privacy/adfection-online-ads-spyware-delivery
- Committee to Protect Journalists, Oct 2026: https://cpj.org/2026/10/report-israeli-ad-tech-firm-enables-spyware-targeting-of-at-least-45-al-jazeera-devices/
- ppc.land (the 2020 listing and 8 Oct date): https://ppc.land/google-drops-ad-vendor-it-listed-since-2020-after-45-device-spyware-attack/

**Status of the claims.**
- **CONFIRMED** (Citizen Lab report plus Reuters, TechCrunch, The Record, CyberScoop): ads that infect on display, no
  click; at least 45 newsroom devices; the Candiru link; no named government customer.
- **CONFIRMED** (IAB Europe's statement plus Reuters): suspended from the industry's vendor list after an audit.
- **CONFIRMED** (Google's statement via Reuters and TechCrunch): removed from Doodle's ad platforms.
- **SINGLE-SOURCE:** the 8 Oct suspension date and "listed since 2020" (ppc.land). "About 75,000 apps" is Reuters; other
  outlets give "almost 200,000 websites and apps" combined.
- **Estimate, not a count:** Confiant's 10 million impressions a day.

**Quotes.** None cleared. Candidates, to be checked first:
- Google, per Reuters: removed "for systematically violating our policies".
- A researcher, per Reuters: "The way online advertising works today is a systemic security threat."

**The one question:** *Who approved the ad that hacked them?*

**Three facts:**
1. On 15 October, researchers showed online ads delivering spyware: the ad only had to appear. No click.
2. At least 45 computers at one newsroom were targeted this way, through a firm whose ads reached 120,000 websites.
3. The firm was on the ad industry's approved-vendor list until an audit suspended it in October.

**Punchline (≤ 12 words):**
- Main: *"Approved vendor. Until October."*
- Alternative: *"Perfectly targeted. Audience: one laptop."*
- Alternative: *"No click needed. Just an audience."*

**Papercut, four shots:**
1. Night in a newsroom. A masked reporter types at a paper laptop. In the corner of the web page, a cheerful banner ad
   slides in: a paper sun and SALE. The cursor never moves.
2. Close on the banner. The paper sun opens like an eye. A thin red thread runs out of the ad, off the screen and across
   a paper city map.
3. The thread ends in an auction hall: rows of masked bidders with paddles. One paddle reads AUDIENCE: 1. On the
   auctioneer's lectern sits a clipboard headed APPROVED VENDORS, every line ticked.
4. A rubber stamp comes down on one line: SUSPENDED, dated OCT. Cut back to the newsroom: the laptop is still glowing.
   End card with the line.

**Risks.**
- **No nation, no newsroom on screen.** The firm is Israeli and the newsroom is Al Jazeera, which drags the film into a
  war it is not about. The satire is aimed at ad-tech's vetting process. Show "a newsroom" and "an ad firm".
- **No customer named.** Citizen Lab does not know which government bought the attacks. Never imply one.
- **Computers, not phones.** The 45 confirmed devices were Windows machines. Draw a laptop.
- **Do not say "every ad is spyware"** or that viewers are at risk from ordinary ads. The report found a targeted
  operation, and it says an impression alone proves nothing.
- **Doodle is not the villain here.** It removed the firm. Keep its logo off the stamp.
- **"Approved".** IAB Europe's list is a register of firms that signed up to its consent framework, not a security
  vetting. The line is fair as satire of what "approved" sounds like, but the copy should say "the industry's vendor
  list" if challenged. Check the wording in IAB Europe's statement before air.

---

## 2. Ends in 3 (Mexico cuts off phones not linked to an official ID)

**What happened.**
- **The rule:** since 9 Jan 2026, every mobile line in Mexico must be linked to its holder's name and CURP (the national
  population-registry number), through the phone company. The regulator, the CRT, says the aim is to end the anonymous
  lines used for extortion and fraud.
- **The deadline slipped:** the original deadline was 30 June. By late June only about 63 million of 144 million+ lines
  were linked, so the CRT replaced it with **ten deadlines, one per last digit**: 0 on 15 Aug, through to 9 on 31 Dec.
- **4–5 Oct:** lines ending in **3** that were not linked were suspended. The CRT counted **2,248,143** suspended lines.
  About 1.2 million had been switched back on by then, after their owners linked them.
- **What a cut-off phone can still do:** call emergency numbers (911), citizen-service lines and its phone company, and
  **receive the seismic (earthquake) alert**. No other calls, texts or data. The number is not lost.
- **Next:** lines ending in 4 were due on 15 Oct; lines ending in **5 are due on 31 Oct**.
- **The critics:** digital-rights group R3D says there is no evidence that phone registries reduce extortion, and that
  people must choose between handing over data and being excluded. Mexico's earlier registries failed: RENAUT was
  abandoned around 2011–12 amid reports its data was being sold, and PANAUT was struck down by the Supreme Court in 2022.
  The government says the state does not collect the data itself; phone companies hold it.

**Sources.**
- El Financiero, "Registro obligatorio de celulares: CRT suspende 2.2 millones de líneas con terminación '3'", 5 Oct 2026:
  https://www.elfinanciero.com.mx/empresas/2026/10/05/registro-obligatorio-de-celulares-crt-suspende-22-millones-de-lineas-con-terminacion-3/
- El Universal (the suspension, and what still works):
  https://www.eluniversal.com.mx/cartera/este-domingo-inicia-la-suspension-de-lineas-celulares-con-terminacion-3-sin-registrar-crt-asi-puedes-inscribir-la-tuya/
- El Informador, Oct 2026: https://www.informador.mx/mexico/registro-de-celulares-en-mexico-suspenden-lineas-con-terminacion-3-como-recuperar-el-servicio-20261001-0092.html
- Milenio, on lines ending in 4: https://www.milenio.com/negocios/vencio-plazo-para-registrar-lineas-con-terminacion-4-asi-se-recuperan
- Xataka México, 16 Oct: https://www.xataka.com.mx/telecomunicaciones/registro-celular-mexico-tiene-otra-fecha-limite-15-octubre-estos-numeros-podran-quedarse-servicio
- Rio Times, "Mexico Phone Registry Suspends 2.2 Million Mobile Lines": https://www.riotimesonline.com/mexico-phone-registry-lines-suspended-2026/
- Mexico News Daily, the ten new deadlines: https://mexiconewsdaily.com/news/mexico-extends-cell-phone-registration-deadline/
  · the start of the rule: https://mexiconewsdaily.com/news/cell-phone-users-in-mexico-curp-register/
- Expansión, the calendar by last digit: https://expansion.mx/empresas/2026/08/27/calendario-registro-lineas-fecha-limite
- R3D (a party), 12 Jan 2026: https://r3d.mx/2026/01/12/inicia-registro-obligatorio-de-lineas-telefonicas-sin-salvaguardas-contra-abusos/
- Biometric Update, the court ruling that let it proceed, Mar 2026:
  https://www.biometricupdate.com/202603/mexico-court-clears-path-for-mandatory-phone-registry-linked-to-biometric-curp

**Status of the claims.**
- **CONFIRMED** (CRT figures carried by El Financiero, El Universal, Rio Times and Xataka): 2,248,143 lines ending in 3
  suspended; the suspension starts within 72 hours of each deadline.
- **CONFIRMED** (El Universal, Milenio, Mexico News Daily, quoting the CRT): a suspended line keeps emergency calls and
  the seismic alert.
- **CONFIRMED** (Mexico News Daily, Expansión): the last-digit calendar, ending 31 Dec.
- **CONFIRMED** (Mexico News Daily, Crónica, R3D): the anti-extortion rationale and the privacy objections.
- **Disputed across sources:** whether a *biometric* CURP is required. Several say no (CURP plus an official ID). Keep
  biometrics out of the film.

**Quotes.** None cleared. Candidate: the CRT, per Mexico News Daily, that each number must be registered in a person's
name "to eliminate the anonymity" that has allowed fraud and extortion.

**The one question:** *Should a phone need its owner's ID to work?*

**Three facts:**
1. Mexico now requires every mobile line to be linked to its owner's official ID number.
2. Unlinked lines are cut off by last digit. On 4 October, 2.2 million lines ending in 3 went dead.
3. A cut-off phone can still call 911 and receive the earthquake alert.

**Punchline (≤ 12 words):**
- Main: *"No ID, no phone. The earthquake alert still gets through."*
- Alternative: *"The earthquake doesn't check ID."*
- Alternative (for a post on or before 31 Oct): *"Ends in 5? Register by Halloween."*

**Papercut, four shots:**
1. A busy paper street. Every masked passer-by holds a phone, and each phone shows one big digit, 0 to 9.
2. A clerk's counter with a ledger headed LINE · NAME · ID. A queue holds up ID cards. A wall calendar has digits instead
   of dates; 0, 1 and 2 are crossed out, and a red pen is crossing out the 3.
3. Down the street, every phone showing a 3 turns grey, one after another. A counter in the corner rolls up to
   2,248,143. A man taps his grey phone: nothing.
4. A siren tone. Every phone on the street lights up at once, grey ones included, with the same alert icon. End card
   with the line.

**Risks.**
- **Earthquakes are not a joke in Mexico.** The alert is the punchline because the regulator chose to keep it, which is
  the right call. Show the alert lighting up, never a quake or damage. The satire is aimed at the registry's logic.
- **State the reason.** The government's case is extortion and fraud, and many countries register SIM cards. The film
  asks the question; it does not claim the registry is surveillance.
- **Temporary, not cancelled.** A suspended line comes back the moment it is linked, and keeps its number. Say "cut
  off", never "deleted".
- **Moving numbers.** The suspended count changes daily as people link their lines. Date it: "on 4 October".
- **Foreigners** are covered too (passport or temporary CURP). Not needed in the film.

---

## 3. Four Kilometres (Delhi's protest shutdown and the "formality")

**What happened.**
- **9–10 Oct:** India's Home Ministry approved, at Delhi Police's request, a suspension of mobile internet for **24
  hours** (22:00 to 22:00) within **4 km** of the Janpath–Kartavya Path crossing in central New Delhi, during a protest
  at Jantar Mantar. About 57 metro stations were also shut (Reuters). An earlier order on 2 Oct had used a 1.5 km radius.
- **No stated reason:** MediaNama reports that the notice gave no grounds for the suspension and did not explain why
  4 km was chosen. India's Supreme Court held in 2020 (Anuradha Bhasin) that shutdown orders must be published and open
  to judicial review.
- **11 Oct (a Sunday):** in a special sitting, the Supreme Court ordered that internet services in Delhi function
  without hindrance. It found a prima facie case of contempt over the metro closures, which breached its own order of
  two days earlier, and issued notices to officials including the Home Secretary.
- **The apology:** the Home Secretary's affidavit tendered an **"unconditional apology"**, defended the internet
  suspension as proportionate, and asked the court to modify its order so that suspensions stay possible "in situations
  of necessity".
- **The formality:** the Home Ministry then said, through a government (PIB) clarification, that opening a contempt
  affidavit with an unconditional apology is standard practice, a formality, and that no contempt was made out.
- **Context:** SFLC.in counts 32 internet shutdowns in India in 2026 up to 10 Oct, eight of them in Delhi. India had 65
  in 2025, second only to Myanmar. The hearing continued on 15 Oct; I found no reported outcome.

**Sources.**
- MediaNama, "Supreme Court Orders Unhindered Internet Access in Delhi", Oct 2026:
  https://www.medianama.com/2026/10/223-supreme-court-internet-shutdown-delhi/
- MediaNama, the shutdown order and its missing reasons: https://www.medianama.com/2026/10/223-internet-shutdown-new-delhi-jantar-mantar/
- MediaNama, "Home Ministry on internet shutdowns: 'Unconditional apology' was a formality; no contempt of court":
  https://www.medianama.com/2026/10/223-home-ministry-internet-shutdowns-unconditional-apology/
- Reuters, "Delhi sealed off ahead of youth protest against Indian election chief", 9 Oct 2026 (via Central Oregon Daily):
  https://www.centraloregondaily.com/news/nation-world/delhi-sealed-off-ahead-of-youth-protest-against-indian-election-chief/article_d7da3cf4-c625-52f2-bd9e-3c3c1797c18a.html
- Outlook, "Centre Defends October 10 Delhi Internet Shutdown In Supreme Court":
  https://www.outlookindia.com/national/centre-defends-october-10-delhi-internet-shutdown-in-supreme-court
- LawChakra, the Home Secretary's affidavit: https://lawchakra.in/supreme-court/home-secretary-apologises-contempt/
- Free Press Journal: https://www.freepressjournal.in/india/union-home-secretary-tenders-unconditional-apology-to-supreme-court-in-contempt-case-over-delhi-internet-shutdown-during-october-10-protest
- Punjab Kesari, the ministry's clarification: https://english.punjabkesari.com/india/oct-10-protest-curbs-home-ministry-clarifies-on-practice-to-begin-affidavit-in-sc-with-unconditional-apology
- Tech Times, 13 Oct: https://www.techtimes.com/articles/328920/20261013/indias-supreme-court-issues-contempt-notice-over-delhi-metro-closure-internet-blackout.htm
- Internet Freedom Foundation (a party): https://internetfreedom.in/no-qualifications-no-exceptions-supreme-court-orders-delhis-internet-to-stay-on/
- SFLC.in (a party): https://sflc.in/sflc-ins-statement-on-the-internet-shutdown-imposed-in-new-delhi/ · the 2026 count, via
  Broadcast & CableSat: https://www.broadcastandcablesat.co.in/delhi-records-indias-highest-number-of-internet-shutdowns-in-2026/

**Status of the claims.**
- **CONFIRMED** (Reuters, MediaNama, the affidavit as reported by LawChakra and Outlook): 4 km, 24 hours, at police
  request.
- **CONFIRMED** (MediaNama, Hans India, Tech Times): the 11 Oct order that the internet stay on, and the contempt notices.
- **CONFIRMED** (LawChakra, FPJ, Outlook; the PIB clarification via MediaNama and Punjab Kesari): the unconditional
  apology, then the "formality" explanation.
- **SINGLE-SOURCE** (MediaNama): that the notice gave no reasons and did not explain the radius. Check the order text if
  it is published.
- **SINGLE-SOURCE** (SFLC data via one trade outlet and NDTV, per excerpts): 32 shutdowns, eight in Delhi.

**Quotes.** None cleared. Candidates: "unconditional apology" (the affidavit's term, widely reported) and "in
situations of necessity" (the relief sought, per Bar & Bench and MediaNama).

**The one question:** *Who decides when the internet goes off?*

**Three facts:**
1. On 9 October, mobile internet was cut for 24 hours within 4 km of central New Delhi. The order gave no reason.
2. Two days later, India's Supreme Court ordered Delhi's internet to stay on.
3. The top official apologised "unconditionally". The ministry then called the apology a formality.

**Punchline (≤ 12 words):**
- Main: *"An unconditional apology. A formality, the ministry explained."*
- Alternative: *"Four kilometres. No reason given."*
- Alternative: *"Sorry, unconditionally. Shutdowns: still an option."*

**Papercut, four shots:**
1. A paper city map seen from above. A giant drawing compass swings a circle labelled 4 KM. Inside it, phone signal bars
   fall off the buildings like confetti.
2. Inside the circle, masked people hold phones up to the sky looking for signal. A wall clock runs from 22:00 round to
   22:00.
3. A courtroom of masked judges. A paper order reading INTERNET: ON is stamped and slides across the bench.
4. A masked official bows and hands up a card: UNCONDITIONAL APOLOGY. The card flips; on the back, in small print,
   FORMALITY. On his desk the compass stays open. End card with the line.

**Risks.**
- **Keep the protest out.** It demanded the Chief Election Commissioner's resignation over voter-roll revisions; the
  ruling party and the Election Commission reject the protesters' accusations. None of that belongs in the film, and no
  party, banner or face should appear. The question is about the shutdown process only.
- **Pending case.** The contempt finding is prima facie, and no outcome was found for 15 Oct. Never say "found guilty".
- **The ministry's case.** Public order, at police request, for 24 hours, and an apology formula it says is standard.
  The film should let that stand; the joke is in the word "unconditional", not in a claim of bad faith.
- **Not a dig at India.** Shutdowns are a global habit (Myanmar, Iran, Russia, and others in this file). Do not use the
  "second in the world" ranking on screen.
- **The protest group began as online satire** (the "Cockroach Janta Party"). Do not reference it; a satire station
  joking about a satire party's protest reads as taking sides.

---

## 4. Land, Power, Water (Batam's dry taps and its data-centre boom)

**What happened.**
- **The island:** Batam, Indonesia, across the strait from Singapore. It has **no natural fresh water**; about 1.3
  million people live off rain stored in **six reservoirs** (BBC).
- **The shortage:** parts of Nongsa have had little or no piped water for months; one resident told the BBC her taps had
  been dry for about three months. Residents buy water from tanker trucks.
- **5 Oct:** about 300 residents blocked the gate of **Nongsa Digital Park**, a data-centre estate, after earlier
  protests in August and September. An official promised piped water within two days and sent six tanker trucks. By
  about 8 Oct, supply was back to around 53% of the affected areas.
- **The authority's answer:** BP Batam, which runs the free-trade zone, denies that household water goes to data centres
  and blames an El Niño drought. Its statements differ on the detail: one says the data centres get water from another
  reservoir (Duriangkang) through a dedicated pipeline it built (The Star), another that they use neither reservoir and
  have their own supply, with a desalination plant still being built (BatamNow, Kompas). Officials have told big data
  centres to make their own water from seawater.
- **The boom:** the Jakarta Post counts at least 16 new data centres at various stages; BP Batam has cleared 10, six in
  Nongsa. Nine planned in Nongsa would need about 29 million litres of water a day (Global Voices).
- **17 Oct:** Indonesia's Coordinating Ministry for Economic Affairs said a US chip giant (Nvidia) is exploring a
  **$4.5 billion** investment in Batam, still at the talks stage. The minister, Airlangga Hartarto, named what data
  centres need: sufficient **land, reliable electricity and adequate water**.

**Sources.**
- Jakarta Post, "Batam residents protest data center expansion as water shortages worsen", 8 Oct 2026:
  https://www.thejakartapost.com/indonesia/2026/10/08/batam-residents-protest-data-center-expansion-as-water-shortages-worsen
- Jakarta Post editorial, "Data hubs' troubled waters", 10 Oct 2026: https://www.thejakartapost.com/opinion/2026/10/10/data-hubs-troubled-waters
- The Star (Malaysia), 26 Sep and 8 Oct 2026: https://www.thestar.com.my/aseanplus/aseanplus-news/2026/09/26/batam-residents-protest-data-centres-amid-water-crisis ·
  https://www.thestar.com.my/aseanplus/aseanplus-news/2026/10/08/batam-residents-protest-data-centre-expansion-as-water-shortages-worsen
- BBC, "The island where locals say data centres are taking their water", Oct 2026 (seen via a syndicated copy):
  https://www.yahoo.com/news/world/articles/island-where-locals-data-centres-223100821.html
- The Next Web: https://thenextweb.com/news/batam-data-centres-water-protest
- Kompas (Indonesian), BP Batam's denial, 5 Oct 2026: https://regional.kompas.com/read/2026/10/05/213227278/bantah-data-center-penyebab-krisis-air-di-nongsa-bp-batam-air-data-center
- BatamNow (Indonesian), the conflicting supply statements: https://batamnow.com/bp-batam-sebut-data-center-tak-disuplai-waduk-nongsa-dan-duriangkang/ ·
  https://batamnow.com/tak-hanya-ke-sambau-interkoneksi-pipa-di-nongsa-bercabang-diduga-mengarah-ke-proyek-data-center/
- Indonesia Business Post, "Nvidia explores US$4.5B investment in Batam…", Oct 2026:
  https://indonesiabusinesspost.com/7611/corporate-affairs/nvidia-explores-us-4-5b-investment-in-batam-to-expand-indonesia-s-ai-infrastructure
- FourWeekMBA, same release: https://fourweekmba.com/ai-indonesia-says-nvidia-is-exploring-a-4-5b-batam-investment/
- Global Voices, the water demand estimate, Apr 2026: https://globalvoices.org/2026/04/21/ai-ready-data-centers-are-booming-in-indonesia-but-water-woes-loom/
- WALHI's call for a moratorium (a party), 1 Oct 2026: https://www.indoleft.org/statements/2026-10-01/data-centre-expansion-threatens-water-sources-moratorium-needed.html

**Status of the claims.**
- **CONFIRMED** (Jakarta Post, The Star, BBC, Kompas): the 5 Oct blockade, months of dry taps, BP Batam's denial and its
  El Niño explanation.
- **CONFIRMED** (BBC via its copy, plus The Star): no natural fresh water, six reservoirs.
- **CONFIRMED** (the ministry's 17 Oct release via Indonesia Business Post and FourWeekMBA): the $4.5bn exploration and
  "land, electricity, water".
- **CONFLICTING (official):** where the data centres' water comes from. Do not put either version on screen as fact.
- **SINGLE-SOURCE:** "about 300" protesters, the 53% restoration figure, and the 29 million litres a day.

**Quotes.** None cleared. Candidate: the resident's line to the BBC that the supply "had been reliable until the data
centres came". It is her view and should not air as fact.

**The one question:** *On an island with no rivers, who gets the water first?*

**Three facts:**
1. Batam has no rivers. Its 1.3 million people live off rain stored in six reservoirs.
2. Some homes have had dry taps for months. Officials blame drought, not the island's data centres.
3. On 17 October, a minister welcomed a $4.5 billion data-centre plan. Its needs: land, power, water.

**Punchline (≤ 12 words):**
- Main: *"Data centres need land, power and water. So do people."*
- Alternative: *"Land, power, water. Nongsa is still waiting on the third."*
- Alternative: *"Six reservoirs. One tanker queue."*

**Papercut, four shots:**
1. The island from above, flat green paper, with six blue reservoir bowls. Their blue rings shrink one by one, like
   paper peeled back.
2. A tanker truck on a dusty road. A queue of masked residents with jerrycans; one checks a dry tap and shakes her head.
3. Across the road, behind a gate, a white server hall with spinning paper fans. At a podium, a masked minister holds up
   a card: LAND ✓ POWER ✓ WATER ✓. A ship behind him unloads crates stamped $4.5BN.
4. Back in the queue, the woman holds up the same card. Only WATER is unticked. End card with the line.

**Risks.**
- **Causation is not established.** BP Batam denies any link and blames El Niño, and how much water the data centres use
  is unknown. The film must not say the data centres took the water. The question is about priority, and the minister's
  own checklist carries the point.
- **No supply diagram.** The official statements on the data centres' supply contradict each other. Keep pipes out of the
  picture.
- **"Exploring."** The chip-company investment is at the talks stage. Do not name it (it would need a parody name,
  *Envidia*, and adds nothing). Say "a $4.5 billion plan".
- **Not a dig at Indonesia.** The boom is driven by demand from Singapore and global cloud firms; local officials have
  told data centres to desalinate. Keep blame off the country.
- **Repetition.** Three RFH films have been about data centres. This is the first about water and the first outside the
  Nordics and the US; post it as the global counterpart, and keep the look distinct from *On Hold*.

---

## 5. Like a Fire Extinguisher (Russia's whitelist internet, and the landline comeback)

**What happened.**
- **The shutdowns:** since May 2025 Russia has cut mobile internet region by region. Euronews (14 Oct) reports that the
  outages now affect nearly 80% of the country. In many places only a **whitelist** of approved sites and apps works:
  government services, banks, big domestic platforms, and the state messenger Max. bne IntelliNews (Aug) says the
  whitelist mode has quietly become permanent across central Russia.
- **The list itself:** no official full list is published, and operators can keep their own (The Record). A Russian
  outlet reported on 5 Oct that the digital ministry is only now drafting unified rules for getting onto it.
- **The official reason:** defence against Ukrainian drones guided over mobile networks. Experts quoted by Euronews
  dispute this, since drones can fly preset routes, and the cuts reach regions far from the front.
- **The landline comeback (29 Sep to 14 Oct):** state-owned companies spent **118 million roubles** on landline phones in
  January–August 2026, **more than three times** the same period in 2025; the number of purchases rose 12.5% to 3,595
  (Vedomosti, from procurement data, via Meduza and Euronews). Market sources also cite a shift to domestic phone systems
  after Western vendors left, and a demand for secure lines.
- **The advice:** the head of Rostelecom, the national telecom, told TASS in March that a landline should be in every
  home, like a fire extinguisher. Euronews repeated it on 14 Oct.

**Sources.**
- Euronews, "Russia's internet shutdowns push state firms back to landline phones", 14 Oct 2026:
  https://www.euronews.com/2026/10/14/russias-internet-shutdowns-push-state-firms-back-to-landline-phones
- Meduza, "Russian state companies more than triple spending on landline phones amid internet restrictions", 29 Sep
  2026: https://meduza.io/en/news/2026/09/29/russian-state-companies-more-than-triple-spending-on-landline-phones-amid-internet-restrictions
- AGI (Italian), 15 Oct 2026: https://www.agi.it/estero/news/2026-10-15/russia-telefoni-fissi-39548044/
- The Barents Observer, "Russians urged to return to landline phones" (the Rostelecom remark, Mar 2026):
  https://www.thebarentsobserver.com/democracy-and-media/russians-urged-to-return-to-landline-phones/447689 ·
  in Finnish, Verkkouutiset: https://www.verkkouutiset.fi/a/venalaisia-kannustetaan-palaamaan-lankapuhelimeen/
- bne IntelliNews, "Russia's mobile internet 'whitelist' mode has quietly become permanent", Aug 2026:
  https://www.intellinews.com/russia-s-mobile-internet-whitelist-mode-has-quietly-become-permanent-459197/
- The Record, "Moscow seeks to limit internet to state-approved websites": https://therecord.media/moscow-seeks-to-limit-internet-to-state-approved-sites
- www1.ru (Russian outlet, English page), the ministry drafting rules, 5 Oct 2026:
  https://www1.ru/en/news/2026/10/05/440380-belyi-spisok-saitov-v-rossii-sdelaiut-poniatnee-mincifry-soversenstvuet-pravila.html
- Human Rights Watch (a party), Mar 2026: https://www.hrw.org/news/2026/03/31/russia-internet-shutdowns-escalate

**Status of the claims.**
- **ONE ORIGIN** (Vedomosti's procurement analysis, carried by Meduza, Euronews, AGI and BFM): the tripled landline
  spending. Treat it as single-source data, well reported.
- **CONFIRMED** (TASS via the Barents Observer and Euronews): the fire-extinguisher remark. It is from March, not from the
  window; say "has said".
- **CONFIRMED** (bne IntelliNews, The Record, Carnegie, HRW): whitelists in use across many regions.
- **SINGLE-SOURCE** (Euronews): "nearly 80% of the country". **SINGLE-SOURCE** (a Russian outlet): the 5 Oct rule-drafting.

**Quotes.** None cleared. Candidate: Rostelecom's chief, per TASS via the Barents Observer, that a landline is like a
fire extinguisher and should be in every home. Paraphrase it on screen.

**The one question:** *Who decides which websites still work?*

**Three facts:**
1. Across much of Russia, mobile internet is cut, and only a whitelist of approved sites still loads.
2. No official full list is published. Officials say the cuts stop drones; experts dispute it.
3. State firms have tripled their spending on landline phones. Rostelecom's chief: every home needs one, like a fire
   extinguisher.

**Punchline (≤ 12 words):**
- Main: *"Every home needs one: a fire extinguisher. And a landline."*
- Alternative: *"The internet became a list. The backup has a cord."*
- Alternative: *"The future of mobile internet: a phone on the wall."*

**Papercut, four shots:**
1. A masked hand holds a paper phone. The browser shows a short scroll of twelve approved icons; every other site is
   greyed out behind a little paper padlock.
2. A ministry hall. A clerk at a lectern adds one icon to a scroll that unrolls across the floor and out of the door. A
   queue of masked shopkeepers waits with petitions.
3. An office. A worker prises open a crate stamped TENDER and lifts out a beige paper desk phone. Three more crates are
   stacked behind it.
4. A flat's hallway: a red fire extinguisher in its wall bracket, and beside it a landline in an identical bracket. The
   phone rings. End card with the line.

**Risks.**
- **This is the one that can read as propaganda.** A Helsinki station mocking Russia during the war in Ukraine is easily
  heard as against a country. The film must aim only at the whitelist as a process, state the official reason
  (drones) on screen, show no flags or leaders, and never make Russians the joke. If that cannot be held in 30 seconds,
  do not make it.
- **War context.** The official case is wartime security. Do not imply it is invented; say experts dispute it.
- **The numbers have one origin** (Vedomosti) and the 80% is Euronews alone. Phrase as "reported".
- **The landline surge has more than one cause** (Western vendors leaving, secure lines). Say "amid the shutdowns", not
  "because of".
- **Check with the military-tech strand,** which may want the drone angle; this film keeps drones to a single caption.

---

## Holds and not-pitched (why)

- **The Starlink speed cap (Ukraine, 14–18 Oct).** Hand to the **military-tech strand**. Ukraine says terminals on its
  drones stop working above about 160 km/h, too slow to chase jet-powered drones, and that the same kit ran faster in EU
  test drives (Zelensky's account). Musk said limits on Starshield "are decided by the US military and ultimately
  POTUS"; Reuters, citing officials, reported the order came from inside the White House; the President said neither he
  nor Musk ordered a cap, and Rubio said no one at the White House did. It is the purest "who decides?" of the month
  ("a speed limit nobody set"), but it is a war-and-weapons story, it names US leaders in a midterm month, and the facts
  were still moving on 18 Oct (Rubio: Ukraine currently has no Starshield access).
  - Sources: Reuters via CNBC, 16 Oct: https://www.cnbc.com/2026/10/16/order-to-limit-starshield-for-ukraine-came-from-inside-white-house-reuters-reports.html ·
    CNBC, 15 Oct: https://www.cnbc.com/2026/10/15/elon-musk-starlink-ukraine-trump-energy-ceasefire.html · NPR, 18 Oct:
    https://www.npr.org/2026/10/18/nx-s1-6007382/ukraine-us-starshield-starlink-what-to-know-trump · Defense News:
    https://www.defensenews.com/pentagon/2026/10/16/order-to-limit-starshield-for-ukraine-came-from-inside-white-house-sources-say/ ·
    Al Jazeera, 18 Oct: https://www.aljazeera.com/news/2026/10/18/rubio-says-ukraine-without-access-to-starshield-future-under-discussion ·
    Axios, 14 Oct: https://www.axios.com/2026/10/14/ukraine-starlink-zelensky-spacex-musk-trump
- **Everyone's export list (16 Oct).** On the same day, China's commerce and science ministries published a draft
  adding 23 AI technologies (of 40) to its export-control catalogue, including the weights of its largest models;
  comments close 15 Nov. Taiwan said it will add AI servers and advanced chips to its own controlled list under its US
  trade deal, making smuggling them to China a crime. **Held** because it needs three countries and a technical term to
  explain in 30 seconds, and the "China copies the US" framing is a trap. Revisit when the Chinese rules are final.
  - Sources: Bloomberg: https://www.bloomberg.com/news/articles/2026-10-16/china-proposes-export-controls-on-ai-models-chips-and-agents ·
    AP via PBS: https://www.pbs.org/newshour/world/china-says-it-will-curb-tech-exports-including-ai-citing-national-security-risks ·
    Taipei Times, 17 Oct: https://www.taipeitimes.com/News/biz/archives/2026/10/17/2003866098 · Bloomberg (Taiwan):
    https://www.bloomberg.com/news/articles/2026-10-16/taiwan-to-curb-ai-chip-exports-to-china-as-part-of-us-trade-deal
- **Judges and Copilot (England, 13–14 Oct).** The judiciary set out a "cautious but positive" AI position, and the
  Master of the Rolls reportedly said judges now have a ring-fenced Copilot on their computers; earlier reports said
  immigration-tribunal judges were trained to draft skeleton rulings with it. **Held:** the 14 Oct remark is
  single-source, and the theme sits close to *That's a Wednesday* (chatbots and official answers).
  - Sources: https://londoncrimenews.co.uk/courts/uk-judges-given-ai-tools-as-china-court-speeds-up-cases ·
    https://www.pinsentmasons.com/out-law/news/english-judiciary-cautious-positive-ai-position-statement
- **Brazil's runoff deepfakes (8–19 Oct; runoff 25 Oct).** The electoral court ordered AI videos pulled from both
  campaigns within 24 hours; its rules ban harmful deepfakes even when labelled and even with the subject's consent.
  **Held:** it is the same terrain as *Same Trick, Two Verdicts* and *Label Sold Separately*, and it centres two named
  candidates days before a vote.
  - Sources: https://www.latintimes.com/brazils-top-court-orders-lula-flavio-pull-videos-what-tses-censorship-battle-means-runoff-600098 ·
    https://www.riotimesonline.com/brazil-court-pro-lula-ai-video-2026
- **Pegasus in Serbia (19 Oct; election 25 Oct).** Citizen Lab found NSO's Pegasus on a university rector's iPhone,
  bringing known Serbian civil-society targets to at least 16. **Held:** fresh and strong, but it accuses a named
  government's security services six days before its election. Pair with *Approved Vendor* only as context.
  - Sources: https://citizenlab.ca/research/pegasus-spyware-serbian-pro-democracy/ ·
    https://www.usnews.com/news/world/articles/2026-10-19/two-serbian-opposition-figures-targeted-with-spyware-research-group-says
- **Smaller leads, not pitched.**
  - South Korea plans to extend its AI-label duty to YouTubers and other users (11 Oct). Not dystopian enough on its
    own: https://en.sedaily.com/technology/2026/10/11/korea-to-extend-ai-labeling-duty-to-youtubers-other-users
  - London's Met is installing static live facial recognition across the West End by the end of 2026, and Scotland's
    biometrics watchdog renewed its call for a law (8 Oct). Watch for the installation date:
    https://www.theregister.com/security/2026/06/24/london-cops-bring-live-facial-recognition-to-west-end/5261031 ·
    https://www.publictechnology.net/2026/10/08/public-order-justice-and-rights/watchdog-steps-up-campaign-for-new-facial-recognition-laws/
  - Ethiopia requires every bank account to be linked to the Fayda digital ID by 31 Dec 2026. A December peg:
    https://www.biometricupdate.com/202502/fayda-digital-id-requirement-for-banking-deferred-for-ethiopians-abroad
  - **Do not make:** the Cologne humanoid robot accused of groping a 16-year-old (14 Oct; a minor is the victim, and it
    is the EU strand's anyway): https://www.cbsnews.com/news/germany-robot-teen-girl-sexual-harassment-groping-cologne/ ·
    Iran calling Starlink a "tool of war" with prison terms for users (14 Oct; an active war, no process to satirise
    that is not also a side): https://www.aljazeera.com/news/2026/10/14/iran-targets-starlink-as-tool-of-war-with-hints-at-internet-restrictions

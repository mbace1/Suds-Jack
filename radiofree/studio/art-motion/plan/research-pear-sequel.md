# "Welcome Home" sequel: research for "Remote Control for an iPhone"

Compiled Mon 19 Oct 2026. Companion to `research-welcome.md` (17 Oct). It checks the Premise 3 claim that HomeView is a screen that only works through your iPhone.

## Method, and what it cannot vouch for

- **Every page fetch failed again.** WebFetch returned DNS errors (apple.com, gadgethacks.com, biggo.com) and direct curl got a proxy 403. **Everything below comes from search-engine excerpts and indexed headlines.** I did not read any article or Apple page in full.
- **Quote rules:**
  - **Headlines** in "double quotes" are titles exactly as the search index returned them.
  - **«Guillemets»** mark wording that appeared in search snippets of a page I could not open. Treat it as probable, not verified. **Re-check it on the live page before anything goes on screen.**
  - **Everything else is paraphrase.**
- **Labels:**
  - **CONFIRMED** means two or more independent outlets, or an Apple page seen in snippets plus an independent outlet.
  - **SINGLE-SOURCE** means one outlet only. Syndicated Reuters copy (KFGO, The Star, Newsweek Japan and others) counts as one outlet.
  - **Secondary** means a summary of someone else's words, for example an AI-written podcast digest.

---

## 1. How much does HomeView depend on an iPhone?

### 1a. Setup and enrolment

- **Setup needs an iPhone or iPad. There is no Android, Mac-only or Watch-only route.** **CONFIRMED.**
  - Apple's regional store pages (apple.com/uk, /au and /in, `…/shop/buy-home/apple-homeview`, n/d) carry a footnote. Snippet wording: «Apple HomeView requires an iPhone with iOS 27.2 or later, or an iPad with iPadOS 27.2 or later.»
  - The same requirement appears in:
    - Gadget Hacks, "Apple HomeView apps: which ones need your iPhone first" (apple.gadgethacks.com/news/apple-homeview-apps-which-ones-need-your-iphone-first/, n/d);
    - Zeera Wireless, "Does Apple HomeView Need an iPhone? Setup, Compatibility & AI Requirements" (zeerawireless.com/blogs/news/apple-homeview-iphone-requirements-compatibility, n/d; a retailer blog);
    - Showmetech (BR, n/d), which says initial setup and multiple profiles need a compatible, up-to-date iPhone or iPad.
  - **iOS 27.2 is still in beta.** Beta 1 came out around 16 Sep and beta 2 on 21 Sep (Macworld, macworld.com/article/3237296/…, 16 Sep 2026; Zeera). I found no final release date. **SINGLE-SOURCE** for the beta-2 date.
- **Every enrolled household member needs their own Apple Account and their own iPhone or iPad.** The limit is six. **CONFIRMED.**
  - Snippet wording from the same Apple store pages: «You can have up to six members of the household enrolled on Apple HomeView through the Home app. They each must have an Apple Account and an iPhone or iPad running the latest software.»
  - Echoed by Mac Observer, "How to add up to six family members to Apple HomeView, and what guests can do" (macobserver.com/?p=493563, n/d), and by MacSales/OWC blog 99231 (n/d).
- **The point the premise misses: an iPad also qualifies at every step.** Apple's wording is always iPhone *or* iPad. **CONFIRMED** (Apple snippets, Gruber, MacRumors, Gadget Hacks).

### 1b. Recognition: your face counts only if your phone is home

- **Personal content needs three things at once:**
  - HomeView recognises your face;
  - your paired iPhone or iPad is on the same Wi-Fi;
  - that device has been recently unlocked.
  - **CONFIRMED:** Apple Newsroom release via MacRumors, Mac Observer, Dexerto, iThinkDiff, Creative Bloq (all 13–14 Oct). Wording is already logged in research-welcome §4a.
- **Recognition itself needs the phone.** Apple reps told John Gruber that a person must have a "registered personal device" with Apple Intelligence support, on the home Wi-Fi and recently unlocked, before HomeView will recognise them by face *or voice*. An Apple Watch does not count. **CONFIRMED:**
  - Daring Fireball (daringfireball.net/linked/2026/10/13/homeview, 13 Oct);
  - 9to5Mac, "Here's how HomeView's facial recognition works" (9to5mac.com/2026/10/13/heres-how-homeviews-facial-recognition-works/, 13 Oct);
  - iThinkDiff, "How HomeView Recognizes You Without Face ID" (ithinkdiff.com/homeview-recognizes-you-without-face-id/, n/d), which describes the phone as a second factor;
  - Appleosophy (14 Oct).
- **Family members whose iPhones lack Apple Intelligence (anything older than the iPhone 15 Pro) will not be recognised.**
  - iPhone in Canada, "Apple's New HomeView Needs an iPhone 15 Pro or Newer to Recognize You" (iphoneincanada.ca/2026/10/13/apple-homeview-iphone-15-pro-face-recognition/, 13 Oct).
  - Italian headline: "Apple HomeView riconosce sei persone, ma solo se c'è un iPhone o iPad sbloccato in casa" ("…recognises six people, but only if there is an unlocked iPhone or iPad in the house"). SmartWorld (smartworld.it/news/apple-homeview-come-funziona-riconoscimento-volto-voce.html, n/d).
  - **CONFIRMED** in substance: Gruber's "Apple Intelligence support" plus iPhone in Canada.
  - **Unclear:** whether someone with an older iPhone (iOS 27.2 but no Apple Intelligence) can be *enrolled* and simply never *recognised*. Apple's two requirements, "latest software" for enrolment and "Apple Intelligence" for recognition, are not reconciled anywhere I could find.

### 1c. What runs on HomeView, and what runs on the iPhone

**On the device itself:**

- An **A18 chip** and its **own OS** ("HomeView software 27.2"), not iOS. **CONFIRMED:** Reuters (Nellis, 13 Oct, via KFGO / Newsweek Japan); MacRumors; Gadget Review.
- **15 built-in apps:** Alarms, Calendar, FaceTime, Find My, Home, Intercom, Messages, Music, Podcasts, Reminders, Safari, Settings, Timers, Weather, World Clock.
  - Source: MacRumors, "Apple HomeView Has These 15 Apps, Some CarPlay Apps and Widgets Also Supported" (macrumors.com/2026/10/14/apple-homeview-apps-carplay/, 14 Oct), from Apple's tech-specs page.
  - **CONFIRMED** (iphonesoft.fr, 14 Oct, "homeview 15 apps intégrées, pas d'App Store"). AppsHunter counts 13.
  - Note that Messages and Calendar are built-in *apps*, but their *content* is gated by 1b.
- **General Siri AI works without an Apple Intelligence iPhone:** general-knowledge answers, conversation and music discovery.
  - Requests run on the device or in **Private Cloud Compute**.
  - Siri AI is labelled **beta** and is English-only at launch.
  - **CONFIRMED:** MacRumors, "HomeView Needs an iPhone for Some AI Features" (macrumors.com/2026/10/13/homeview-needs-an-iphone-for-some-ai-features, 13 Oct); eWEEK; t2online; iThinkDiff; TapSmart (beta).
- **Smart-home hub.** It is a Matter controller and Thread border router, and guests can run accessories with no phone.
  - Matter/Thread role: The Verge (Tuohy) via search synthesis, plus foro3d. **SINGLE-SOURCE-ish**; I could not read The Verge.
  - Guest use: **CONFIRMED** (research-welcome §5).

**Borrowed from the iPhone:**

- **Personal context.**
  - Reuters says HomeView draws on a **personal search index stored on the user's iPhone**, and that the phone must be on the same network. Source: Reuters/Nellis, "Apple's HomeView brings personalized Siri to smart home…" (kfgo.com/2026/10/13/…; thestar.com.my/tech/tech-news/2026/10/14/…).
  - Bluewin says personal context is not stored on HomeView itself.
  - ABC (Apple's Cecilia Dantas) said it "pulls information from your iPhone". Fragment logged in research-welcome §4b.
  - **CONFIRMED** in substance (Reuters, Bluewin, ABC).
  - eWEEK's headline sums it up: "Apple HomeView Has Built-In AI, but Its Most Personal Features Still Need an iPhone or iPad" (eweek.com/news/apple-homeview-ai-features-iphone-ipad/, n/d).
- **Third-party apps, which run on the phone and are projected (CarPlay model).** There is no App Store and nothing installs on HomeView.
  - Apple's release says HomeView supports «compatible third-party audio and video apps from your iPhone». Its fine print says «Select apps require a paired and compatible iPhone nearby». Both phrases appeared in snippets of 9to5Mac (9to5mac.com/2026/10/13/will-homeview-support-third-party-apps-heres-what-apple-says/, 13 Oct), MacStories, Macworld (article 3261804) and Gadget Hacks.
  - The mechanism is CarPlay. Apple's CarPlay Developer Guide (per 9to5Mac) says CarPlay audio and video apps work on HomeView with no changes.
  - **CONFIRMED:**
    - MacRumors (13 and 14 Oct);
    - 9to5Mac;
    - Macworld;
    - iPhone in Canada, "Apple HomeView Won't Get an App Store, Only CarPlay Apps" (iphoneincanada.ca/2026/10/13/homeview-no-app-store-carplay-apps/, 13 Oct);
    - Trending Topics, "Apple's HomeView has no App Store and third-party apps run only via the iPhone" (trendingtopics.eu/…, n/d).
- **Four of Apple's own apps are listed as "Available from iPhone":** TV, Audiobooks, Classical, News.
  - **CONFIRMED:** Apple tech-specs page via MacRumors 14 Oct, 9to5Mac, Gadget Hacks, Gadget Review, Macworld. Macworld names them Apple TV / Books audiobooks / Music Classical / News+.
  - So even **Apple's own TV app streams from your phone.**
  - The Verge reportedly said no video app runs natively at launch, "not even Apple's own". That came through one search synthesis only, so it is **SINGLE-SOURCE, unverified wording.**
- **Usage limits.** Apple's footnotes say server-side Apple Intelligence features are subject to **daily usage limits**, with expanded access **for a fee in the future**.
  - HomeView-specific: iTWire (n/d); Mac Observer, "Siri AI usage limits on HomeView: what happens when you hit the daily cap" (macobserver.com/?p=493577, n/d).
  - Apple-wide: MacRumors, 9 Sep 2026.
  - **CONFIRMED** that the footnote exists. No number and no price are published.

### 1d. If the iPhone is away or off

- **Phone gone or off Wi-Fi:** personal content should disappear and you fall to the shared/guest layer.
  - The exception: personal data may stay up if the face is still recognised **and** the phone was recently on that Wi-Fi, still has cellular service, is in the same location, and was recently unlocked. This is Apple's footnote, via MacRumors "HomeView touts 5 privacy features" (13 Oct), Appleosophy and Mac Observer. **CONFIRMED.**
- **"Recently" is never defined** (research-welcome §4a).
- **Phone switched off or flat:** **no source addresses it.** That it behaves like "phone away" is my **inference** from the rules, not a reported fact.

### 1e. Android, Apple Watch, no Apple device

- **Android-only households cannot set it up.** Android users and guests get only the shared layer: accessories, weather, timers, music, AirPlay audio to it. Sources: Apple requirement (1a); MacRumors "10 HomeView Features You Might Have Missed" (macrumors.com/2026/10/14/homeview-tidbits/, 14 Oct); Zeera. **CONFIRMED.**
- **The Watch does not count** (1b).

---

## 2. Reviewer verdicts that make the "it's just a remote / screen for your iPhone" point

### Nilay Patel / The Vergecast: still NOT verified in a primary source

- **The episode exists.** "HomeView: Apple just got serious about the smart home" (Livestream), The Vergecast, with Jennifer Pattison Tuohy, Nilay Patel and David Pierce.
  - Listed on Apple Podcasts (podcasts.apple.com/us/podcast/homeview-apple-just-got-serious-about-the-smart-home/id430333725?i=1000796206498).
  - Search snippets date it 13 Oct. I could not open the page or the audio.
- **The phrase rests on BigGo Finance only, an AI-written podcast-digest site:**
  - headline "Nilay Patel on Apple's HomeView: 'It Is a Remote Control for an iPhone' — BigGo Finance" (finance.biggo.com/news/9c2fd84f78b30701, n/d). Its paired podcast page is titled "Is X back?" (finance.biggo.com/podcast/9c2fd84f78b30701), which suggests the line may come from a **later** Vergecast episode, not the 13 Oct livestream.
  - companion headline "Nilay Patel: Apple's HomeView Is a Bet on a Multi-User Future Apple Hasn't Invented Yet" (finance.biggo.com/news/9581443e19bb01a5).
  - The BigGo digest (via snippets) says Patel framed HomeView as projection rather than computation, compared it to the first-gen Apple Watch, and called it an extension of six people's phones.
- **A second digest says the same, but it is also AI-written.** hyper.ai, "Apple HomeView Relies on CarPlay, Not Its Own App Platform" (hyper.ai/en/stories/0b5be7529140e021800acad4d91f8096, n/d), per one search synthesis.
- **One human write-up covers the episode without the phrase.** TechBytes, "Apple's HomeView has an app problem" (techbytes.app/posts/apples-homeview-has-an-app-problem/, 16 Oct), says Pierce and Patel asked why Apple would not make the hub its own app platform when it relies almost entirely on CarPlay.
- **Status: SINGLE-SOURCE, secondary.**
  - Do not put "remote control for an iPhone" in quote marks, and do not attribute it to Patel on screen.
  - Someone must listen to the episode and timestamp the line first.
  - **The CarPlay criticism itself is CONFIRMED** (TechBytes plus the BigGo digests).

### Other verdicts and headlines (all after 13 Oct)

| Who | What (headline exact as indexed; body paraphrased) | Label |
|---|---|---|
| Xataka Brasil | "Todos os novos produtos da Apple para a casa continuam dependendo do iPhone" ("All of Apple's new home products still depend on the iPhone"), n/d. The body calls them extensions of the iPhone. | SINGLE-SOURCE (headline) |
| iphonesoft.fr | "Apple HomeView : un iPhone compatible reste indispensable pour en profiter" ("a compatible iPhone remains indispensable"), 13 Oct | SINGLE-SOURCE |
| eWEEK | "Apple HomeView Has Built-In AI, but Its Most Personal Features Still Need an iPhone or iPad", n/d | SINGLE-SOURCE |
| MacRumors | "HomeView Needs an iPhone for Some AI Features", 13 Oct | SINGLE-SOURCE (headline). Substance CONFIRMED |
| 3DNews (RU) | The software is closer to CarPlay than to iOS/iPadOS/tvOS (paraphrase of a Russian snippet), 14 Oct (3dnews.ru/1149931) | SINGLE-SOURCE |
| Forkast | People expecting an iOS-style ecosystem get a media player (paraphrase), n/d | SINGLE-SOURCE |
| MKBHD (YouTube) | "Not convinced"; a skip for most people; it duplicates what your iPhone, iPad, Watch and HomePod already do; praises the iPhone hand-off. Via MacRumors "MKBHD is 'Not Convinced' About Apple's New HomeView, Here's Why" (macrumors.com/2026/10/15/mkbhd-not-convinced-about-apple-homeview/, 15 Oct), Dexerto, Mac Observer, MacTrast | CONFIRMED (reported by 4 outlets; video unseen) |
| Tom's Guide | "Should you buy the Apple HomeView? 5 reasons to pick one up (and 2 reasons why you might want to hold off)". The search summary says lock-in and hidden setup costs. | SINGLE-SOURCE (body unseen) |
| **Counterpoint:** TechRadar | "I've tried Apple's HomeView, and it's the device that could bring your smart home together — and with less iPhone time", n/d | SINGLE-SOURCE |
| **Counterpoint:** TechCrunch | The preloaded apps mean you need not reach for your iPhone to check a calendar, send a message or play music (paraphrase), 13 Oct | SINGLE-SOURCE |

---

## 3. Price, ship date, availability, and what is new since 17 Oct

- **Price:** US$299 for either model. Ships **13 Nov 2026**. **CONFIRMED** (research-welcome §2).
- **The real price is higher.**
  - The wall model needs a Schneider mount: **$59.95** USB-C (plus a 20 W adapter, sold separately) or **$79.95** AC wired, so about **$359–379** before tax. A PoE mount at $129.95 is due in early 2027.
  - Sources: Android Headlines, "Apple HomeView wall mounted model costs extra for essential accessories" (androidheadlines.com/2026/10/…); Analytics Insight; Gadget Review. **CONFIRMED.**
- **Repairs:**
  - Out-of-warranty repair is a flat **$279**, $20 under the price of a new unit. AppleCare+ is $2.49/month or $24.99/year, with a $39 fee.
  - Sources: 9to5Mac; Cult of Mac; iThinkDiff; Appleosophy (13 Oct); iphonesoft (14 Oct); Mezha. **CONFIRMED.**
- **Markets:**
  - **Eight at launch:** US, UK, Canada, Australia, New Zealand, India, Singapore, South Africa.
  - **Not in the EU, so not in Finland.** Apple's stated reason is that Siri AI is «currently unavailable in iOS in the EU».
  - Sources: iThinkDiff, "Apple HomeView Countries: Where You Can Buy It at Launch" (n/d); Born City, "…startet am 13. November in acht Ländern" (n/d); Mac Observer, "Apple HomeView is not for sale in the EU because Siri AI is unavailable in iOS" (macobserver.com/news/apple-homeview-eu/, n/d); Pasquale Pillitteri (n/d). **CONFIRMED.**
  - **The block runs through the iPhone OS.** Apple's June post "Due to DMA, Siri AI delayed in EU for iOS 27 and iPadOS 27" (apple.com/newsroom/2026/06/due-to-dma-siri-ai-delayed-in-eu-for-ios-27-and-ipados-27/, 8/9 Jun) says EU users *do* get Siri AI on macOS 27 and visionOS 27. HomeView availability therefore tracks **iOS**, not the Mac. **CONFIRMED** (Apple Newsroom snippets, plus soyacincau and eWEEK). No EU timeline.
- **New since 17 Oct:**
  - **Wait times slipping.**
    - Some tabletop colours now show **late November to early December**, depending on location. The wall model was not delayed when MacRumors checked.
    - Sources: MacRumors, "Didn't Pre-Order Apple's HomeView? Here's How Long the Wait is Now" (macrumors.com/2026/10/16/apple-homeview-preorder-wait-times/, 16 Oct); Gadget Review, "Apple TV 4K, HomeView Pre-Orders Now Delayed Until Late November" (n/d). **CONFIRMED.**
    - No sell-out was reported.
  - **"HomeView Max" rumour (18 Oct).** Gurman (Power On) reports a bigger model with a 9-inch screen that can swivel 360° on a robotic arm and turn toward the speaker, possibly 2027 (or 2028).
    - Sources: MacRumors, "Apple Planning 'HomeView Max' With 9-Inch, 360-Degree Screen" (macrumors.com/2026/10/18/apple-rumored-to-launch-homeview-max/, 18 Oct); 9to5Mac, "Apple's next HomeView could debut as soon as next year with a robotic arm: report" (9to5mac.com/2026/10/18/…, 18 Oct); Digital Trends, "Apple is already planning a bigger, 360-degree rotating HomeView" (n/d).
    - Reporting is **CONFIRMED**; the underlying claim is **SINGLE-SOURCE (Gurman)**. Useful sequel material: the next one *turns to look at you*.
  - **FCC filings show HomeView hardware was being tested in Oct 2024.** The Apple Post, "Apple was testing HomeView two years before launch" (theapplepost.com/2026/10/15/73295/…, 15 Oct); Archyde. **CONFIRMED**-ish (two outlets, one filing).
  - **Nothing found on recalls, security bugs, lawsuits, FTC action, senators' letters, or EFF/EPIC/ACLU statements about HomeView** (searched 19 Oct). The product has not shipped yet.
  - IBTimes UK ("What Will New Apple HomeView's Face Recognition Mean for Shared Spaces?", n/d) says Apple has published no detailed technical breakdown of how recognition and personal-context data are stored. **SINGLE-SOURCE**, but it matches research-welcome §4b.

---

## 4. The 28 Oct Los Angeles event

- **Now officially announced by Apple.** Invitations went out on **19 Oct 2026**. The event is called **"Pro and tell"**: Wednesday **28 Oct**, Los Angeles, **10:00 am PT**. **CONFIRMED** by:
  - 9to5Mac, "Apple announces special event for October 28: 'Pro and tell'" (9to5mac.com/2026/10/19/apple-announces-special-event-for-october-28/, 19 Oct);
  - CNBC, "Apple announces product launch event for Oct. 28. Analysts expect touchscreen laptop" (cnbc.com/2026/10/19/apple-product-launch-event-oct-28-analysts-expect-touchscreen-laptop.html, 19 Oct);
  - The Apple Post (19 Oct);
  - Appleosophy (19 Oct);
  - iPhone in Canada (19 Oct);
  - MacDailyNews (19 Oct);
  - Mac Observer, Macworld (article 3264015), Cult of Mac, Engadget.
  - Older 15–16 Oct pieces calling it "unconfirmed" are superseded.
- **Format:**
  - An in-person, all-day media "experience", modelled on the 13 Oct "Welcome home" launch.
  - **No public livestream was announced as of 19 Oct.** The Apple Post, "Will Apple stream its October 28 'Pro and tell' event?" (19 Oct).
  - Gurman earlier mentioned an online video component.
- **Expected, NOT confirmed (Apple names no products):**
  - touchscreen OLED 14"/16" MacBook Pro with M5 Pro/Max and a Dynamic Island (name possibly "MacBook Ultra", per Bloomberg via Digital Trends);
  - OLED iPad mini at about $799, per Gurman via Gizchina;
  - M6 14" MacBook Pro and an M6 iMac.
- **HomeView and home products: none are expected.** None of the previews I saw mention HomeView, HomePod or any home device for 28 Oct. The home line already launched on 13 Oct. HomePod mini 2 and Apple TV 4K ship 30 Oct. The Apple Home Collection accessories ship in December (SINGLE-SOURCE). **Do not imply a HomeView update on 28 Oct.**

---

## 5. What would make the satire unfair or wrong

1. **"Only works through your iPhone" is false for the basics.** With no phone in the house, HomeView still:
   - shows clock, weather, timers and alarms;
   - plays Apple Music and Podcasts;
   - runs the Home app and accessories;
   - takes AirPlay;
   - answers general Siri AI questions;
   - runs its own A18 and OS.
   It is a working shared kitchen screen. What it cannot do without a phone is **know who you are**, show **your** stuff, or run **third-party apps** or **Apple's TV app**.
2. **"iPhone" should be "iPhone or iPad".** An iPad satisfies setup, enrolment and recognition. A gag that needs it to be strictly an iPhone is technically wrong. "Your phone" as shorthand is fine, since the iPhone is the typical case and Apple's own wording leads with it.
3. **You do not have to hold, show or tap the phone.** It only has to be on the home Wi-Fi and "recently" unlocked; in a pocket counts. **Avoid a scene where the device demands to see the phone.** Mum unlocking it once and putting it away is accurate. (This is also why the launch film's "nobody is holding an iPhone" is not a contradiction.)
4. **"Remote control" is metaphorically defensible but literally inverted.** For third-party apps and the four "from iPhone" apps, HomeView really is a touchscreen operating apps that run on the phone, the same as CarPlay in a car. For personal data it is a window onto the phone's index. Calling the whole device a remote overstates it.
5. **The Patel attribution is unverified.** It must not appear as a quote or a named attribution until someone has checked the audio.
6. **Do not imply** that:
   - HomeView *stores* your Messages: Apple and Reuters say it does not;
   - it is on sale in Finland: it is not;
   - a recall or security flaw exists: none has been reported.

---

## Verdict for the premise

**"Remote Control for an iPhone", as stated, is not fully fair.** As a factual claim it fails points 1, 2 and 4 above: the device has its own chip, OS and 15 built-in apps, and it works as a shared hub with no phone at all. Its only published source is an unverified, AI-written digest of a podcast. As an exaggeration it lands close to something real.

**What the facts DO support, all CONFIRMED:**

- HomeView **cannot tell who you are without your phone.** Face and voice recognition need an Apple-Intelligence iPhone or iPad (iPhone 15 Pro or newer) on the home Wi-Fi and recently unlocked.
- Without it, you get the **guest layer in your own kitchen.**
- Your personal data **lives on the phone**, not on the screen.
- Third-party apps, and even Apple's own TV app, are **projected from the phone, CarPlay-style.**
- For a Helsinki channel: it is **not sold in Finland because Siri AI is not allowed on *iOS* here.** The Mac gets it; the phone does not. The screen cannot come because the phone is not allowed to.

**Accurate premise:** *"A $299 screen that only knows your face if your phone is home."* The CarPlay-for-the-kitchen framing works as a visual (the cable down the island hole, the phone on the counter doing the real work). Keep "remote control" as a visual metaphor, not a caption or a quote.

**Suggested last line (9 words):** **"Welcome home. Bring your iPhone, or be a guest."**

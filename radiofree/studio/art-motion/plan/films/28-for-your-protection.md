# For Your Protection (RFH global): papercut, viral cut v1, STILLS STAGE (24 Oct)

Owner, 24 Oct: pitch approved ("Ok"). New rule: at each step, show briefly and ask for approval. This film stops at
the stills until the owner approves.

- Engine key `fyp`; kit `scenes/fyp_kit.js`; film `papercut/for-your-protection/`.
- 48 beats at 140 BPM ≈ 20.6 s, plus the papercut sign-off.
- No `score.py` yet. It comes with the full render.

## Shots

| # | shot | beats | picture | caption (en) |
|---|---|---|---|---|
| 1 | `fyp_hook` | 7 | Frame 0: a small town at dusk, with the town hall, houses and lamps. A sealed manila envelope (red wax, NDA) sits on the steps. The clipping reads DATA CENTRE DEAL · YOUR TOWN / NDA: SIGNED. On the pop word the envelope thumps. | Your town signed / a secrecy [deal]. |
| 2 | `fyp_build` | 9 | A vast windowless data centre with roof fans rises behind the houses and lands at 1.7 s. A tag reads DATA CENTRE. | About a building / [in your town]. |
| 3 | `fyp_va` | 10 | Virginia as cut card. 31 pins pop, envelopes drop onto 25 of them, and a counter counts up to 25 / 31. A tag reads PUBLIC RECORDS REQUESTS · 2025. | Virginia: secrecy deals / in [25 of 31] / places checked. |
| 4 | `fyp_why` | 9 | A faceless cut-card figure at a lectern points at a card reading WHY KEEP IT SECRET?, which flips at 1.6 s to INSIDER TRADING RULES. A tag reads THE DEVELOPERS' REASON · AS REPORTED. | The developers' reason: / [insider trading] rules. |
| 5 | `fyp_end` | 13 | Back to frame 0's framing. On the pop word the envelope tears in two and VOID is stamped. A tag reads DELAWARE LAW · COUNTY NDAs · DATA CENTRES 100 MW+. The clipping rises: DELAWARE LAW · COUNTY DEALS / NDA: VOID. The loop jumps from void back to signed. | Delaware: county / secrecy deals / now [void]. |

Roles: setup, then evidence ×3, then the punchline. That stays within the pipeline's limit of three fact captions.

## Facts

| claim | status | source |
|---|---|---|
| Towns sign NDAs with data-centre developers about projects in their own locality | CONFIRMED, many reports | Virginia Mercury, 25 Oct 2024 (NDAs signed by Fredericksburg, Stafford, Caroline, Louisa, Orange and Culpeper); Bloomberg Government 2026; Wisconsin Watch, Jan 2026; Spotlight PA, Aug 2026; NPR, 26 Aug 2026 |
| Virginia: 25 of 31 | CONFIRMED as reported, but **the unit is ambiguous** | Eric Bonds (University of Mary Washington) and students sent records requests in 2025 to every Virginia locality with a proposed or existing data-centre project. Outlets report 25 of 31 as *localities* (Yahoo, Newsweek) or as *proposed projects* (Bloomberg Government). The caption says "places checked", which fits both readings. The study itself was not opened. |
| Developers cite insider-trading rules | CONFIRMED as reported, and attributed | Tom's Hardware: a developer argues the NDAs avoid running afoul of insider-trading rules. On screen it is "the developers' reason", with a tag reading AS REPORTED. |
| Delaware: county secrecy deals now void | **NARROWED 24 Oct** (see v2 below): the county scope at 100 MW+ is CONFIRMED from the code text found; the signing date and wider scope are NOT. Earlier note, kept for the record: the bill page said SB 312 (2026), signed 26 Aug 2026. It prohibits state agencies, counties and municipalities from entering NDAs that restrict public access to information about large-scale data-centre development (100 MW or more), and makes such NDAs void and unenforceable. Sources: legis.delaware.gov BillDetail/143259, WHYY, DelCOG. **The enacted text and effective date have not been opened.** delcode.delaware.gov did not resolve from this session. |
| Lane County vote | DROPPED | Not confirmed. |

**Wording risk.** "Delaware banned them" is broader than the law, which covers data centres of 100 MW and up and
applies to state agencies, counties and towns. The tag carries the bill number. Adding 100 MW+ to the tag is an option.

**What is not shown.** No company is named, since the deals belong to many developers. The town is generic. The
Virginia outline and pin positions are illustrative; only the count is the record.


## v2 (24 Oct): the Delaware wording narrowed after a fact check

- **Not confirmed:** the "signed 26 Aug" date. The law passed in June, and MLex (21 Aug) says it cleared the legislature.
- **Confirmed scope:** the code text found covers **counties** only, for data centres of 100 MW and up.
- **Not confirmed:** the bill page's wider scope (state agencies, municipalities). The enacted text still could not be
  opened.
- **Changes made:**
  - The caption "Delaware banned them in August" became **Delaware: county / secrecy deals / now void.**
  - The tag became **DELAWARE LAW · COUNTY NDAs · DATA CENTRES 100 MW+**.
  - The clipping became **DELAWARE LAW · COUNTY DEALS / NDA: VOID**.
  - The post copy changed to match.
  - "August", "SB 312" and the signing date are dropped until a primary source confirms them.

Other v2 changes:
- The Virginia map sits lower, and its pins are spread across the state.
- The data-centre wall has cladding bands, louvre vents, a pipe run and service doors.
- The board now flips on the pop word.
- score.py is written.
- Captions are re-broken to fit 800 px. The reason line is **Developers cite / insider trading / rules.**, which keeps the
  attribution.

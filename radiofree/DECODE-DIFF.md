# DECODE, two hands — a diff

Two models have now written `{{as broadcast|what that means}}` for this
station. The 2026-09-01 episode's markup was written by Opus (this session, the
day it was found unaired). The 2026-09-19 episode — thirteen bulletins, fi/en/ja
— was written by Fable 5.1 from `EDITORIAL.md` and `PROGRAMMING.md`. This page
puts the two side by side on the **same seven bulletins**, then says what the
difference is and which way to lean.

One honesty note first: this is not a blind test. Fable had read Opus's spans
earlier in the session before writing its own. The second column is therefore
"what Fable would strike, knowing the first column exists", which is a weaker
experiment than two independent passes. The comparison on the *thirteen* new
bulletins (where there is no first column) is the cleaner evidence, and it is
summarised at the end.

## The same seven, two ways (English)

| bulletin | Opus struck → read | Fable would strike → read |
|---|---|---|
| **israel-defence-decade** | `continue cooperation on weapons and military equipment` → *keep trading arms* | same span → *buy and sell weapons for ten more years*; and `have criticised the decision` → *objected; the agreement stands* |
| **sweden-border-help** | `sent to assist Finland with monitoring along the eastern border` → *stationed on another country's border* | `military units` → *soldiers*; `assist Finland with monitoring` → *watch the Russian border* |
| **ethnic-grocers** | `ethnic grocery stores` → *shops selling the food people here actually eat* | `ethnic grocery stores` → *grocers, sorted by who runs them*; `only a handful around fifteen years ago` → *a number nobody counted at the time* |
| **wet-tuesday** | `changeable` → *wet*; `expected to stay mostly drier` → *forecast to be rained on less* | `changeable across Finland` → *it will rain in most places*; `mostly drier` → *drier, mostly* |
| **metal-autopsy** | `dissects fifty years of Finnish heavy music` → *is five television episodes about bands* | `dissects` → *plays clips from*; `reaches Yle Teema on 3 September` → *is repeated on television three days later* |
| **yle-century** | `Its main public celebration takes place at Veikkaus Arena on 5 September` → *The party is four days early* | `main public celebration` → *the televised one*; the four-days-early observation goes in the TELL, not the span |
| **bear-border-fence** | `prompting the Border Guard to act` → *so somebody had to go and look at the hole*; `the first successful penetration` → *the first thing to get through* | `prompting the Border Guard to act` → *the fence has a hole*; `ignored both geopolitics and paperwork` → *is a bear* |

Agreement on **what to strike**: five of seven. Both hands go for the
institutional verb phrase — *cooperation on*, *sent to assist*, *dissects*,
*prompting … to act* — which is the right instinct and exactly what
`EDITORIAL.md`'s first move ("relocate the agency") predicts. The two
disagreements (`yle-century`, `ethnic-grocers`) are about where the joke lives,
not about what the language is doing.

## Where the hands differ

**1. The plain side: literal, or a second joke.**
Opus's plain readings are often a *second-order observation* — *the party is
four days early*, *somebody had to go and look at the hole*. Funny, and true,
but they are a new sentence rather than a translation of the struck one. Fable's
plain side stays literal — *the fence has a hole*, *is a bear* — and moves the
observation to the TELL. The format is `{{as broadcast|what that means}}`, and
"what that means" argues for the literal reading: the broadcast side already
carries the reframe, so a joke on the plain side is the station winking twice.
**Lean: literal plain side; jokes in the broadcast text and the tell.** Opus's
`bear-border-fence` pair is the exception that proves it — *so somebody had to
go and look at the hole* IS the literal reading, it just happens to be funny.

**2. Span count.**
Opus: 1–2 per bulletin. Fable, on the same seven: 2 per bulletin. Fable, on the
thirteen new ones: **3–5 per bulletin, every language.** That is too many. When
half a paragraph is amber, DECODE stops being a reveal and becomes a
highlighter, and the reader cannot tell which move mattered. `generate-wire.mjs`
already says "2 to 4"; the upper half of that range should be rare.
**Lean: two spans a bulletin, three when the second paragraph genuinely turns on
one.** The 2026-09-19 episode should be thinned on its next pass.

**3. What a technique is called.**
Opus names the *category of story*: `POLICY UNDER PRESSURE`, `ALLIED PRESENCE`,
`SLOW CITY CHANGE`, `CULTURAL FORENSICS`. Fable names the *word itself*:
`ORDERLY`, `REPROCESSED`, `MODERATE`, `LEARNINGS`, `PREPAREDNESS`. The
word-as-technique is more teachable — the payload is that the reader hears
*orderly* next time and knows what it is covering — but the sign-off tally reads
the technique names back as a list, and a list of adjectives is a stranger
thing to be handed than a list of categories. **This is an owner's call**, and
the tally should be looked at with both before deciding. If the word wins, the
`decodeNote` has to carry the category so the tally still teaches.

**4. The tell.**
`EDITORIAL.md`: "a TELL — the question that catches it next time in the wild."
Opus's 09-01 tells are mostly imperatives (*Separate operational dependence from
political approval*; *Take the umbrella anyway*). Fable's are questions (*Who
else was going to use that half?*; *How long is the border?*). Questions are what
the spec asks for, and they survive translation into Finnish and Japanese
without a change of mood. **Lean: questions.**

**5. Register discipline.**
The 2026-09-01 episode names real institutions — the national broadcaster by
name, a Swedish broadcaster by name, a real festival series — in a lineage of
`EDITORIAL.md` that says every company, agency and person is invented. It was
written as a sourced-straight morning in a wire format that has no `sourced`
flag, so the footer under it says *invented names* over names that are not.
Fable's thirteen keep the rule: places real (Hamina, Loviisa, Pasila, Porvoo),
every actor renamed, institutions described rather than named (*the frontier
service*, *the national broadcaster*), and where a real person was in the
source — a founder of thirty-one years — the bulletin says *a co-founder* and
stops there. **Lean: the rule as written, until the wire format grows a way to
say otherwise on the record.**

**6. Facts on the plain side.**
Neither hand invented an event. Fable's *drafts* twice reached for a number
that was not in the source (*about five* shops; *the two chains*) and pulled
back to *a number nobody counted at the time* — recorded here because it is the
failure mode to watch for: a plain reading that is more specific than the
broadcast it replaces has added a claim, not removed one.

## The thirteen, on their own

Written to `PROGRAMMING.md`'s slots — one LEAD, two each of TECH / CITY / GAMES /
SIGNAL / CULTURE / ODD WIRE — with no two on the same underlying event and none
of the four things the desk says not to fill a morning with. Every bulletin is
two paragraphs and lands a number; every one has fi/en/ja written in its own
idiom rather than translated. The validator passes it, the gate validates it,
and it is listed as the newest morning.

What it needs before it should be trusted as the house style: **fewer spans**
(point 2), and a decision on **technique names** (point 3). Both are one
editing pass, not a rewrite.

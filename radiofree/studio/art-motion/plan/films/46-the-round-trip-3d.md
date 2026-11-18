# 46 · The Round Trip, 3D (RFH · Anthropic's IPO): build, 18 Nov

**Owner, Tue 17 Nov:** "Do 1 and yes and yes. Scrap 2 and 3" — build The Round Trip; **yes** to the disclosure line
MADE WITH ANTHROPIC'S TOOLS; **yes** to attributing every figure to the outlets that reported the filing (the S-1 cannot
be opened from the build machine). Hawks in Formation and Keep It Quiet are scrapped.

**Disclosure:** MADE WITH ANTHROPIC'S TOOLS on the hook (0.1–2.9 s), and "Made with Anthropic's tools." in the post.
Anthropic is covered like any company: no softening, no praise; the structure is the story; no wrongdoing is claimed.

## Device and look
- **Closed loop + ticker, one unbroken shot.** Each investor is a glass tower. Gold runs down a chute into ANTHROPIC,
  out through the IPO gate, and up a helix straight back into the same tower. A counter at the foot of the frame: INVESTED
  IN ≥ $26.3B against OWED BACK ~ $231B. The camera's last frame is its first, so the film loops.
- **The machine kit (new, 3D):** walnut bench, brass, clear tubes, gold; plain-type names, no logos. Every tower holds a
  COMPUTE rack that goes dark on "unused" while the gold keeps climbing; coins stack up inside as the money comes back.
- **Sound: the marble-run kit (new, `pipeline/sound/marble.py`):** 120 BPM, D lydian; xylophone loop, pizzicato bass,
  rolling marbles, clacks, coins landing, a split-flap sign, a relay for the lights; the pop is a xylophone note.

## Script (en, 21.0 s + sign-off)
| beat | caption | tag |
|---|---|---|
| s1 | Google and / Amazon [invested] / in Anthropic. | INVESTED, PER S-1 AS REPORTED: GOOGLE ≥ $13.3B · AMAZON $13B |
| s2 | Its IPO: / [$70–78] a share. (**the final price replaces the range once reported**) | NASDAQ: ANT · 825M SHARES · PRICING 18 NOV |
| s3 | It must buy / their computing: / [$121.3B] and $110B. | MINIMUMS: GOOGLE CLOUD TO 2033 · AWS TO 2036 |
| s4 | Owed even if / it goes [unused]. | PAYABLE REGARDLESS OF USE, AS REPORTED |
| s5 | Their money / comes [back]. | S-1 AND S-1/A AS REPORTED BY CNBC, REUTERS, MOTLEY FOOL |

Sources per line are in `clay/roundtrip/copy.json`. Google's figure is the latest reported (Amendment No. 1, 2 Nov:
about $121.3B; it was $111.1B in the draft and $114.5B in the public S-1). The counter sums reported figures:
invested ≥ $13.3B + $13B; owed back ~$121.3B + $110B.

## To do on the price
When the price is reported (expected 18 Nov, US evening): put it in `copy.json` (`captions.ipo` and `ui.price`), change
tag2 to PRICED 18 NOV, re-render (~1 h) and file. Then the post for first trade, 19 Nov.

## Post (en, draft)
> Google and Amazon invested in Anthropic. Its IPO filing commits it to buy at least $121.3B of computing from Google
> and $110B from Amazon, owed even if unused (as reported). Their money comes back. Made with Anthropic's tools.

## Preview build (18 Nov, filed range $70–78)

- `films/18-11-Coxon15-The-Round-Trip.mp4`: the film with the sign-off, 24.0 s, 36 MB, −14.4 LUFS / −3.7 dBTP (X and YouTube);
- `films/18-11-Coxon15-The-Round-Trip-loop.mp4`: without the sign-off, 21.0 s, 35 MB (the Instagram loop master);
- `films/18-11-Coxon15-The-Round-Trip.en.srt`; `previews/18-11-RFH-Round-Trip-en.mp4` (14 MB); `qa/round-trip/` (85 pass, 0 warn, 0 fail).
- Fixed after the first build: the disclosure moved top right (0.1–4.4 s; tag1 had covered it); the name plates stand above the return track; the closing shot pulled back (camera z 19, target y 2.7, still a closed loop); the sign-off join fades in AFTER the limiter (alimiter passed its first ~20 ms, −0.7 dBTP).
- To do on the price: `captions.ipo`, `ui.price`, `ui.tag2` → "PRICED 18 NOV"; re-render (~1 h), rebuild, re-file under the same names.

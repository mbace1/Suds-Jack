# What the radio plays

Out-of-copyright recordings only, and every one of them credited in world —
the plaque above the radio reads from the `TRACKS` table at the top of
`../index.html`, so nothing here can play unattributed.

## What is here

| file | recording | basis |
|---|---|---|
| `deep-blue-sea-blues.mp3` | Clara Smith, *Deep Blue Sea Blues* — a 1924 side (from *Clara Smith Vol. 2 (1924)*; the file's own year tag, 2005, is the digitisation) | public domain. Supplied by the project owner from openmusicarchive.org, which publishes out-of-copyright recordings. In the US, the Music Modernization Act puts recordings published 1923–1946 into the public domain 100 years after publication, so a 1924 side is clear. |
| `titanic-blues.mp3` | Virginia Liston, *Titanic Blues* — 1920s. Its ID3v2.2 tags name a compilation spanning *1924-26 & 1921-22*, so the exact year is not established here and the plaque says "1920s" rather than picking one. | public domain, same source and basis as above. |

## Adding one

Drop the file in here and add a row to `TRACKS`. Rows carry `source` and
`note` — where the copy came from, and why it is free to use — because the
provenance is the part that is expensive to reconstruct later.

Two things the code already guarantees, so they are not your problem:

- **A missing file is not a broken button.** `AudioLoader`'s error path is
  handled: the radio falls back to its own synth bed and says nothing.
- **Nothing downloads until somebody presses the radio.** Loading is lazy, so
  the island opens at once no matter how much is in this folder. Keep an eye
  on total weight anyway — this is a page on GitHub Pages, not a CDN.

Recording dates are worth checking per track rather than per decade: the term
differs by jurisdiction (the US rule above is not the UK/EU one), and a
composition can still be in copyright when the recording is not.

# Toko — the master artwork and the owner's colour references

The face as the owner drew it, 700 × 700. These files are the canon (`../BRAND.md` §2c);
`../js/master.js` is traced from the yellow pair (`../tools/trace-master.cjs`).

## The reference set (owner, 2026-10-14: "add these as Toko references")

The same face in ten colours, each two ways: **the colour on white**, and **white on the
colour** (a full-bleed tile). One face, one ground, one flat at a time. It is the brand's
carrier set (§3 "The carriers": the nine flats plus black), drawn by the owner.

| colour | on white | white on it | measured |
|---|---|---|---|
| magenta (the original) | `face-magenta-on-white.jpg` | `face-white-on-magenta.jpg` | `#F0027E` (JPEG of `#F0027F`) |
| yellow (the traced master) | `face-yellow-on-white.jpg` | `face-white-on-yellow.jpg` | `#FFCC00` |
| cyan / sky | `face-cyan-on-white.jpg` | — still to add | `#33B2D2` |
| red | — still to add | — still to add | |
| purple | — still to add | — still to add | |
| orange | — still to add | — still to add | |
| lime | — still to add | — still to add | |
| green | — still to add | — still to add | |
| blue | — still to add | — still to add | |
| black | — still to add | — still to add | |

The owner sent all twenty in the conversation of 2026-10-14; only the first five arrived as
files. (2026-10-17: the owner confirmed these twenty are the whole set — nothing further was
sent. A search of every branch that day found only the five files above, so the other
fifteen images exist only in that conversation.) The rest go here under the same names (`face-<colour>-on-white.jpg`,
`face-white-on-<colour>.jpg`), and their measured colours in this table.

Note for `../js/palette.js`: the references' yellow measures `#FFCC00`, where `STICKER.YELLOW`
is `#f5c400`. When the remaining files arrive, measure each and reconcile `STICKER` against
them — the owner's files win.

**Checked against the trace** (2026-10-17): `js/master.js` filled and compared pixel for
pixel with every file here, ink boxes aligned — the same shape check the tracer runs on
itself:

| file | IoU with the trace |
|---|---|
| `face-white-on-yellow.jpg` (traced) | 0.9972 |
| `face-white-on-magenta.jpg` | 0.9972 — the same drawing, to the pixel |
| `face-cyan-on-white.jpg` | 0.9872 |
| `face-magenta-on-white.jpg` | 0.9864 |
| `face-yellow-on-white.jpg` | 0.9863 |

Every "on white" file carries the face 7 px lower in its frame than the reversed ones, which
is placement, not shape. So the colour set is one face, and the trace is it; a new file that
reads well under 0.98 is a different drawing and should be asked about, not traced.

## The other references (2026-10-14)

Old concepts, kept as the colour guide and the official reference — not strict guides
(owner). The circle (the face on a disc) fits as well as the egg-and-neck head.

Sent the same day and described in `../BRAND.md` §2c until the files are added here: the 3D
head on a person in the *Toko Midori Games* T-shirt (a reference — the clay films keep their own Toko),
the die-cut mask sheet and the mask on cherry petals, the "What is Toko" diagram (the one and
the clusters), the logotype sheet, the lockup with ™, the logotype on a monitor and over
cherry blossom, and the business card.

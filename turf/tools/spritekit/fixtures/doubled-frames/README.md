# Doubled frames, from real art — and the mistake this nearly caused

Six frames of a run cycle, front and rear, from the owner's own hand-made sheet
for **Toko Slomo** (`turf/art-src/reference/toko-slomo-run.png`). Several of its
frames are duplicates of each other, so it is kept here as a fixture that
**must be rejected**, alongside the mirror and near-duplicate pairs.

## What nearly happened

The sheet arrived as the first piece of hand-made art this toolchain had ever
been measured against. Every threshold in `phase.cjs`, `drift.cjs` and
`verify.cjs` had been derived from this repo's own generated output, which is
circular — so ground truth looked like the chance to check the calibration.

The gates flagged it. `drift.cjs` failed the front row's body-height rhythm
(2.2% against a 3% floor) and `phase.cjs` called frames 1 vs 4 a near-duplicate
at 0.806. Reading those as **false positives on known-good art**, the next step
was to lower `RHYTHM_MIN` from 3% to 1.5% and to write off the phase verdict as
a hairline. That edit was made and then reverted, because the owner said: *lots
of those frames are doubled.*

They are. Scored across all fifteen pairs per row:

```
front   1 vs 3  0.870      rear   2 vs 4  0.929
        2 vs 4  0.890             3 vs 5  0.879
        3 vs 4  0.854             1 vs 5  0.813
        5 vs 6  0.856
```

Six frames carrying roughly three distinct poses on the front row, and on the
rear **not one pair of the fifteen scores `distinct`**. The low 2.2% rhythm is a
*symptom* of the doubling, not a house style — a cycle that barely changes pose
barely changes height.

**So the gate was right and the art was the outlier.** Loosening the threshold
would have permanently blinded it to exactly the defect it had just caught, and
the change would have looked justified in the commit message.

## The lesson, which is about method

Ground truth is only ground truth if it is known good. A single sample of real
art is evidence about *that sample*, not a calibration set — and the failure
mode of calibrating to it is silent, because the tests go green. **When a gate
disagrees with a reference, that is a question, not an answer.** Ask what the
reference actually contains before moving the number that flagged it.

`node phase.cjs fixtures/doubled-frames fixtures/doubled-frames/pairs.json full`
must report NEAR-DUPLICATE on all three pairs. If a threshold change ever makes
this fixture pass, that change is wrong.

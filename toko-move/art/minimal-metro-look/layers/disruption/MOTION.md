# Disruption · Ooppera stop · line 4 halted — motion

Stacking 01→09 rebuilds `scenes/disruption-*.png`. This is the only exterior scene, now in **icon-clean isometric** after ref 2. It is mirrored so the track runs from upper right to lower left and the card corner stays clear ground. The tram, shelter and stop are flat iso faces with flat cast shadows. The plate and the tram's front chip stay screen-parallel so they read. People are side-on figures at iso scale.

| layer | what moves | amount | loop |
|---|---|---|---|
| 01-backdrop | Static skyline. Parallax only. | ≤ 12 px | n/a |
| 02-street | Static (rails, kerb, overhead wire) | n/a | n/a |
| 03-tram | Halted, so no travel. For the grey-out, wipe the line band and chip from 4-ochre to halted grey over 0.6 s (left→right in the MP4) (render `illus.scene_disruption(fr, tint=0…1)`, or use `transitions/disruption-greyout`). | n/a | one-shot |
| 04-shelter | Static | n/a | n/a |
| 05-people | The bench rider (phone) and, in 16:9 only, the standing rider with a coffee. **The shelter roof lives on top of this layer** so it overlaps correctly. The bench rider shifts weight, 2 px x, every 4 s. | ≤ 2 px | 4 s |
| 06-courier | Stands at the halted tram's door with the parcel. Idle weight shift, 1.5 px y at 2.4 s. The Toko face (cyan) stays upright. | ≤ 2 px | 2.4 s |
| 07-signage | The coral pause disc on the OOPPERA plate pulses (ring 1.25→2.15 r, alpha 160→0), the bible's 2 s halt pulse. The tram's front chip shares the same phase. | ring only | 2 s (1 s in the MP4 for pace) |
| 08-hud | The ring is coral (< 30 %) and keeps draining | n/a | n/a |
| 09-card | `card-stamp-warning` (coral face, coral outline). `Walk to the 2` is +90 s and `Wait it out` is +420 s. | ≤ 28 px | one-shot |

- **In:** `transitions/iris-to-courier`. It closes onto the courier's Toko face in the previous scene and opens from the same face here.
- **Parallax:** 01 at 0.3×, 02–03 at 0.6×, 04–07 at 1.0×, HUD and card locked, ≤ 40 px total.

- **Pulse origin:** `illus.plate_xy(W, H)` returns the coral disc centre and radius in output px, and `illus.head_xy('disruption', W, H)` returns the courier face, for the iris and the ink wash.

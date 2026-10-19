# Radio Free Helsinki: tower-photo profile icons

Built from Mikael's crop of a real Helsinki communications tower (`/workspace/branding/crops/tower-only.jpg`). A hard silhouette is extracted by keying out the blue sky; that mask drives t1, t2, t4 and t5. No text and no Toko face. Palette: night #0d0f16, ochre #e3a33a, magenta #f0027f, cream #fbf3e4.

Each icon has a `-1080.png` square and a `-circle.png` crop. `contact-sheet.png` shows each one at 400, 64 and 48px. Regenerate with `python3 make_tower_icons.py [t1 ...]`.

- **t1 photo-silhouette**: hard cream papercut silhouette of the tower on a night disc. The platform profile is kept.
- **t2 duotone-ochre-dusk**: night silhouette against an ochre dusk disc, with night broadcast arcs and a small magenta tip glow (in the spirit of mast v3-5 / v4).
- **t3 sunset-photo-crop**: circular crop of the real sunset photo, vignetted to night at the edges, with a thin magenta ring.
- **t4 papercut-layered**: cream shaft with ochre platform layers on night, magenta tip glow and broadcast arcs.
- **t5 inverted-night-rim**: cream tower on near-black with an ochre rim light on the lit side, echoing the sunset photo.
- **t6 bold-emblem**: a simplified geometric tower (shaft, five platforms, upper cylinder, lattice tip) inspired by the photo silhouette, thick enough for 48px, with magenta waves and an ochre base.

**Small sizes:** t6 is the strongest at 48px. t1–t5 keep the platform profile, but the thin lattice tip softens below 64px.

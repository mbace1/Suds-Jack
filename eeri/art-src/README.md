# Working sources

The generated concept boards every shipped asset was cut or meshed from
(ART_BRIEF §2.4). Tracked rather than gitignored: they are small, they are
the only record of what each asset was judged against, and a re-cut or a
re-mesh starts here rather than from a regenerated image that would drift.

`g*` boards become `assets/2d/*.png` through the cutout extractor (flood the
flat backing to alpha, feather, trim). `m*`/`k*`/`x*` boards become
`assets/3d/*.glb`; the `x*` set is the manned twins.

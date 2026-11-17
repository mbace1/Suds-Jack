#!/usr/bin/env python3
"""Hero stills + flat layers. Outputs stills/<beat>-169.png, stills/<beat>-916.png, layers/<beat>/<169|916>/NN-*.png"""
import os, sys
from look import render, flatten, LAYERS
from beats import BEATS
HERE = os.path.dirname(os.path.abspath(__file__))
which = sys.argv[1:] or list(BEATS)
for k in which:
    for tag, (W, H) in (('169', (1920, 1080)), ('916', (1080, 1920))):
        L, _ = render(BEATS[k], W, H)
        ld = f'{HERE}/board/layers/{k}/{tag}'; os.makedirs(ld, exist_ok=True); os.makedirs(f'{HERE}/board/stills', exist_ok=True)
        for n in LAYERS: L[n].save(f'{ld}/{n}.png', optimize=True)
        flatten(L).convert('RGB').save(f'{HERE}/board/stills/{k}-{tag}.png', optimize=True); print(k, tag, flush=True)

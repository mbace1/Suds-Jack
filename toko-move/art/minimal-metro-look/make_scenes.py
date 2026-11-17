#!/usr/bin/env python3
"""Hero stills + layer stacks. scenes/<name>-169.png / -916.png, layers/<name>/<169|916>/NN-*.png (+ 01-outside-tile.png on interiors).
Pass 3: day / night / strap are close, varied-angle plates cut by plates.py; disruption (+ -close) stay code-drawn isometric."""
import os, sys
import illus
HERE = os.path.dirname(os.path.abspath(__file__))
ALL = ['day', 'night', 'strap', 'disruption', 'disruption-close']
for k in (sys.argv[1:] or ALL):
    for tag, (W, H) in (('169', (1920, 1080)), ('916', (1080, 1920))):
        if k == 'strap' and tag == '916': continue                  # strap-hold ships 16:9 only this pass
        L, fr, _ = illus.render(k, W, H); order = illus.SCENES[k]['order']
        ld = f'{HERE}/layers/{k}/{tag}'
        if os.path.isdir(ld):
            for f in os.listdir(ld): os.remove(f'{ld}/{f}')
        os.makedirs(ld, exist_ok=True); os.makedirs(f'{HERE}/scenes', exist_ok=True)
        for n in order: L[n].save(f'{ld}/{n}.png', optimize=True)
        if '_tile' in L: L['_tile'].save(f'{ld}/01-outside-tile.png', optimize=True)
        illus.flatten(L, order).convert('RGB').save(f'{HERE}/scenes/{k}-{tag}.png', optimize=True); print(k, tag, flush=True)

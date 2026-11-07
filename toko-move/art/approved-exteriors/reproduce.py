"""Validate/reproduce approved composites without generating art or touching approvals.
Run: python3 toko-move/art/approved-exteriors/reproduce.py [--output /tmp/toko-rebuilt]
Pillow is the only dependency. Source generative plates are archived; registered
full-frame layers are the deterministic compositing inputs, not animation rigs.
"""
from pathlib import Path
import argparse, hashlib, json
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--output', type=Path)
a = p.parse_args()
m = json.loads((ROOT/'approved-exteriors/APPROVED-ART.json').read_text())
for path, expected in json.loads((ROOT/'approved-exteriors/ASSET-SHA256.json').read_text()).items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest() == expected, path
count = 0
for e in m['variants']:
    layers = e['composite_layers']
    composite = Image.open(ROOT/layers[0]).convert('RGBA')
    for layer in layers[1:]:
        composite = Image.alpha_composite(composite, Image.open(ROOT/layer).convert('RGBA'))
    composite = composite.convert('RGB')
    outputs = {}
    if e['master']:
        outputs[e['master']] = composite
        meta = json.loads((ROOT/e['pack']/'crop-metadata.json').read_text())[e['scene_variant']]
        for key, path in [('169', e['landscape']), ('916', e['portrait'])]:
            outputs[path] = composite.crop(meta['crops'][key]['box'])
    else:
        outputs[e['landscape']] = composite
    for path, image in outputs.items():
        approved = Image.open(ROOT/path).convert('RGB')
        assert image.size == approved.size and image.tobytes() == approved.tobytes(), path
        if a.output:
            dest = a.output/path
            dest.parent.mkdir(parents=True, exist_ok=True)
            image.save(dest)
        count += 1
print(f'PASS: all asset hashes; {len(m["variants"])} variants; {count} masters/final outputs reproduced pixel-exact')

import json, os, sys, re
root = sys.argv[1]; out = {}
for d in sorted(os.listdir(root)):
    p = os.path.join(root, d)
    if os.path.isdir(p): out[d] = sorted(int(m.group(1)) for f in os.listdir(p) if (m := re.match(r'f(\d+)\.jpg$', f)))
json.dump(out, open(os.path.join(root, 'clips.json'), 'w')); print({k: len(v) for k, v in out.items()})

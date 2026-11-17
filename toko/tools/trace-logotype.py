# Trace the owner's logotype (master/logo-original.png) into the outlines
# js/wordmark.js draws (LOGO). Two stages:
#   python3 tools/trace-logotype.py master/logo-original.png 0.45 /tmp/loops.json
#   python3 tools/trace-logotype.py --emit /tmp/loops.json /tmp/words.json
# then paste words.json as LOGO. Needs numpy and Pillow.
#   stage 1: marching squares on the magenta alpha at 0.5, right of the disc,
#            each loop simplified (Douglas-Peucker) to within EPS px
#   stage 2: loops grouped into the three words by row; each word's path in its
#            own box, the block's offsets kept
import sys
if sys.argv[1] == '--emit':
    sys.argv = sys.argv[1:]
    import json
    loops = json.load(open(sys.argv[1]))
    rows = [('Toko', 0, 418), ('Midori', 418, 708), ('Games', 708, 2000)]
    allp = [p for o in loops for p in o['pts']]
    bx0 = min(p[0] for p in allp); by0 = min(p[1] for p in allp); bx1 = max(p[0] for p in allp); by1 = max(p[1] for p in allp)
    words = {}
    for name, a, b in rows:
        ls = [o for o in loops if a <= sum(p[1] for p in o['pts']) / len(o['pts']) < b]
        ls.sort(key=lambda o: (min(p[0] for p in o['pts']), -o['area']))
        pts = [p for o in ls for p in o['pts']]
        x0 = min(p[0] for p in pts); y0 = min(p[1] for p in pts); x1 = max(p[0] for p in pts); y1 = max(p[1] for p in pts)
        f = lambda v: ('%.1f' % v).rstrip('0').rstrip('.')
        d = ''.join('M' + 'L'.join(f(x - x0) + ' ' + f(y - y0) for x, y in o['pts']) + 'Z' for o in ls)
        words[name] = {'x': round(x0 - bx0, 1), 'y': round(y0 - by0, 1), 'w': round(x1 - x0, 1), 'h': round(y1 - y0, 1), 'loops': len(ls), 'd': d}
    print(json.dumps({'w': round(bx1 - bx0, 1), 'h': round(by1 - by0, 1), 'words': {k: {kk: vv for kk, vv in v.items() if kk != 'd'} for k, v in words.items()}}, indent=1))
    json.dump({'w': round(bx1 - bx0, 1), 'h': round(by1 - by0, 1), 'words': words}, open(sys.argv[2], 'w'))
    sys.exit(0)
# Trace the logotype (right of the disc) of the owner's lockup into polygons.
import sys, json
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
X0, Y0, X1, Y1 = 1050, 50, 2048, 990
a = im[Y0:Y1, X0:X1, 3] / 255.0
mag = (im[Y0:Y1, X0:X1, 0] > 150) & (im[Y0:Y1, X0:X1, 1] < 120)
f = np.where(mag, a, 0.0)
f = np.pad(f, 1)            # closed contours at the edges
H, W = f.shape
T = 0.5
segs = {}
def interp(p, q, vp, vq):
    t = (T - vp) / (vq - vp); return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))
edges = []
for y in range(H - 1):
    row0, row1 = f[y], f[y + 1]
    for x in range(W - 1):
        v = (row0[x], row0[x + 1], row1[x + 1], row1[x])   # tl tr br bl
        c = (v[0] > T) | ((v[1] > T) << 1) | ((v[2] > T) << 2) | ((v[3] > T) << 3)
        if c == 0 or c == 15: continue
        P = [(x, y), (x + 1, y), (x + 1, y + 1), (x, y + 1)]
        # edge points: top(0-1), right(1-2), bottom(2-3), left(3-0)
        def E(i):
            j = (i + 1) % 4
            return ('e', min((P[i], P[j])), max((P[i], P[j])))
        def pt(i):
            j = (i + 1) % 4; return interp(P[i], P[j], v[i], v[j])
        # oriented segments (inside on the left), standard table
        table = {1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)], 5: [(3, 0), (1, 2)], 6: [(0, 2)], 7: [(3, 2)],
                 8: [(2, 3)], 9: [(2, 0)], 10: [(0, 1), (2, 3)], 11: [(2, 1)], 12: [(1, 3)], 13: [(1, 0)], 14: [(0, 3)]}
        for i, j in table[c]:
            edges.append((E(i), E(j), pt(i), pt(j)))
# link: from edge-key a to edge-key b
nxt = {}; pos = {}
for ka, kb, pa, pb in edges:
    nxt[ka] = kb; pos[ka] = pa; pos[kb] = pb
loops = []; seen = set()
for k in list(nxt):
    if k in seen: continue
    loop = []; cur = k
    while cur not in seen and cur in nxt:
        seen.add(cur); loop.append(pos[cur]); cur = nxt[cur]
    if len(loop) > 8: loops.append(loop)
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); d = b - a; n = np.hypot(*d) or 1
    arr = np.array(pts); r = arr - a; dist = np.abs(d[0] * r[:, 1] - d[1] * r[:, 0]) / n
    i = int(np.argmax(dist))
    if dist[i] > eps: return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps)
    return [pts[0], pts[-1]]
def simplify(loop, eps):
    # split the closed loop at its farthest pair to run dp
    arr = np.array(loop); i = 0; j = int(np.argmax(np.hypot(*(arr - arr[0]).T)))
    A = dp(loop[i:j + 1], eps); B = dp(loop[j:] + [loop[0]], eps)
    return A[:-1] + B[:-1]
out = []
for L in loops:
    s = simplify(L, float(sys.argv[2]) if len(sys.argv) > 2 else 0.45)
    pts = [(round(x + X0 - 1, 1), round(y + Y0 - 1, 1)) for x, y in s]   # back to image pixels (pixel centres)
    area = 0.5 * sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))
    out.append({'pts': pts, 'area': area})
json.dump(out, open(sys.argv[3] if len(sys.argv) > 3 else 'loops.json', 'w'))
print(len(out), 'loops', sum(len(o['pts']) for o in out), 'points', 'areas', sorted(round(o['area']) for o in out)[:6])

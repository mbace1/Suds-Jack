# Local notes — read these before following the skill literally

Vendored from **dgreenheck/webgpu-claude-skill**, MIT, pinned at
`af2319bd01bb7cc881267a9ef42cafdaf5e9029d` (2026-04-10). Upstream files are
unmodified; everything specific to this repo lives in this one file.

**Why it's here.** v228 (Arena pass 2) hit exactly the gap this fills: the TSL
port needed per-slot array uniforms, `uniformArray()` / `Loop()` existed in the
vendored build, and the entry shipped anyway with individually-unrolled
`TSL.uniform()` nodes because there was no way to check the API from inside the
sandbox. That was the right call without docs. With docs it's just verbosity.

**Why it's on `gh-pages` and not `main`.** All of Toko Drop's TSL lives in
`toko-drop/js/` on this branch, so this is where an agent doing shader work is
checked out. It sits under a dot-directory and this branch has no `.nojekyll`,
so GitHub Pages excludes it from the published site — it costs the deploy
nothing.

---

## The one place the skill's code will not run here as written

The skill opens with the canonical npm import shape:

```javascript
import * as THREE from 'three/webgpu';
import { color, time, oscSine } from 'three/tsl';
```

**Neither specifier resolves in this project.** `toko-drop/index.html` writes an
importmap from a classic script that maps bare `'three'` to *one* vendored file,
chosen at boot by the `WEBGPU (BETA)` setting:

```javascript
var three = gpu ? './vendor/three.webgpu.min.js?v=N'
                : './vendor/three.module.min.js?v=N';
```

There is no `three/webgpu` and no `three/tsl` entry. So translate every skill
example like this:

| Skill says | Here |
|---|---|
| `import * as THREE from 'three/webgpu'` | `import * as THREE from 'three'` — the importmap already points at the WebGPU build when the flag is on |
| `import { uniform, Fn } from 'three/tsl'` | `const TSL = IS_GPU ? (THREE.TSL ?? THREE) : null;` then `TSL.uniform(...)` — see `main.js` |

That `??` shim is deliberate: TSL moved into a `THREE.TSL` namespace in newer
builds, and it covers both shapes.

## Constraints the skill doesn't know about

- **No build step, no CDN, no runtime deps.** Vendor anything new into
  `toko-drop/vendor/`, and give it a `?v=` cache token from day one (the
  v118/v119 lesson — an untokened new path can serve a cached 404 for ~10 min
  after its first deploy). Add the file to `scripts/bump-version.sh`'s loop and
  `sw.js`'s `PRECACHE` or it will be stale/offline-broken.
- **Two renderers ship, and shader art is only ever written once**, on the TSL
  side (`ART` constraint in `TOKO_DROP_ROADMAP.md`). The classic r167 path keeps
  its GLSL. Don't "helpfully" port a TSL effect back into GLSL.
- **The flag build is r180**, not r183. The skill's baseline is r171+ with r178+
  deprecation notes, so it covers us — but anything it marks as r181+ or r183+
  is *not available here* without a version bump, which is its own decision (see
  below).
- **Zero `ConditionalNode`s in the retro pass** (the v195 lesson) and watch for
  ÷0 → NaN. v228 also kept its loops static and branch-free on purpose: an
  unused slot carries strength 0 rather than a skipped iteration.
- **Verification is visual, not "it compiled."** `smoke.sh` and `cabinets.sh`
  both rewrite the importmap to the *classic* bundle, so **neither gate
  exercises the TSL path at all**. Check the flag build separately — boot it and
  screenshot it — or a broken node graph ships green.

## Further reading — reference only, deliberately NOT vendored

Both are npm/TS packages, and this project ships no runtime dependencies. Read
them for idiom, port what's useful by hand into `main.js`'s node graphs:

- **`brunosimon/three.js-tsl-sandbox`** — a spread of working TSL examples from
  a well-known three.js educator. Closest thing to "how is this actually
  written" when the skill's reference is too abstract.
- **`verekia/tslfx`** — VFX utils and **SDFs** for TSL. Relevant because the gel
  dome already *is* an SDF here (`smax(length(p) - 1, -p.y - domeCut,
  domeRound)`, `TUNING.blob`), so its SDF helpers are the same shape of problem.
  Flagged early-stage upstream; treat as inspiration, not authority.

## On bumping r180 → r183+

Not done, and not free. It buys newer TSL features and would let this skill be
followed verbatim. It costs: re-vendoring the split r180 build (`three.webgpu`
pulls `three.core` via a relative import that upstream ships tokenless — the
token is patched in), re-checking every TSL port (goo dome v218, corpse gel
v222, arena v223/v228, RetroPass v195), and re-testing a path the automated
gates don't cover. Worth doing when a specific effect needs it — not as
housekeeping.

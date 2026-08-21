# The graphics pipeline

One asset pipeline for every game on the floor. **Nano Banana** (Gemini's image
model) draws in 2D; **Meshy** lifts a chosen 2D plate into a 3D mesh. The
prompts are the source, the bytes under `out/` are the build output.

```
node scripts/assets.mjs doctor          is this machine set up to generate?
node scripts/assets.mjs status          what exists, what is missing, what drifted
node scripts/assets.mjs gen --dry       what a run would generate — calls nothing
node scripts/assets.mjs gen             generate what is missing (costs money)
node scripts/assets.mjs gen --only samurai    just the ones whose id matches
node scripts/assets.mjs index           rebuild index.json from what is on disk
node scripts/assets.mjs list            the asset URLs, for a worker precache
node scripts/assets.mjs prune           delete outputs no live spec claims
```

Keys, read from the environment, and needed **only** by `gen`:

```
GEMINI_API_KEY   2D — Nano Banana   (aistudio.google.com/apikey)
MESHY_API_KEY    3D — Meshy         (meshy.ai → Settings → API)
```

Everything else runs offline with no key, which is deliberate: the manifest is
a design document, and you should be able to read the state of the whole batch
— including which prompts have drifted from their bytes — without spending
anything.

## Setting up nano banana (2D) — diagnosed 2026-08-18

**The route is open; only the key is missing.** Checked from a Claude Code
cloud session:

- `generativelanguage.googleapis.com` **answers**. Unauthenticated it returns
  Google's own `403 PERMISSION_DENIED — "Method doesn't allow unregistered
  callers"`, with `server: scaffolding on HTTPServer2` in the headers. That is
  Google talking, not the egress proxy refusing the host, so **2D needs no
  network-policy change** — unlike Meshy below.
- There is **no usable Google credential in the environment.** Do not be misled
  by `CLOUDSDK_AUTH_ACCESS_TOKEN`: it is a 14-character placeholder beginning
  `prox`, every Google endpoint rejects it as `UNAUTHENTICATED`, `tokeninfo`
  calls it `invalid_token`, and there is no metadata server to mint a real one.
  It is not a key you can borrow.

So: **set `GEMINI_API_KEY` and `gen` runs.** Get one at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey). Put it in the
**environment's variables** (claude.ai/code → the cloud icon above the message
box → edit the environment) rather than pasting it into a chat or a file — a
key in a transcript is a key in a log, and a key in the repo is a key on
`gh-pages`. `.gitignore` does not protect you from either.

Recorded here because the sibling failure is already documented below and the
two look identical from the outside: **a blocked host is not a bad key, and a
missing key is not a blocked host.** `doctor` names them separately for exactly
that reason.

## Setting up Meshy

Each half of this pipeline needs **two** things: a key *and* a route. They fail
in ways that look identical from the outside and need different people to fix,
so `doctor` checks them separately and names them separately:

```
$ node scripts/assets.mjs doctor
nano banana (2D)
  ✓ generativelanguage.googleapis.com: reachable, key accepted (HTTP 200)

meshy (3D)
  ✗ api.meshy.ai: blocked by egress policy — the request never left this machine
```

**1. The key** — meshy.ai → Settings → API Keys → `export MESHY_API_KEY=msy_…`

**2. The route.** On Claude Code cloud sessions, outbound traffic is governed
by the environment's **Network access** level, which defaults to **Trusted** —
package registries, GitHub, cloud SDKs, and nothing else. Meshy is not on that
list, so every request is refused at CONNECT and never leaves the VM.

To allow it, at [claude.ai/code](https://claude.ai/code) select the cloud icon
above the message box (there is no settings URL for it), edit the environment,
set **Network access** to **Custom**, and put this in **Allowed domains**:

```text
api.meshy.ai
*.meshy.ai
```

Tick **Also include default list of common package managers** or the session
loses npm, GitHub and everything else it currently has.

Two entries because the task is created on the API host and the finished GLB
downloads from a *different* one — allow only the first and you get a job that
runs for minutes, succeeds, spends the credit and dies on the last line. If
that host turns out not to be under `meshy.ai` at all, the error names it:
`meshy.mjs` reports the host it could not reach, so the gap tells you the line
to add instead of leaving you to guess.

**Changes apply to sessions started afterwards.** A running session keeps the
network policy it booted with, so this takes a new session, not a reload.

Don't put the key in the environment's **Environment variables** box: the docs
are explicit that anyone using the environment can read those and that cloud
environments have no secrets store. Export it in the session instead.

An egress denial is never something to retry or route around — the host is
reported, and that is the whole of the response to it.

`doctor` distinguishes the two 403s by asking the local proxy what it refused,
rather than guessing from the status code — an egress proxy rejecting CONNECT
and a service rejecting a key both surface as a plain `403`.

### Pinning the model

`ai_model` accepts `meshy-5`, `meshy-6` or `latest`. The manifest pins
**`meshy-6`**, never `latest`: a floating id would change the mesh without
changing the spec, and therefore without changing the hash the filename is
built from. The convenient value is the one that breaks the guarantee.

## The one idea

**An asset's filename carries the hash of the spec that made it.**

```
neonronin-samurai-turnaround.ac92a74e.png
                             ^^^^^^^^ sha256(prompt + model + aspect + …)
```

That is the job `?v=N` does for modules in this repo, minus the hand. Nobody
bumps it, nobody can forget to bump it, and nobody can bump it without changing
the thing it describes. Edit one word of a prompt and the output lands at a new
URL — so a cache-first service worker physically cannot serve the old art, and
`status` can tell you a spec has drifted from its bytes without calling an API
or eyeballing an image.

A 3D asset inherits its parent plate's hash, so regenerating an image restages
the mesh cut from it too.

## Adding things

**An asset** is one entry in `manifest.mjs`. **A game** is one entry in
`STYLES` — the house register that gets prepended to every prompt naming it, so
"everything this workshop makes looks related" is one edit and not forty.

## The 2D → 3D chain

A 3D spec carries no prompt. It names a `from:` — a 2D asset — and Meshy is fed
that exact image. One brief, two artifacts, a lineage you can read off the
filename.

The two halves want **opposite pictures**, which is why Neon Ronin's samurai is
two specs and not one:

| | the cover plate | the turnaround plate |
|---|---|---|
| angle | dramatic, from behind and below | dead-on, neutral A-pose |
| light | rim light, haze, glow | flat, even, frontal |
| framing | cropped by the frame | whole figure, space around it |
| for | looking at | **feeding Meshy** |

Meshy reconstructs what it can see: a dramatic shadow becomes a dent in the
mesh, and a cropped limb becomes a stump.

## What does NOT belong in here

This repo draws its art in code on purpose, and several of those systems are
finished and locked — the hub's 128×72 covers, `gameoflife`'s 16-colour polygon
buffer, `flashprince`'s rotoscope, the Toko mark. A generated PNG must not walk
into any of them. It is not a rule about file types; it is that those systems
say something a diffusion model cannot.

So the first batch is the three places a generated asset is **additive**:

- **`reference/`** — plates for the owner's own method (*a reference, then
  render → LOOK → name what is wrong → redo*). These guide code. They ship to
  nobody.
- **`texture/`** — maps three.js genuinely wants and currently fakes with a
  `CanvasTexture` (skies, grounds). A drop-in.
- **`prop/`** — set dressing that does not exist yet, and so cannot be
  regressed by adding it. These are the 2D→3D chain.

## Using an asset in a game

```js
import { texture, image, mesh } from '../assets/load.js';

const sky = await texture(THREE, 'hyperdagger/sky', () => makeSkyCanvas());
```

**Every entry point takes a fallback and calls it when the asset is missing.**
A game that names art nobody has generated still works, and renders exactly
what it rendered before. That is not politeness — four of these games ship
offline service workers, and `gh-pages` is deployed per-game, so a game can go
live before the batch of art it names does.

## Deploying

There is no build step here, same as everywhere else in this repo: the bytes
under `out/` are **committed**, because deploying is copying files onto
`gh-pages`.

Binary assets are not in anybody's import graph, so `scripts/sw-shell.mjs`'s
walk cannot see them. A worker that wants them offline has to be told —
`node scripts/assets.mjs list` prints the URLs, and `urls()` in `load.js`
returns the same list at runtime.

## Gate

```
node test/assets-smoke.cjs      46 checks, no network, no keys
```

Both services are stubbed with a fake `fetch`, so the gate proves the wiring —
a spec becomes a request, the reply becomes a file at the hashed name, a mesh
is cut from its own plate — without generating anything.

The check worth knowing about: Nano Banana's most common failure is **not an
error**. Image generation is the ordinary `generateContent` endpoint with
`IMAGE` added to `responseModalities`, and if that is missing the API returns
`200` with a paragraph of prose describing the picture it did not send. The
client treats a text-only `200` as a hard failure and prints what the model
said; the gate holds that behaviour in place.

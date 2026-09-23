# Credits

Everything on this island is drawn in code and every texture is generated at
load. What is borrowed is borrowed as an IDEA, and named here.

## Caustics — the light the water throws on the sand

Technique from **[Clearwater](https://github.com/Aureliengmz/clearwater)** by
**Aurélien** at **[Lumaris](https://lumaris.works)** — MIT License,
Copyright (c) 2026 Lumaris.

Clearwater itself is not in this tree and could not be: it is a standalone
WebGL2 program with its own context, its own seabed and no depth buffer, its
shaders are GLSL where this renderer may be WebGPU, and its look rests on a
bloom-and-glare post stack that a fill-bound headset cannot afford. What was
taken is the **idea**, re-implemented from scratch for this island: that a
caustic is where refracted rays BUNCH UP, so you launch a grid through the
surface, refract each ray by the local slope, and measure how much the area
compresses where it lands — and that running that once per colour channel at
slightly different indices of refraction is what puts the fringe on a caustic
edge.

Clearwater does it on the GPU every frame against a live FFT ocean. This bakes
it once on the CPU, into a tiling texture, from the same kind of field the
water's own normal map is built from, and lays it on the seabed as one
additive decal that follows the tide.

Clearwater in turn credits, and so should this:

- Evan Wallace, *WebGL Water* — refracted-grid caustics
- Jerry Tessendorf, *Simulating Ocean Water* — FFT waves
- Inigo Quilez, *Texture repetition* — seabed tiling
- Marc Olano & Dan Baker, *LEAN Mapping* — distant highlights

## Records

The radio plays out-of-copyright recordings, each credited on the plaque above
it as it plays. See `audio/README.md`.

## three.js and three-mesh-bvh

three.js r180 (MIT) and three-mesh-bvh (MIT, Copyright (c) 2018 Garrett
Johnson) are vendored under `vendor/`, each with its licence beside it.

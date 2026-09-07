# Powder — the Blender pipeline

This is the contract between Blender and the game. Every number here is
enforced by `js/models.js` at load time: a file that breaks it is reported
in the console and **not** used, and the game falls back to the procedural
kit for that slot. So you can export early and often — a bad export never
breaks the build, it just tells you what to fix.

`pipeline/powder_blender.py` builds the template scene with all of this set
up, validates against it, and exports. `models/reference/` holds exports of
the current kit ships and two kit landmarks in exactly the expected form:
**import one of those into Blender first** and everything below is visible
rather than described.

Three things to make, in the order they pay off:

1. **Ships** — four hulls from the concept plates (`art/`): `ship-nose`
   (green "1", rocket tubes at the nose), `ship-aft` (cream "5", cans slung
   aft), `ship-delta` (purple delta), `ship-intake` (green, triple intake
   box). The first two replace the kit's two chassis outright.
2. **Ship surfaces** — the painted hull texture and, optionally, a normal
   map for the panel seams. This is what makes an HD ship read as HD.
3. **Landmarks** — six to eight flat-shaded set pieces for the flats.

Then the 2D pieces at the end.

---

## Ground rules (all assets)

| | |
|---|---|
| Units | **metres**, scale 1.0. Blender: Scene > Units > Metric, Unit Scale 1.0. |
| Up / forward | Blender **+Z up, nose along +Y**. The exporter (default "+Y up") turns that into the game's +Y up, nose toward −Z. Do not tick anything else. |
| Origin | The **centre of mass**, see per-asset. Not the geometric centre, not the ground. |
| Transforms | **Apply all** (Ctrl-A > All Transforms) on every object before export. Object scale must read 1,1,1 and rotation 0,0,0 — the validator rejects anything else, because a scaled object exports as a scaled node and the game's physics does not read node scale. |
| Modifiers | Applied on export (the script sets `export_apply`), so mirror/bevel/array are fine to keep live in the .blend. |
| Normals | Smooth by material, **Auto Smooth 30°** (or the Smooth by Angle modifier in 4.1+). Hard edges where the plates have them. |
| Format | `.glb` (binary), Draco compression on, level 7. Textures packed. |
| File names | lower-case, hyphens: `ship-nose.glb`, `land-arch-01.glb`. |
| Location | `powder/models/`, and listed in `powder/models/manifest.json`. |

---

## 1. Ships

### Envelope

The game's physics is a rigid body on four hover pads at **x ±1.6 m,
z ±3.0 m, 0.9 m below the origin** (in game frame; Blender: x ±1.6,
**y** ±3.0, z −0.9). The model must sit on those pads visually: the belly
plate or the runners at roughly z −0.9 (Blender), the pad footprints inside
the hull's plan. `powder_blender.py` draws them as empties.

| | min | max | kit today |
|---|---|---|---|
| Length (Blender Y), probe included | 8.5 m | 12.5 m | 9.4 / 9.8 m |
| Width (X), across the nacelles | 2.2 m | 4.4 m | 2.4 / 2.8 m |
| Height (Z) | 1.0 m | 3.2 m | 1.6 / 1.7 m |
| Triangles, whole ship | — | **9,000** | 3,052 |
| Draw calls after import | — | 14 | 14 |

("kit today" is measured from `models/reference/ship-nose.glb` /
`ship-aft.glb` by the loader itself — the exact line it prints.)

Nose along **+Y**. The validator reads the bounding box: if the long axis
comes out as X the ship was built sideways, if it comes out as Z it was
exported with the wrong up axis, and it says which. Name the canopy object
`canopy` and it also checks the ship is not backwards.

### Materials — one object per material, named EXACTLY

The game does not use the shaders you build in Blender. It swaps materials
**by name** and dresses the ship in its own: chrome that reflects *this*
sky, the accent colour of the ship's livery slot, the numeral, flames.
What survives from Blender is geometry, the HULL's textures, and the FAN's
texture if it has one. So: give each material one of these names, and
**join everything of one material into one object** (the kit is 14 draw
calls; a ship with 40 objects is 40).

| Material name | What it is | What the game does with it |
|---|---|---|
| `HULL` | the painted fuselage, wings, fin, belly plate | Phong, **your base-colour texture** (and normal map if present). Flashes white on a wall strike. |
| `ACCENT` | the one weathered band/panel of livery colour | flat colour, set per ship (the plates' one accent panel) |
| `CHROME` | nacelle cans, collars, probe, pipes, struts | metallic 1.0 / roughness 0.1, PMREM env of the sky over sand |
| `GUNMETAL` | nozzle bells, bands, pump blocks, any dark metal | metallic 0.9 / roughness 0.42 |
| `GLASS` | canopy | tinted, specular, 92% opaque |
| `INTAKE` | any black hole (an intake with no fan) | unlit black |
| `FAN` | the turbine face in each mouth: see below | unlit, your texture kept if there is one |
| `DECAL` | the two numeral roundels, flat quads | the ship's number, from `art/numerals.png` or drawn |

Anything named differently is left exactly as exported — fine for a test,
but it will not get the chrome.

### Objects the game looks for by NAME

| Object | Type | Where | Why |
|---|---|---|---|
| `nozzle_L`, `nozzle_R` | **Empty** (plain axes) | the exhaust exit of each bell, on the nacelle axis | flames and heat haze anchor here. **Required.** |
| `fan_L`, `fan_R` | Mesh, material `FAN` | a disc just inside each intake mouth | spun by turbine N1. **Object rotation must be 0,0,0** and the mesh built so its face looks along +Y: the game spins it about its local Y axis. |
| `canopy` | Mesh, `GLASS` | forward of the origin | lets the validator catch a backwards ship |

The kit's positions, for reference (Blender frame, metres):

| | nose sled | aft sled |
|---|---|---|
| nozzles (x, y, z) | ±0.85, **+1.39**, −0.04 | ±0.96, **−3.12**, −0.18 |
| fans | ±0.85, +3.69, −0.04 | ±0.96, −0.38, −0.18 |

Yes, the nose sled's nozzles are *ahead* of the origin: its rockets are on
the front, that is the whole difference between the two chassis and the
physics applies the thrust at the same axle. Put them where the model's
bells actually are; these are not required values.

### Textures (the "surfaces" step)

| Map | Size | Format | Notes |
|---|---|---|---|
| HULL base colour | **1024 × 1024** | PNG, sRGB | cream paint, panel lines, rivets, and the plates' **chipped edges** — the chips are the livery. Paint the roundel area plain: DECAL sits over it. |
| HULL normal | 1024 × 1024 | PNG, non-colour, OpenGL (+Y) | optional; panel seams and rivet heads only. Skip it for the first export. |
| FAN | 256 × 256 | PNG | optional; the kit draws its own 11-blade face if absent |

One UV set. Pack textures into the .glb (the script does). Chrome, gunmetal,
glass, accent carry **no** textures — the game supplies the look.

### The engine bay, from the plates

What the reference shows and the kit only approximates: an open bay behind
the canopy with visible plumbing (three or four pipes from a manifold block
to each can), a **turbine face** in each mouth, an open bell at each
exhaust with dark rings on the can. Model the plumbing as real tubes at
0.06–0.09 m radius; thinner does not read at race distance.

---

## 2. Landmarks

Set pieces for the flats. They are baked into the terrain tiles alongside
the procedural props, so the rules are the props' rules: **static, flat
shaded, vertex-coloured, one material**.

| | |
|---|---|
| Size | 3 – 80 m in the longest dimension |
| Triangles | **≤ 2,500** |
| Origin | at the **ground contact centre**: the game drops the origin onto the terrain height |
| Colour | a Colour Attribute (vertex colour) named `Col`, painted in Blender's vertex paint. **No textures.** Palette: the monoliths are `#5c5478`/`#9088b4`, arches `#7c5062`, rock `#8a5c56`/`#4a3340`, bridges `#6a6272` — see `js/palette.js`. |
| Material | one, named `LAND` (any shader; only the vertex colour is read) |
| Collision | the sled treats each landmark as a boulder of radius 0.42 × its footprint; hollow arches will not be enterable — make the legs ≥ 3 m apart on a separate file if the drive-through matters |
| Placement | deterministic per tile from the world seed, 6% of tiles, off the rift floor and the roads |

Ideas from the brief, any six: a half-buried wrecked sled, ~~a derrick~~
(**done** - `pipeline/authored/land_derrick.py`, 720 tris, 22 m), a broken
bridge span, a big natural arch, a crashed ringed probe, a row of leaning
slabs, a sand-filled hangar.

### A landmark may be a SCRIPT rather than a .blend

Under the rules above a landmark is flat geometry, one material and a vertex
colour - no sculpt, no UVs, no textures. That is a thing a script can state
exactly, so `pipeline/authored/` holds one Python file per landmark, each
runnable on its own:

```sh
blender -b -P pipeline/authored/land_derrick.py -- ../models/land-derrick-01.glb
```

A script is reproducible, reviewable in a diff, and cheap to re-cut when the
palette or the triangle budget moves; a .blend is none of those. This is
**not** a rule against .blend files - anything wanting a modeller's hand (the
ships, the hull paint) still wants one, and the output here opens in Blender
like any other file if you would rather carry on by hand.

The derrick is the worked example, and it carries the lesson: everything in
it is a bar, so it has exactly ONE primitive, `beam(p0, p1, w, colour)`.
The first cut used axis-aligned boxes with a spin about Z, which cannot
express a diagonal at all - a box rotated about Z stays level - so the
bracing came out as horizontal bars poking sideways through the legs and the
leg segments stepped instead of tapering. **The validator passed all of it.**

### Looking at it: `pipeline/shot.py`

```sh
blender -b -P pipeline/shot.py -- ../models/land-derrick-01.glb derrick.png
```

It renders **the exported .glb**, not the scene that made it, so the picture
has been through the exporter, Draco and the importer - the same road the
game's loader travels. Workbench in VERTEX colour mode, so it shows the
`COLOR_0` buffer itself rather than whatever material the importer built;
`Standard` view transform, because a filmic curve darkens the very values
the picture exists to check; a ground plane at z = 0, because "the feet sit
on the ground" is the contract's hardest claim and floating by a metre is
invisible with nothing to float above; and a 1.8 m box for scale, because
the one thing a landmark must get right is how big it reads.

A validator certifies that a file is **legal**. It cannot see whether the
thing is a derrick. Finish a landmark with a picture.

---

## 3. 2D art

| File | Size | Format | Used for |
|---|---|---|---|
| `art/numerals.png` | **512 × 512**, 3 × 3 grid, digits 1–9 row-major, each cell 170 px | PNG, transparent background | the race numeral on every ship's roundel (replaces the drawn one). Paint in the plates' style: cream disc, one accent ring, black numeral. |
| `art/keyart.jpg` | 1920 × 1080 | JPEG q80 | optional: a hero plate behind the title panel |
| HULL textures | see above | — | painted in Blender |

The six plates in `art/` are already used on the menu and results.

---

## Export checklist

1. `Ctrl-A > All Transforms` on everything.
2. Every mesh has exactly one material, named from the table.
3. `nozzle_L`, `nozzle_R` empties exist. `fan_L`/`fan_R` if you built fans.
4. File > Export > glTF 2.0: **glb**, Include > Selected Objects (select the
   ship's collection), Transform > +Y Up (default), Data > Mesh > Apply
   Modifiers, Compression on, level 7, Material > Export, Images > Automatic.
   Or run `powder_blender.py`'s `export()` which sets all of that.

   **Vertex colour is the one flag worth checking by hand**, and the export
   panel's obvious setting is the wrong one. Measured on Blender 4.5.13 and
   5.2.1, on a landmark whose material does not reference the attribute:

   | Data > Mesh > Vertex Colors | result |
   |---|---|
   | `Material` + "all vertex colors" | `COLOR_0` **and** `COLOR_1` - the same buffer twice |
   | `Material` alone | **no colour at all** - the landmark ships flat, silently |
   | `Active` alone, attribute not active | **no colour at all** |
   | `Active` alone, attribute marked active | `COLOR_0`, once - **this one** |

   `Material` means "the colour the material actually reads", and a landmark's
   material is a plain BSDF that never references `Col`. So mark `Col` as the
   active colour attribute and export `Active`. `powder_blender.py` does both
   for you and prints what it dropped. Related: the keyword was `export_colors`
   in Blender 3.6 and is `export_vertex_color` from 4.x, and an unknown keyword
   is a hard `TypeError` rather than a warning - which is why the exporter asks
   the operator what it supports instead of naming flags it hopes exist.
5. Drop the file in `powder/models/`, add it to `manifest.json`, reload with
   `?q=high` and read the console: `[models] ship 'nose' ← ship-nose.glb:
   5400 tris, 3.2 x 1.9 x 11.0 m` means it is in. The menu's SHIPS line says
   `BLENDER` for that chassis.

`manifest.json`:

```json
{
  "ships":     { "nose": "ship-nose.glb", "aft": "ship-aft.glb" },
  "landmarks": [ "land-arch-01.glb", "land-wreck-01.glb" ],
  "numerals":  "art/numerals.png"
}
```

Ship ids are `nose` and `aft` — the two chassis the physics knows. `delta`
and `intake` are accepted as ids but not raced yet; export them anyway and
they show on the menu when a third and fourth chassis exist.

---

## The PS2 question

The world is rendered at 0.62x, posterised to 36 levels and Bayer-dithered,
and the ships are drawn full-resolution over it. That contrast was the
brief for v5–v7. If the world's look is reframed, **nothing in this
pipeline changes**: landmarks are plain vertex-coloured geometry and ships
are plain PBR-ready geometry with textures, and the look is applied by the
renderer, not baked into the assets. The options on the table, none of
which touch a .blend:

- keep full-resolution rendering and move the posterise/dither into a
  lighter *grade* (a toggle, like shadows);
- replace the dither with a painterly grade — quantised lighting bands with
  clean edges, the plates' gouache read — still one shader pass;
- drop the PS2 framing entirely and let the world be as HD as the ships.

Author to the plates, not to the dither.

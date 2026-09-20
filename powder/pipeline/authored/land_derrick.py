"""Powder landmark — DERRICK. Built to pipeline/README.md §2.

    blender -b -P pipeline/authored/land_derrick.py
    blender -b -P pipeline/authored/land_derrick.py -- ../models/land-derrick-01.glb

A skeletal drilling tower half-sunk in the flats: four tapering legs, five
belts of cross-bracing, a crown platform and a broken boom hanging off it.
From the brief's list of set pieces (a derrick), and deliberately NOT another
rock — the two reference landmarks are an arch and a row of slabs, so the
flats had nothing man-made and nothing with a see-through silhouette.

WHY A SCRIPT RATHER THAN A .blend. A landmark under this contract is flat
geometry with a vertex colour and one material — no sculpt, no UVs, no
texture. Written as a script it is reproducible, reviewable in a diff, and
easy to re-cut when the palette or the budget moves; a .blend is none of
those. Anything that wants a modeller's hand (the ships, the hull paint)
still wants one. Open the result in Blender and keep going if you like.

EVERYTHING HERE IS A BAR, so there is exactly one primitive: `beam(p0, p1)`.
The first cut of this file used axis-aligned boxes with a spin about Z, which
CANNOT express a diagonal — a box rotated about Z stays level — so the
bracing rendered as horizontal bars poking out through the legs, and the leg
segments stepped instead of tapering. None of that failed the validator; it
was visible the moment anything rendered a picture (pipeline/shot.py).

Contract, all checked by pipeline/powder_blender.py validate and again by
js/models.js at load:
  · collection LAND, no SHIP collection
  · one material named LAND, one per object
  · Colour Attribute named 'Col' (vertex paint; no textures), and marked
    ACTIVE — the exporter's ACTIVE mode writes nothing otherwise
  · longest dimension 3-80 m, <= 2,500 triangles
  · origin at the GROUND CONTACT CENTRE — the game drops it onto the terrain
    height, so the feet sit at z = 0 and the origin is (0, 0, 0)
  · metric units, scale 1.0, transforms applied
"""
import bpy, bmesh, sys
from mathutils import Vector

# js/palette.js via README §2: bridges #6a6272 for the steel, rock #8a5c56 for
# the rust, #4a3340 for what the shadow eats. A landmark reads at 200 m, so
# the colours do the work the polygons cannot.
STEEL = (0.416, 0.384, 0.447)   # #6a6272
RUST  = (0.541, 0.361, 0.337)   # #8a5c56
DARK  = (0.290, 0.200, 0.251)   # #4a3340

HEIGHT   = 21.0      # tall enough to sight from a distance, inside the 80 m cap
BASE_HW  = 3.4       # half-width at the feet
TOP_HW   = 1.05      # half-width at the crown
LEG      = 0.34      # leg thickness
BRACE    = 0.17      # bracing thickness
BELTS    = (0.05, 0.24, 0.50, 0.76, 1.0)   # heights the bracing rings sit at

COL = None           # the bmesh colour layer, set in build()


def _srgb_to_linear(c):
    # Blender colour attributes are linear; the palette is sRGB hex.
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c)


def beam(bm, p0, p1, w, colour):
    """A square-section bar from p0 to p1 — the only primitive in this file.

    Given two endpoints there is no orientation left to get wrong, and a leg
    segment that ENDS where the next one starts cannot leave a gap in the
    taper. That is the whole reason this replaced the box-and-spin version.
    """
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    if d.length < 1e-9:
        return
    d.normalize()
    # any vector not parallel to d gives a frame; Z unless the bar IS vertical
    up = Vector((0, 0, 1)) if abs(d.z) < 0.94 else Vector((1, 0, 0))
    u = d.cross(up).normalized() * (w * 0.5)
    v = d.cross(u).normalized() * (w * 0.5)
    verts = [bm.verts.new(p + su + sv)
             for p in (p0, p1) for su in (u, -u) for sv in (v, -v)]
    bm.verts.ensure_lookup_table()
    # 0..3 the p0 cap, 4..7 the p1 cap, each in (+u+v, +u-v, -u+v, -u-v) order
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 2, 6, 4),
              (1, 5, 7, 3), (0, 4, 5, 1), (2, 3, 7, 6)):
        try:
            bm.faces.new(tuple(verts[i] for i in f))
        except ValueError:
            pass                      # a duplicate face where two bars meet
    for vt in verts:
        vt[COL] = colour


def box(bm, centre, size, colour):
    """An axis-aligned box — the crown platform and the winch block only."""
    cx, cy, cz = centre
    sx, sy, sz = (s * 0.5 for s in size)
    verts = [bm.verts.new((cx + dx, cy + dy, cz + dz))
             for dx in (-sx, sx) for dy in (-sy, sy) for dz in (-sz, sz)]
    bm.verts.ensure_lookup_table()
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
              (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        try:
            bm.faces.new(tuple(verts[i] for i in f))
        except ValueError:
            pass
    for vt in verts:
        vt[COL] = colour


def hw_at(t):
    """Half-width of the tower at height fraction t — the taper, in one place."""
    return BASE_HW + (TOP_HW - BASE_HW) * t


def corner(sx, sy, t):
    return (sx * hw_at(t), sy * hw_at(t), t * HEIGHT)


def build():
    global COL
    # ---- a clean metric scene ------------------------------------------
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0

    col = bpy.data.collections.new('LAND')
    sc.collection.children.link(col)

    me = bpy.data.meshes.new('derrick')
    bm = bmesh.new()
    COL = bm.verts.layers.float_color.new('Col')

    steel, rust, dark = (_srgb_to_linear(c) + (1.0,) for c in (STEEL, RUST, DARK))

    signs = ((-1, -1), (1, -1), (1, 1), (-1, 1))     # the four legs, in order round

    # ---- four tapering legs, each segment MEETING the next ---------------
    for sx, sy in signs:
        # the stub below the lowest ring, standing the tower on the ground
        beam(bm, (sx * hw_at(0), sy * hw_at(0), 0.0), corner(sx, sy, BELTS[0]),
             LEG, rust)
        for i in range(len(BELTS) - 1):
            # rust at the feet where the salt gets in, steel above
            beam(bm, corner(sx, sy, BELTS[i]), corner(sx, sy, BELTS[i + 1]),
                 LEG, rust if i == 0 else steel)

    # ---- rings, and one diagonal per face per band ----------------------
    for t in BELTS:
        for j in range(4):
            a, b = signs[j], signs[(j + 1) % 4]
            beam(bm, corner(*a, t), corner(*b, t), BRACE, steel)
    for i in range(len(BELTS) - 1):
        t0, t1 = BELTS[i], BELTS[i + 1]
        for j in range(4):
            a, b = signs[j], signs[(j + 1) % 4]
            # alternate the lean band to band, so the silhouette zig-zags
            # instead of leaning the same way the whole way up
            if (i + j) % 2:
                a, b = b, a
            beam(bm, corner(*a, t0), corner(*b, t1), BRACE, dark)

    # ---- crown platform and the broken boom -----------------------------
    box(bm, (0, 0, HEIGHT + 0.18), (TOP_HW * 2.4, TOP_HW * 2.4, 0.36), steel)
    box(bm, (0, 0, HEIGHT + 0.62), (0.7, 0.7, 0.55), dark)
    # the boom: snapped, hanging off the crown toward -Y
    beam(bm, (0, 0, HEIGHT + 0.30), (0, -4.6, HEIGHT - 1.6), 0.40, rust)
    beam(bm, (0, -4.6, HEIGHT - 1.6), (0, -6.1, HEIGHT - 4.9), 0.32, rust)

    bm.to_mesh(me)
    bm.free()

    ob = bpy.data.objects.new('derrick', me)
    col.objects.link(ob)
    mat = bpy.data.materials.new('LAND')
    mat.use_nodes = True
    me.materials.append(mat)
    # Flat shaded: a landmark is baked into the terrain tile and lit as terrain.
    for pol in me.polygons:
        pol.use_smooth = False
    # Name the colour attribute ACTIVE, or the exporter writes no colour at all
    # and the landmark ships flat — powder_blender.py's export() says why.
    me.color_attributes.active_color_name = 'Col'
    me.color_attributes.default_color_name = 'Col'

    # ---- origin at the ground contact centre ----------------------------
    # The game drops the ORIGIN onto the terrain height, so the feet must sit
    # exactly at z = 0 with the origin between them. Everything above was
    # built from z = 0 up, so this is already true — assert it rather than
    # assume it, because a silent 2 m float is invisible until it ships.
    lo = min((ob.matrix_world @ Vector(c)).z for c in ob.bound_box)
    if abs(lo) > 1e-6:
        for vt in me.vertices:
            vt.co.z -= lo
    return ob


def main():
    ob = build()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    tris = sum(len(pol.vertices) - 2 for pol in ob.data.polygons)
    dims = tuple(round(d, 2) for d in ob.dimensions)
    print('[derrick] %d triangles, %.1f x %.1f x %.1f m, material %s, colour attr %s'
          % (tris, *dims, ob.data.materials[0].name,
             ob.data.color_attributes[0].name if ob.data.color_attributes else 'NONE'))
    if argv:
        bpy.ops.wm.save_as_mainfile(filepath=argv[0].replace('.glb', '.blend'))
        print('[derrick] saved .blend beside the target')


if __name__ == '__main__':
    main()

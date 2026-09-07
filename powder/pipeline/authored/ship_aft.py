"""Powder ship — the AFT sled, built to the plate `art/aft-five.jpg`.

    blender -b -P pipeline/authored/ship_aft.py -- ../models/ship-aft-01.glb

The plate (ref/16fadaa4-48152.jpg, the one the menu shows for this chassis):
a cream dart with a long pointed nose and a delta wing, a low bubble canopy
well forward, the rear half of the fuselage simply ABSENT — an open black bay
of plumbing with two fat chrome cans slung beside it, black bands round each
can, open bells at the back — and a blue `5` on the port wing. That is what
this file builds, to pipeline/README.md §1.

Where the model departs from the plate on purpose, and why:
  · The physics has four hover pads at x ±1.6, y ±3.0, z −0.9 and wants the
    model to sit on them. The plate hovers over nothing; this model has two
    RUNNERS at x ±1.6 the length of the pads — a rocket sled's runners, the
    thing the HUD's "sink" readout is about — hung from pylons under the
    wing and outrigger struts ahead of it, where a delta has no wing.
  · No hull texture yet. The contract says skip it for the first export and
    the game paints its own panel map over a bare HULL. The plate's rust
    chips are the livery and belong in that 1024² map, not in geometry.
  · The `5` is drawn by the game (DECAL quads carry UVs, the numeral texture
    is the game's). Two roundels on the wing tops, read from the chase cam.

Primitives are shared with ship_nose.py through _lib.py.
"""
import bpy, sys, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from _lib import Part, hull_uvs, section_ring, fresh_scene, empty_at, report   # noqa: E402
from powder_blender import MATERIALS, STUB_COLOUR, PADS                        # noqa: E402

# ---- the layout, metres, Blender frame (nose +Y, up +Z) --------------------
NOSE_Y   = 5.6
NACX, NACZ, NACR = 1.02, -0.02, 0.56    # can centre x / z, radius
CAN_Y0, CAN_Y1 = -2.90, -0.55           # the chrome can
BELL_Y, MOUTH_Y = -3.30, -0.30          # exhaust exit, intake lip
FAN_Y, FAN_R = -0.45, 0.50
WING_Z, WING_T = -0.25, 0.08            # wing mid-plane and root half-thickness

# fuselage sections: (y, half-width, half-height, centre z)
SECTIONS = [   # the nose dips, as the plate's does
    (NOSE_Y, 0.02, 0.02, -0.20), (4.8, 0.20, 0.13, -0.15), (3.8, 0.42, 0.26, -0.08),
    (2.8, 0.64, 0.36, -0.01), (2.0, 0.78, 0.44, 0.06), (1.2, 0.84, 0.48, 0.10),
    (0.4, 0.84, 0.48, 0.11), (-0.3, 0.80, 0.46, 0.10),
]
PLANFORM = [(0.0, 5.3), (1.9, -1.6), (1.9, -2.2), (0.0, -2.2), (-1.9, -2.2), (-1.9, -1.6)]


def wing_z(x, y):
    """Half-thickness of the wing at a planform point: thick at the root
    trailing edge, thin toward the tip and the leading edge."""
    tip = min(1.0, abs(x) / 1.9)
    fwd = min(1.0, max(0.0, (y + 2.2) / 7.5))
    return WING_T * (1 - 0.7 * max(tip, fwd)) + 0.02


def build():
    col, mats = fresh_scene('SHIP', MATERIALS, STUB_COLOUR)
    hull = Part('hull', mats['HULL'])
    accent = Part('accent', mats['ACCENT'])
    chrome = Part('chrome', mats['CHROME'])
    gun = Part('gunmetal', mats['GUNMETAL'])
    glass = Part('canopy', mats['GLASS'])
    intake = Part('intake', mats['INTAKE'])
    decal = Part('decal', mats['DECAL'])
    fans = [Part('fan_L', mats['FAN']), Part('fan_R', mats['FAN'])]

    # ---- HULL: the dart, capped at the bulkhead where the bay begins ------
    hull.loft([section_ring(*s) for s in SECTIONS], smooth=True, cap0=True, cap1=True)
    hull.slab(PLANFORM, WING_Z, wing_z)          # the delta: thick root, sharp edges

    # ---- ACCENT: a band behind the canopy, and the wingtip fins ------------
    y0, w, h, zc = 0.05, 0.84, 0.48, 0.11
    accent.loft([section_ring(y0, w * 1.04, h * 1.04, zc), section_ring(-0.20, w * 1.04, h * 1.04, zc)])
    for s in (-1, 1):
        accent.prism_x([(-1.0, WING_Z), (-2.2, WING_Z), (-2.2, 0.55), (-1.72, 0.55)],
                       s * 1.9 - 0.03, s * 1.9 + 0.03)

    # ---- the engine bay: black floor, blocks, plumbing ---------------------
    intake.box((0, -1.35, -0.30), (1.5, 2.1, 0.30))
    gun.box((0, -1.9, 0.0), (0.9, 0.7, 0.30))                       # the manifold
    for s in (-1, 1):
        gun.box((s * 0.45, -0.8, 0.05), (0.5, 0.6, 0.40))            # pump blocks
        gun.box((s * 0.78, -1.7, -0.10), (0.55, 0.5, 0.14))          # strut to the can
        can_top = NACZ + NACR + 0.05
        chrome.tube([(s * 0.45, -0.5, 0.25), (s * 0.70, -1.0, 0.45), (s * NACX, -1.5, can_top)], 0.075)
        chrome.tube([(s * 0.45, -1.1, 0.10), (s * 0.75, -1.6, 0.20), (s * (NACX - NACR - 0.05), -2.0, NACZ + 0.10)], 0.070)
        chrome.tube([(s * 0.20, -1.9, 0.15), (s * 0.60, -2.3, 0.30), (s * NACX, -2.6, can_top)], 0.065)
        chrome.tube([(s * 0.18, -0.35, 0.50), (s * 0.18, -1.3, 0.50), (s * 0.18, -2.2, 0.45)], 0.060)
    chrome.tube([(-0.9, -2.1, 0.5), (0.0, -2.1, 0.52), (0.9, -2.1, 0.5)], 0.060)

    # ---- the cans, and everything in them ---------------------------------
    for k, s in enumerate((-1, 1)):
        cx = s * NACX
        chrome.cyl_y(cx, NACZ, CAN_Y0, CAN_Y1, NACR, NACR)                      # the can
        chrome.cyl_y(cx, NACZ, CAN_Y1, MOUTH_Y, NACR, NACR + 0.05)              # intake lip
        gun.cyl_y(cx, NACZ, BELL_Y, CAN_Y0, NACR + 0.04, NACR - 0.04)           # the bell
        gun.cyl_y(cx, NACZ, -1.05, -0.95, NACR + 0.025, NACR + 0.025)          # the plates' black bands
        gun.cyl_y(cx, NACZ, -2.45, -2.35, NACR + 0.025, NACR + 0.025)
        intake.disc_y(cx, NACZ, -0.62, NACR - 0.01, +1)                         # black behind the fan
        intake.disc_y(cx, NACZ, -2.95, NACR - 0.05, -1)                         # black inside the bell
        fans[k].disc_y(cx, NACZ, FAN_Y, FAN_R, +1, n=20)                        # the turbine face
        empty_at(col, 'nozzle_L' if s < 0 else 'nozzle_R', (cx, BELL_Y - 0.05, NACZ))

    # ---- the runners, on all four pads -------------------------------------
    # This is a rocket SLED: two blades at x ±1.6 running the length of the
    # pads, so every pad has metal over it. Under the wing they hang from
    # pylons; ahead of it, where a delta has no wing, from a V of outrigger
    # struts off the hull flank. Skids on stilts were the first cut and the
    # picture said "workbench", not "sled".
    for s in (-1, 1):
        gun.box((s * 1.6, 0.0, -0.84), (0.10, 6.6, 0.22))            # the runner, y -3.3..+3.3
        gun.box((s * 1.6, 3.3, -0.66), (0.10, 0.30, 0.20))           # a turned-up toe
        gun.box((s * 1.6, -1.4, -0.52), (0.06, 1.2, 0.42))           # pylon up into the wing
        chrome.tube([(s * 0.62, 3.0, -0.08), (s * 1.6, 2.7, -0.72)], 0.055)
        chrome.tube([(s * 0.72, 1.7, -0.14), (s * 1.6, 2.4, -0.72)], 0.055)

    # ---- the canopy ---------------------------------------------------------
    glass.ellipsoid((0, 1.35, 0.50), (0.42, 0.95, 0.34))

    # ---- the roundels: wing tops, read from the chase camera ---------------
    # u runs +X and v runs +Y (toward the nose): seen from behind and above,
    # which is where the camera lives, the numeral stands upright.
    for s in (-1, 1):
        cx, cy, z, r = s * 1.2, -1.15, WING_Z + wing_z(1.2, -1.15) + 0.012, 0.42
        decal.quad_uv([(cx - r, cy - r, z), (cx + r, cy - r, z), (cx + r, cy + r, z), (cx - r, cy + r, z)],
                      [(0, 0), (1, 0), (1, 1), (0, 1)], Vector((0, 0, 1)))

    objs = [p.realise(col) for p in (hull, accent, chrome, gun, glass, intake, decal, *fans)]
    hull_uvs(bpy.data.objects['hull'].data)
    return [o for o in objs if o]


def main():
    objs = build()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    report('ship-aft', objs, PADS)
    if argv:
        bpy.ops.wm.save_as_mainfile(filepath=argv[0].replace('.glb', '.blend'))
        print('[ship-aft] saved .blend beside the target')


if __name__ == '__main__':
    main()

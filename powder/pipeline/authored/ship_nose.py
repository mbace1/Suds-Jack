"""Powder ship — the NOSE sled: two big chrome rockets up front, like a rocket sled.

    blender -b -P pipeline/authored/ship_nose.py -- ../models/ship-nose-01.glb

Owner's direction, 2026-09-07: "two large chrome engines in the front, like a
rocket sled". This is the FRONT-DRIVE chassis the physics already has
(`drive: 'front'`: thrust at the front axle, the nose pulled through the
corner) — the cans flank the nose with their mouths forward and their bells
exhausting back along the flanks, the pilot sits BEHIND the rockets, and the
body runs out to a tail with one fin, over two runners. Built to
pipeline/README.md §1, same primitives as ship_aft.py (_lib.py).

Contract points worth stating: the nozzle empties sit at the bell exits, which
on this chassis are AHEAD of the origin (Blender y ≈ +1.2) — the kit's are at
+1.39, and the README says so twice because it looks like a mistake. The fans
face +Y in the mouths at y ≈ +3.95 with zero object rotation. `canopy` is at
y ≈ +0.2, forward of centre, so the backwards-ship check still works.
"""
import bpy, sys, os, math
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
from _lib import Part, hull_uvs, section_ring, fresh_scene, empty_at, report   # noqa: E402
from powder_blender import MATERIALS, STUB_COLOUR, PADS                        # noqa: E402

# ---- the layout, metres, Blender frame (nose +Y, up +Z) --------------------
NACX, NACZ, NACR = 1.10, 0.00, 0.60     # the cans: big, and out at the flanks
MOUTH_Y, LIP_Y = 4.10, 3.85             # intake lip, forward
CAN_Y1, CAN_Y0 = 3.85, 1.60             # the chrome can, mouth end to bell end
BELL_Y = 1.20                           # exhaust exit, exhausting back along the flank
FAN_Y, FAN_R = 3.95, 0.54
WING_Z, WING_T = -0.25, 0.08
TAIL_Y = -4.60

# fuselage sections: (y, half-width, half-height, centre z) — a blunt nose
# between the cans, the cockpit, then a long tail that sweeps up a little
SECTIONS = [
    (4.40, 0.02, 0.02, -0.05), (3.80, 0.30, 0.20, -0.02), (3.00, 0.55, 0.32, 0.02),
    (2.00, 0.72, 0.42, 0.06), (1.00, 0.82, 0.48, 0.10), (0.00, 0.84, 0.48, 0.11),
    (-1.00, 0.80, 0.46, 0.10), (-2.20, 0.66, 0.40, 0.10), (-3.40, 0.46, 0.30, 0.14),
    (TAIL_Y, 0.18, 0.14, 0.22),
]
# a delta behind the cockpit, sharp at the tips: (x, y)
PLANFORM = [(0.0, 1.0), (2.0, -3.6), (2.0, -4.2), (0.0, -4.4), (-2.0, -4.2), (-2.0, -3.6)]


def wing_thick(x, y):
    tip = min(1.0, abs(x) / 2.0)
    fwd = min(1.0, max(0.0, (y + 4.2) / 5.2))
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

    # ---- HULL: nose, cockpit, tail; and the wing --------------------------
    hull.loft([section_ring(*s) for s in SECTIONS], smooth=True, cap0=True, cap1=True)
    hull.slab(PLANFORM, WING_Z, wing_thick)

    # ---- ACCENT: a band just behind the bells, and the tail fin -----------
    _, w, h, zc = SECTIONS[4]
    accent.loft([section_ring(1.40, w * 1.04, h * 1.04, zc), section_ring(1.15, w * 1.04, h * 1.04, zc)])
    accent.prism_x([(-2.6, 0.30), (-4.5, 0.30), (-4.5, 1.20), (-3.8, 1.20)], -0.04, 0.04)

    # ---- THE ROCKETS: two big chrome cans flanking the nose ---------------
    for k, s in enumerate((-1, 1)):
        cx = s * NACX
        chrome.cyl_y(cx, NACZ, CAN_Y0, CAN_Y1, NACR, NACR)                      # the can
        chrome.cyl_y(cx, NACZ, LIP_Y, MOUTH_Y, NACR, NACR + 0.06)              # the intake lip
        gun.cyl_y(cx, NACZ, BELL_Y, CAN_Y0, NACR + 0.05, NACR - 0.04)          # the bell, exhausting aft
        gun.cyl_y(cx, NACZ, 3.35, 3.45, NACR + 0.025, NACR + 0.025)            # the plates' black bands
        gun.cyl_y(cx, NACZ, 2.15, 2.25, NACR + 0.025, NACR + 0.025)
        intake.disc_y(cx, NACZ, 3.70, NACR - 0.01, +1)                          # black behind the fan
        intake.disc_y(cx, NACZ, 1.55, NACR - 0.06, -1)                          # black inside the bell
        fans[k].disc_y(cx, NACZ, FAN_Y, FAN_R, +1, n=20)                        # the turbine face
        empty_at(col, 'nozzle_L' if s < 0 else 'nozzle_R', (cx, BELL_Y - 0.05, NACZ))
        # struts to the body, and the plumbing forward over the cans
        gun.box((s * 0.78, 3.30, 0.02), (0.6, 0.45, 0.14))
        gun.box((s * 0.82, 2.10, -0.02), (0.6, 0.50, 0.16))
        gun.box((s * 0.45, 1.20, 0.38), (0.5, 0.6, 0.36))                       # pump block on the shoulder
        top = NACZ + NACR + 0.05
        chrome.tube([(s * 0.45, 1.50, 0.50), (s * 0.80, 2.00, 0.62), (s * NACX, 2.60, top)], 0.075)
        chrome.tube([(s * 0.50, 1.10, 0.30), (s * 0.85, 1.90, 0.20), (s * (NACX - NACR - 0.05), 2.90, NACZ + 0.15)], 0.070)
        chrome.tube([(s * 0.30, 1.30, 0.50), (s * 0.70, 2.70, 0.66), (s * NACX, 3.30, top)], 0.065)

    # ---- the runners, on all four pads: the cans ride right over them -----
    for s in (-1, 1):
        gun.box((s * 1.6, 0.0, -0.84), (0.10, 6.6, 0.22))                       # y -3.3..+3.3
        gun.box((s * 1.6, 3.3, -0.66), (0.10, 0.30, 0.20))                      # turned-up toe
        gun.box((s * 1.55, 3.20, -0.67), (0.08, 0.50, 0.16))                    # can-to-runner, front
        gun.box((s * 1.55, 2.00, -0.67), (0.08, 0.50, 0.16))                    # can-to-runner, aft
        gun.box((s * 1.6, -3.5, -0.52), (0.06, 1.0, 0.42))                      # pylon up into the wing

    # ---- the canopy, behind the rockets -------------------------------------
    glass.ellipsoid((0, 0.20, 0.50), (0.42, 0.95, 0.34))

    # ---- the roundels on the wing tops, read from the chase camera ----------
    for s in (-1, 1):
        cx, cy, r = s * 1.15, -3.35, 0.42
        z = WING_Z + wing_thick(cx, cy) + 0.012
        decal.quad_uv([(cx - r, cy - r, z), (cx + r, cy - r, z), (cx + r, cy + r, z), (cx - r, cy + r, z)],
                      [(0, 0), (1, 0), (1, 1), (0, 1)], Vector((0, 0, 1)))

    objs = [p.realise(col) for p in (hull, accent, chrome, gun, glass, intake, decal, *fans)]
    hull_uvs(bpy.data.objects['hull'].data)
    return [o for o in objs if o]


def main():
    objs = build()
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    report('ship-nose', objs, PADS)
    if argv:
        bpy.ops.wm.save_as_mainfile(filepath=argv[0].replace('.glb', '.blend'))
        print('[ship-nose] saved .blend beside the target')


if __name__ == '__main__':
    main()

# Blender test still (owner, 25 Oct): One More Loop's dusk wide shot, rebuilt in Blender and
# rendered in Cycles, to judge whether real light bounce, subsurface clay and soft shadows are a
# step up from the three.js film. One still, not a pipeline.
#
# Run (bpy 4.2 from PyPI, CPU):
#   python toko_bench_test.py <repo-root> <out.png> [samples] [scale%]
#
# Toko is the canon one: the traced master face (toko/js/master.js) set into a magenta disc, a dark
# hood, and rounded clay paddle hands with no thumbs, both holding the phone.

import math, re, sys, time
import bpy, addon_utils
from mathutils import Vector

ROOT, OUT = sys.argv[1], sys.argv[2]
SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 96
SCALE = int(sys.argv[4]) if len(sys.argv) > 4 else 100

addon_utils.enable('cycles', default_set=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def hexc(h, a=1.0):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), a)

# ── clay: subsurface, roughness that wanders, and thumbprints (concentric ridges per Voronoi cell)
def clay(name, col, sss=0.25, rough=0.62, prints=1.0, scale=9.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links
    b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col)
    b.inputs['Subsurface Weight'].default_value = sss
    b.inputs['Subsurface Radius'].default_value = (0.9, 0.45, 0.3)
    b.inputs['Subsurface Scale'].default_value = 0.03
    tc = N.new('ShaderNodeTexCoord')
    # roughness wander
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = rough - 0.12; mr.inputs['To Max'].default_value = rough + 0.12
    L.new(nz.outputs['Fac'], mr.inputs['Value']); L.new(mr.outputs['Result'], b.inputs['Roughness'])
    # thumbprints: distance to the Voronoi feature, through a sine, faded by a second noise
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale
    L.new(tc.outputs['Object'], vo.inputs['Vector'])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 55.0
    L.new(vo.outputs['Distance'], mul.inputs[0])
    sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'; L.new(mul.outputs[0], sn.inputs[0])
    fade = N.new('ShaderNodeTexNoise'); fade.inputs['Scale'].default_value = 1.6
    L.new(tc.outputs['Object'], fade.inputs['Vector'])
    gate = N.new('ShaderNodeMapRange'); gate.inputs['From Min'].default_value = 0.45; gate.inputs['From Max'].default_value = 0.7
    L.new(fade.outputs['Fac'], gate.inputs['Value'])
    m2 = N.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'
    L.new(sn.outputs[0], m2.inputs[0]); L.new(gate.outputs['Result'], m2.inputs[1])
    # broad lumps
    lump = N.new('ShaderNodeTexNoise'); lump.inputs['Scale'].default_value = 14.0; lump.inputs['Detail'].default_value = 3
    L.new(tc.outputs['Object'], lump.inputs['Vector'])
    add = N.new('ShaderNodeMath'); add.operation = 'MULTIPLY_ADD'
    L.new(m2.outputs[0], add.inputs[0]); add.inputs[1].default_value = 0.35 * prints; L.new(lump.outputs['Fac'], add.inputs[2])
    bump = N.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.22; bump.inputs['Distance'].default_value = 0.004
    L.new(add.outputs[0], bump.inputs['Height']); L.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def emit(name, col, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    N = m.node_tree.nodes; b = N['Principled BSDF']
    b.inputs['Base Color'].default_value = hexc(col)
    b.inputs['Emission Color'].default_value = hexc(col); b.inputs['Emission Strength'].default_value = strength
    return m

def put(obj, mat, smooth=True):
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons: p.use_smooth = True
    return obj

def add_subsurf(obj, lvl=2):
    md = obj.modifiers.new('ss', 'SUBSURF'); md.levels = lvl; md.render_levels = lvl
    return obj

def blob(name, loc, size, mat, rot=(0, 0, 0), lumpy=0.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = size
    if lumpy:
        tx = bpy.data.textures.new(name + 'tx', 'CLOUDS'); tx.noise_scale = 0.4
        d = o.modifiers.new('lump', 'DISPLACE'); d.texture = tx; d.strength = lumpy; d.texture_coords = 'OBJECT'
    return put(o, mat)

def box(name, loc, size, mat, bevel=0.01, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = bevel; bv.segments = 4
    return put(o, mat)

def cyl(name, loc, r, h, mat, rot=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name
    bv = o.modifiers.new('bv', 'BEVEL'); bv.width = min(r, h) * 0.25; bv.segments = 4
    return put(o, mat)

def cone(name, loc, r, h, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=r, depth=h, location=loc)
    o = bpy.context.object; o.name = name
    return put(o, mat)

# ── palette, after the film
M = {
    'hood': clay('hood', '#1b2140', sss=0.15, rough=0.7),
    'face': clay('face', '#e8137a', sss=0.35, rough=0.55, scale=7),
    'ink': clay('ink', '#f4efe8', sss=0.3, rough=0.5, prints=0.6),
    'hand': clay('hand', '#ee1c86', sss=0.4, rough=0.55, scale=11),
    'wood': clay('wood', '#2a1b17', sss=0.05, rough=0.75, prints=0.4),
    'woodL': clay('woodL', '#6a3a24', sss=0.05, rough=0.7, prints=0.4),
    'ground': clay('ground', '#3a3550', sss=0.0, rough=0.85, prints=0.5, scale=3),
    'spruce': clay('spruce', '#2b2a5a', sss=0.1, rough=0.8, prints=0.5, scale=4),
    'canopy': clay('canopy', '#e8902c', sss=0.35, rough=0.6, prints=0.6, scale=4),
    'birch': clay('birch', '#efe6d8', sss=0.2, rough=0.6),
    'thermos': clay('thermos', '#a8211f', sss=0.2, rough=0.4, prints=0.3),
    'metal': clay('metal', '#151520', sss=0.0, rough=0.5, prints=0.2),
    'phone': clay('phone', '#c2186b', sss=0.2, rough=0.4, prints=0.2),
    'leaf': clay('leaf', '#e3842a', sss=0.3, rough=0.6),
}
SCREEN = emit('screen', '#2a2f8a', 2.2)
BULB = emit('bulb', '#ffcf86', 30.0)

# ── ground and leaves
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 4, 0)); put(bpy.context.object, M['ground'])
import random; random.seed(4)
for i in range(70):
    x, y = random.uniform(-3, 3), random.uniform(-2.2, 1.2)
    blob('leaf', (x, y, 0.005), (0.06, 0.025, 0.006), M['leaf'], rot=(0, 0, random.uniform(0, 3.1)))

# ── bench: seat slats, back slats, iron legs. Toko sits at x=0; the bench runs along x
for i, y in enumerate((0.05, 0.17, 0.29)):
    box('seat', (0, y, 0.46), (3.2, 0.1, 0.05), M['woodL'] if i == 1 else M['wood'], bevel=0.012)
for z in (0.62, 0.78):
    box('back', (0, 0.36, z), (3.2, 0.04, 0.12), M['wood'], bevel=0.012, rot=(math.radians(-12), 0, 0))
for x in (-1.4, 1.4):
    box('legF', (x, 0.05, 0.23), (0.07, 0.07, 0.46), M['metal'], bevel=0.01)
    box('legB', (x, 0.33, 0.45), (0.07, 0.07, 0.9), M['metal'], bevel=0.01)

# thermos on the bench, right
cyl('thermos', (1.05, 0.16, 0.6), 0.07, 0.26, M['thermos'])
cyl('cap', (1.05, 0.16, 0.75), 0.072, 0.05, M['metal'])

# ── Toko, seated, facing the camera (-y)
blob('torso', (0, 0.18, 0.78), (0.24, 0.17, 0.3), M['hood'], lumpy=0.01)
blob('hood', (0, 0.2, 1.17), (0.2, 0.19, 0.2), M['hood'], lumpy=0.012)
for s in (-1, 1):
    blob('thigh', (s * 0.11, -0.05, 0.53), (0.09, 0.24, 0.085), M['hood'], lumpy=0.006)
    blob('shin', (s * 0.12, -0.27, 0.27), (0.075, 0.08, 0.25), M['hood'], lumpy=0.006)
    blob('shoe', (s * 0.12, -0.33, 0.04), (0.08, 0.12, 0.05), M['metal'])
    # arms: shoulder → elbow → hand on the phone
    blob('upper', (s * 0.24, 0.1, 0.83), (0.07, 0.07, 0.17), M['hood'], rot=(math.radians(20), s * math.radians(-12), 0))
    blob('fore', (s * 0.16, -0.06, 0.66), (0.065, 0.16, 0.06), M['hood'], rot=(math.radians(-15), 0, s * math.radians(25)))
# hoodie strings
for s in (-1, 1):
    cyl('string', (s * 0.05, -0.02, 0.92), 0.009, 0.16, M['ink'], verts=16)

# face disc: a magenta clay disc, the master face set into it in white clay
DISC_C = Vector((0, -0.02, 1.17)); DISC_R = 0.155
cyl('disc', (DISC_C.x, DISC_C.y + 0.02, DISC_C.z), DISC_R, 0.04, M['face'], rot=(math.radians(90), 0, 0), verts=96)

src = open(f'{ROOT}/toko/js/master.js').read()
pts = {}
for k in ('eyeL', 'eyeR', 'mouthOuter', 'mouthInner'):
    nums = [float(v) for v in re.search(k + r':\s*\[([^\]]*)\]', src).group(1).split(',')]
    pts[k] = list(zip(nums[0::2], nums[1::2]))
allp = [p for v in pts.values() for p in v]
x0, x1 = min(p[0] for p in allp), max(p[0] for p in allp)
y0, y1 = min(p[1] for p in allp), max(p[1] for p in allp)
cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
k = (DISC_R * 1.36) / max(x1 - x0, y1 - y0)     # ink spans ~68% of the disc
for name, P in pts.items():
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = 0.006; cu.bevel_depth = 0.003; cu.bevel_resolution = 3
    sp = cu.splines.new('POLY'); sp.points.add(len(P) - 1)
    for i, (x, y) in enumerate(P):
        sp.points[i].co = ((x - cx) * k, -(y - cy) * k + 0.004, 0, 1)
    sp.use_cyclic_u = True
    o = bpy.data.objects.new(name, cu); sc.collection.objects.link(o)
    o.location = (DISC_C.x, DISC_C.y - 0.006, DISC_C.z); o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(M['ink'])

# phone, held at chest height, tilted toward him
PH = Vector((0, -0.17, 0.72)); tilt = math.radians(62)
box('phone', PH, (0.1, 0.014, 0.19), M['phone'], bevel=0.008, rot=(tilt, 0, 0))
box('screen', PH + Vector((0, -0.007, 0.003)), (0.088, 0.002, 0.172), SCREEN, bevel=0.003, rot=(tilt, 0, 0))
# paddle hands, NO thumbs: rounded ovals wrapping the phone's lower corners
for s in (-1, 1):
    blob('hand', PH + Vector((s * 0.06, 0.014, -0.06)), (0.048, 0.042, 0.058), M['hand'],
         rot=(tilt, 0, s * math.radians(-18)), lumpy=0.004)

# ── the park: lamp post left, spruces and orange canopies behind
cyl('lamp', (-0.95, 0.9, 1.6), 0.035, 3.2, M['metal'], verts=24)
blob('bulb', (-0.95, 0.9, 3.22), (0.09, 0.09, 0.12), BULB)
bpy.ops.object.light_add(type='POINT', location=(-0.95, 0.75, 3.1)); L = bpy.context.object.data
L.energy = 320; L.color = (1.0, 0.72, 0.42); L.shadow_soft_size = 0.25
random.seed(9)
for x, y, h in ((-1.6, 2.8, 4.2), (0.4, 3.6, 4.8), (1.7, 2.6, 3.6), (-0.4, 5.0, 5.4), (2.6, 4.4, 4.6), (-2.6, 4.0, 5.0)):
    for j in range(4):   # stacked tiers
        cone('spruce', (x, y, 0.9 + j * h * 0.2), h * 0.24 * (1 - j * 0.18), h * 0.36, M['spruce'])
for x, y in ((-0.6, 2.2), (1.2, 2.0), (2.3, 3.0)):
    cyl('birch', (x, y, 1.6), 0.05, 3.2, M['birch'], verts=20)
    for j in range(5):
        blob('canopy', (x + random.uniform(-0.45, 0.45), y + random.uniform(-0.2, 0.3), 3.1 + random.uniform(-0.3, 0.5)),
             (0.38, 0.32, 0.32), M['canopy'], lumpy=0.03)

# ── light: a low warm sun from behind right (rim), the dusk sky, a cool fill, the phone's glow
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(78), 0, math.radians(150)))
sun = bpy.context.object.data; sun.energy = 3.0; sun.color = (1.0, 0.62, 0.38); sun.angle = math.radians(6)
bpy.ops.object.light_add(type='AREA', location=(-1.8, -2.4, 2.2))
fill = bpy.context.object; fill.data.energy = 90; fill.data.size = 2.5; fill.data.color = (0.55, 0.6, 1.0)
fill.rotation_euler = (Vector((0, 0.1, 0.9)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.light_add(type='AREA', location=(PH.x, PH.y - 0.05, PH.z + 0.06))
glow = bpy.context.object; glow.data.energy = 3.0; glow.data.size = 0.08; glow.data.color = (0.55, 0.55, 1.0)
glow.rotation_euler = (Vector((0, 0, 1.17)) - glow.location).to_track_quat('-Z', 'Y').to_euler()

# sky: a dusk gradient on the world, violet above to amber at the horizon
w = bpy.data.worlds.new('dusk'); sc.world = w; w.use_nodes = True
N, Lk = w.node_tree.nodes, w.node_tree.links
bg = N['Background']; bg.inputs['Strength'].default_value = 0.9
tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); Lk.new(tc.outputs['Generated'], sep.inputs[0])
ramp = N.new('ShaderNodeValToRGB'); Lk.new(sep.outputs['Z'], ramp.inputs['Fac'])
ramp.color_ramp.elements[0].position = 0.49; ramp.color_ramp.elements[0].color = hexc('#f2a05a')
ramp.color_ramp.elements[1].position = 0.565; ramp.color_ramp.elements[1].color = hexc('#3a2f8c')
mid = ramp.color_ramp.elements.new(0.515); mid.color = hexc('#b56aa8')
Lk.new(ramp.outputs['Color'], bg.inputs['Color'])

# a painted dusk backdrop behind the park (a flat in a model set, as Aardman would): UV gradient, emissive
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 14, 5), rotation=(math.radians(90), 0, 0))
bd = bpy.context.object; bd.scale = (40, 18, 1)
bm = bpy.data.materials.new('backdrop'); bm.use_nodes = True
BN, BL = bm.node_tree.nodes, bm.node_tree.links
for n in list(BN): BN.remove(n)
out = BN.new('ShaderNodeOutputMaterial'); em = BN.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0
uv = BN.new('ShaderNodeTexCoord'); sp = BN.new('ShaderNodeSeparateXYZ'); BL.new(uv.outputs['UV'], sp.inputs[0])
cr = BN.new('ShaderNodeValToRGB'); BL.new(sp.outputs['Y'], cr.inputs['Fac'])
E = cr.color_ramp.elements
E[0].position = 0.28; E[0].color = hexc('#ffb36a'); E[1].position = 0.62; E[1].color = hexc('#3b2d86')
e2 = E.new(0.38); e2.color = hexc('#e98a7a'); e3 = E.new(0.48); e3.color = hexc('#9a5aa8')
BL.new(cr.outputs['Color'], em.inputs['Color']); BL.new(em.outputs['Emission'], out.inputs['Surface'])
bd.data.materials.append(bm)
bd.visible_shadow = False

# ── camera: the film's dusk wide, Toko low in frame, trees and sky above
bpy.ops.object.camera_add(location=(0.05, -3.7, 0.95))
cam = bpy.context.object; sc.camera = cam
cam.data.lens = 32; cam.data.sensor_fit = 'VERTICAL'
cam.rotation_euler = (Vector((0, 0.4, 1.72)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.dof.use_dof = True; cam.data.dof.focus_object = bpy.data.objects['disc']; cam.data.dof.aperture_fstop = 2.8

# ── render
r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = 1080, 1920; r.resolution_percentage = SCALE
sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
r.filepath = OUT; r.image_settings.file_format = 'PNG'
t = time.time(); bpy.ops.render.render(write_still=True)
print(f'RENDER_SECONDS {time.time() - t:.1f} samples={SAMPLES} scale={SCALE}%')

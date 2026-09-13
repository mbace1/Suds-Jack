"""Powder — Blender side of the pipeline. Blender 3.6+ / 4.x.

Run inside Blender (Scripting workspace > Open > Run Script), or headless:

    blender -b -P pipeline/powder_blender.py -- setup nose
    blender -b your_ship.blend -P pipeline/powder_blender.py -- validate
    blender -b your_ship.blend -P pipeline/powder_blender.py -- export ../models/ship-nose.glb

What it does, and every number is the same one js/models.js checks:

  setup <nose|aft|land>  a fresh scene in metres with the game's frame, the
                         hover-pad markers, the ship envelope as a wire box,
                         the two nozzle empties, the fan discs, and one stub
                         material of each contract name — so the only thing
                         left to do is model.
  validate               the contract: names, envelope, transforms applied,
                         triangle budget, required empties. Prints a report;
                         exits non-zero headless if anything fails.
  export <path.glb>      glTF binary, +Y up, Draco level 7, modifiers applied,
                         textures packed, selected = the SHIP or LAND collection.

Frame: Blender +Z up, NOSE ALONG +Y. The default "+Y Up" export turns that
into the game's +Y up / nose toward -Z. Never set anything else.
"""
import sys

try:
    import bpy
    from mathutils import Vector
except ImportError:  # imported outside Blender (tests, linting)
    bpy = None

# ---------------------------------------------------------------- contract
MATERIALS = ['HULL', 'ACCENT', 'CHROME', 'GUNMETAL', 'GLASS', 'INTAKE', 'DECAL', 'FAN']
LAND_MATERIAL = 'LAND'
COLOUR_ATTR = 'Col'      # the contract's Colour Attribute name (pipeline/README.md)
SHIP = {
    'length': (8.5, 12.5),   # Blender Y extent, probe included
    'width':  (2.2, 4.4),    # X
    'height': (1.0, 3.2),    # Z
    'tris': 9000,
    'empties': ['nozzle_L', 'nozzle_R'],
    'fans': ['fan_L', 'fan_R'],
}
LAND = {'size': (3.0, 80.0), 'tris': 2500}
# the physics: four hover pads, Blender frame (x, y, z), metres
PADS = [(-1.6, 3.0, -0.9), (1.6, 3.0, -0.9), (-1.6, -3.0, -0.9), (1.6, -3.0, -0.9)]
# where the kit puts things, per chassis — a starting point, not a rule
KIT = {
    'nose': {'nozzles': ((-0.85, 1.39, -0.04), (0.85, 1.39, -0.04)),
             'fans':    ((-0.85, 3.69, -0.04), (0.85, 3.69, -0.04)), 'fan_r': 0.27},
    'aft':  {'nozzles': ((-0.96, -3.12, -0.18), (0.96, -3.12, -0.18)),
             'fans':    ((-0.96, -0.38, -0.18), (0.96, -0.38, -0.18)), 'fan_r': 0.31},
}
# viewport colours for the stub materials, from js/palette.js
STUB_COLOUR = {
    'HULL': (0.91, 0.87, 0.78), 'ACCENT': (0.42, 0.21, 0.31), 'CHROME': (0.77, 0.78, 0.82),
    'GUNMETAL': (0.23, 0.23, 0.27), 'GLASS': (0.17, 0.20, 0.25), 'INTAKE': (0.08, 0.08, 0.10),
    'DECAL': (0.91, 0.87, 0.78), 'FAN': (0.05, 0.05, 0.06), 'LAND': (0.36, 0.33, 0.47),
}


def _mat(name):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        c = STUB_COLOUR.get(name, (0.5, 0.5, 0.5))
        m.diffuse_color = (*c, 1.0)
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*c, 1.0)
            if name in ('CHROME', 'GUNMETAL'):
                bsdf.inputs['Metallic'].default_value = 1.0
                bsdf.inputs['Roughness'].default_value = 0.1 if name == 'CHROME' else 0.42
    return m


def _collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def _empty(name, loc, col, size=0.25):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'PLAIN_AXES'
    e.empty_display_size = size
    e.location = loc
    col.objects.link(e)
    return e


# ------------------------------------------------------------------- setup
def setup(kind='nose'):
    """A fresh scene with the frame, the envelope and the named objects."""
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0
    sc.unit_settings.length_unit = 'METERS'

    if kind == 'land':
        col = _collection('LAND')
        _mat(LAND_MATERIAL)
        # a 1 m ground marker at the origin: the landmark's origin sits ON the ground
        bpy.ops.mesh.primitive_plane_add(size=2.0, location=(0, 0, 0))
        g = bpy.context.active_object
        g.name = 'REF_ground'
        g.display_type = 'WIRE'
        g.hide_render = True
        for c in g.users_collection: c.objects.unlink(g)
        col.objects.link(g)
        print('[powder] LAND scene: model with the origin at the ground contact centre, one material LAND, vertex colours in a Colour Attribute named Col.')
        return

    col = _collection('SHIP')
    for n in MATERIALS: _mat(n)
    # the envelope: the kit's size, as a wire box you model inside
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.35))
    box = bpy.context.active_object
    box.name = 'REF_envelope'
    box.scale = (3.6, 11.5, 2.4)      # the limit to model inside, a little over the kit
    box.display_type = 'WIRE'
    box.hide_render = True
    for c in box.users_collection: c.objects.unlink(box)
    col.objects.link(box)
    ref = _collection('REF')
    for i, p in enumerate(PADS):
        _empty('REF_pad_%d' % i, p, ref, 0.4)
    _empty('REF_nose_is_plus_Y', (0, 6.0, 0), ref, 1.0)
    k = KIT[kind]
    for n, p in zip(SHIP['empties'], k['nozzles']):
        _empty(n, p, col)
    # fan discs: face along +Y, object rotation ZERO — the game spins them
    # about their local Y, which is only the nacelle axis if the object is
    # not rotated
    for n, p in zip(SHIP['fans'], k['fans']):
        bpy.ops.mesh.primitive_circle_add(vertices=18, radius=k['fan_r'], fill_type='NGON',
                                          location=p, rotation=(1.5707963, 0, 0))
        f = bpy.context.active_object
        f.name = n
        bpy.ops.object.transform_apply(rotation=True, scale=True)
        f.data.materials.append(_mat('FAN'))
        for c in f.users_collection: c.objects.unlink(f)
        col.objects.link(f)
    print('[powder] SHIP scene (%s): nose along +Y, origin at the centre of mass, pads at x±1.6 y±3.0 z−0.9. Model inside REF_envelope; one object per material; keep nozzle_L/R where the bells end.' % kind)


# ---------------------------------------------------------------- validate
def _evaluated(obj):
    """The mesh as the exporter will see it: modifiers applied. A live bevel
    or array can double a triangle count the source mesh never shows."""
    dg = bpy.context.evaluated_depsgraph_get()
    return obj.evaluated_get(dg)


def _tris(obj):
    me = _evaluated(obj).data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def validate(kind=None):
    """Returns (problems, warnings). Prints both."""
    problems, warnings = [], []
    sc = bpy.context.scene
    if abs(sc.unit_settings.scale_length - 1.0) > 1e-6 or sc.unit_settings.system != 'METRIC':
        problems.append('scene units must be Metric at scale 1.0')
    land = bpy.data.collections.get('LAND') is not None and bpy.data.collections.get('SHIP') is None
    col = bpy.data.collections.get('LAND' if land else 'SHIP')
    if col is None:
        return (['no SHIP (or LAND) collection — run setup first, or put the model in a collection named SHIP'], [])
    meshes = [o for o in col.all_objects if o.type == 'MESH' and not o.name.startswith('REF_')]
    if not meshes:
        problems.append('no meshes in the %s collection' % col.name)
    allowed = [LAND_MATERIAL] if land else MATERIALS
    tris = 0
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        if any(abs(s - 1.0) > 1e-4 for s in o.scale):
            problems.append('%s: scale %s not applied (Ctrl-A > All Transforms)' % (o.name, tuple(round(s, 3) for s in o.scale)))
        if any(abs(r) > 1e-4 for r in o.rotation_euler) and o.name in SHIP['fans']:
            problems.append('%s: fan object rotation must be 0,0,0 (bake it into the mesh) or the game spins it about the wrong axis' % o.name)
        names = [m.name for m in o.data.materials if m]
        if len(names) != 1:
            problems.append('%s: %d materials; exactly one per object' % (o.name, len(names)))
        for n in names:
            if n not in allowed:
                problems.append("%s: material '%s' is not in the contract (%s)" % (o.name, n, ', '.join(allowed)))
        tris += _tris(o)
        ev = _evaluated(o)
        for v in ev.bound_box:
            w = ev.matrix_world @ Vector(v)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
        if land and not o.data.color_attributes:
            warnings.append('%s: no Colour Attribute — it will bake as the material colour, flat' % o.name)
    size = hi - lo
    if land:
        longest = max(size)
        if not (LAND['size'][0] <= longest <= LAND['size'][1]):
            problems.append('landmark is %.1f m across; expected %s-%s' % (longest, *LAND['size']))
        if tris > LAND['tris']:
            problems.append('%d triangles; landmark budget is %d' % (tris, LAND['tris']))
    else:
        def within(v, r): return r[0] <= v <= r[1]
        if not (within(size.y, SHIP['length']) and within(size.x, SHIP['width']) and within(size.z, SHIP['height'])):
            hint = ''
            if size.x > size.y: hint = ' The long axis is X: the nose must point along +Y.'
            if size.z > size.y: hint = ' The long axis is Z: the ship is standing up.'
            problems.append('envelope %.1f x %.1f x %.1f m (w x l x h) is outside %s x %s x %s.%s'
                            % (size.x, size.y, size.z, SHIP['width'], SHIP['length'], SHIP['height'], hint))
        if tris > SHIP['tris']:
            problems.append('%d triangles; ship budget is %d' % (tris, SHIP['tris']))
        for n in SHIP['empties']:
            if bpy.data.objects.get(n) is None:
                problems.append("empty '%s' missing — flames and haze anchor there" % n)
        for n in SHIP['fans']:
            if bpy.data.objects.get(n) is None:
                warnings.append("no '%s' — the turbine face will not spin" % n)
        can = bpy.data.objects.get('canopy')
        if can is not None and can.matrix_world.translation.y < 0:
            problems.append("'canopy' is behind the origin: the ship faces backwards (nose is +Y)")
        objs = len(meshes)
        if objs > 14:
            warnings.append('%d mesh objects — join by material; every object is a draw call' % objs)
    print('[powder] %s: %d tris, %.1f x %.1f x %.1f m' % (col.name, tris, size.x, size.y, size.z))
    for p in problems: print('[powder] FAIL  ' + p)
    for w in warnings: print('[powder] warn  ' + w)
    if not problems: print('[powder] OK')
    return problems, warnings


# ------------------------------------------------------------------ export
def _mark_colour_active(col):
    """Make the contract's `Col` the ACTIVE colour attribute on every mesh.

    A Colour Attribute can exist and still not be the active one — Blender
    leaves `active_color` unset on a mesh built by script — and the exporter's
    ACTIVE mode then writes nothing. Setting it here rather than asking every
    author to remember it keeps the contract to "name it Col".
    """
    for o in col.objects:
        if o.type != 'MESH' or not o.data.color_attributes:
            continue
        names = [a.name for a in o.data.color_attributes]
        want = COLOUR_ATTR if COLOUR_ATTR in names else names[0]
        if want != COLOUR_ATTR:
            print('[powder] note: %s paints with %r, not %r' % (o.name, want, COLOUR_ATTR))
        o.data.color_attributes.active_color_name = want
        o.data.color_attributes.default_color_name = want


def export(path):
    problems, _ = validate()
    if problems:
        print('[powder] not exporting: fix the FAIL lines first')
        return False
    col = bpy.data.collections.get('SHIP') or bpy.data.collections.get('LAND')
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.all_objects:
        if not o.name.startswith('REF_'):
            o.select_set(True)
    kw = dict(
        filepath=path, export_format='GLB', use_selection=True,
        export_yup=True, export_apply=True,
        export_materials='EXPORT', export_image_format='AUTO',
        export_normals=True, export_texcoords=True,
        export_animations=False, export_skins=False, export_morph=False,
        export_extras=False, export_cameras=False, export_lights=False,
    )
    # The exporter's keywords are NOT stable across Blender versions, and an
    # unknown one is a hard TypeError rather than a warning. `export_colors`
    # (3.6) became `export_vertex_color` in 4.x; passing the old name fails on
    # 4.5 AND 5.2 — and because it sat in the base kwargs, the Draco fallback
    # below re-raised the same error instead of catching anything. So: ask the
    # operator what it actually accepts, and say out loud what was dropped.
    # A landmark is nothing BUT its vertex colour, so this flag is the asset.
    props = set(bpy.ops.export_scene.gltf.get_rna_type().properties.keys())
    if 'export_vertex_color' in props:
        # MEASURED on 4.5.13 and 5.2.1, do not "simplify" this to one flag:
        #   MATERIAL + all=True   -> COLOR_0 AND COLOR_1, the same buffer twice
        #   MATERIAL + all=False  -> NO COLOUR AT ALL
        #   ACTIVE   + all=False  -> COLOR_0, once
        # MATERIAL means "colour the material actually reads", and a landmark's
        # material is a plain BSDF that never references the attribute — so the
        # obvious-looking setting exports a SILENTLY FLAT landmark. The colour
        # is the whole asset here, so we mark it active and ask for the active
        # one. `_mark_colour_active` also fails loudly rather than baking flat.
        kw['export_vertex_color'] = 'ACTIVE'
        if 'export_all_vertex_colors' in props:
            kw['export_all_vertex_colors'] = False
        _mark_colour_active(col)
    elif 'export_colors' in props:
        kw['export_colors'] = True
    else:
        print('[powder] WARNING: this Blender has no vertex-colour export flag; '
              'a landmark will bake flat')
    dropped = sorted(k for k in kw if k not in props)
    for k in dropped:
        kw.pop(k)
    if dropped:
        print('[powder] note: this Blender ignores ' + ', '.join(dropped))
    # Draco: present in every Blender that ships the glTF add-on; the flag
    # names have been stable since 2.9
    try:
        bpy.ops.export_scene.gltf(**kw, export_draco_mesh_compression_enable=True,
                                  export_draco_mesh_compression_level=7)
    except TypeError:
        bpy.ops.export_scene.gltf(**kw)
    print('[powder] exported ' + path)
    return True


# ------------------------------------------------------------------- main
if __name__ == '__main__' and bpy is not None:
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    cmd = argv[0] if argv else 'validate'
    if cmd == 'setup':
        setup(argv[1] if len(argv) > 1 else 'nose')
    elif cmd == 'validate':
        p, _ = validate()
        if p and bpy.app.background: sys.exit(1)
    elif cmd == 'export':
        ok = export(argv[1] if len(argv) > 1 else 'ship.glb')
        if not ok and bpy.app.background: sys.exit(1)
    else:
        print(__doc__)

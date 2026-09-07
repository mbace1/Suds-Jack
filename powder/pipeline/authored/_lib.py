"""Shared builders for the authored ships — one copy, imported by each.

Everything is built in world coordinates straight into bmesh, so every
object has identity transforms: the validator rejects an unapplied scale,
and the fans MUST have zero rotation or the game spins them about the wrong
axis. Face orientation is set explicitly, never left to a recalc — an open
can has no inside for a heuristic to find.
"""
import bpy, bmesh, math
from mathutils import Vector


class Part:
    """One material's worth of geometry — one object, one draw call."""

    def __init__(self, obj_name, material):
        self.obj_name, self.material = obj_name, material
        self.bm = bmesh.new()
        self.uv = None

    # -- primitives -----------------------------------------------------------
    def _face(self, verts, want=None, smooth=False):
        try:
            f = self.bm.faces.new(verts)
        except ValueError:
            return None
        f.smooth = smooth
        if want is not None:
            f.normal_update()
            if f.normal.dot(want) < 0:
                f.normal_flip()
        return f

    def loft(self, rings, smooth=True, cap0=False, cap1=False):
        """Rings of equal length, in order; side faces face OUTWARD from the
        ring's own centroid, caps face away from the body."""
        vs = [[self.bm.verts.new(p) for p in r] for r in rings]
        cs = [sum((Vector(p) for p in r), Vector()) / len(r) for r in rings]
        n = len(rings[0])
        for k in range(len(rings) - 1):
            a, b = vs[k], vs[k + 1]
            for i in range(n):
                j = (i + 1) % n
                mid = (Vector(rings[k][i]) + Vector(rings[k + 1][j])) * 0.5
                axis = (cs[k] + cs[k + 1]) * 0.5
                self._face((a[i], a[j], b[j], b[i]), want=mid - axis, smooth=smooth)
        if cap0:
            self._face(vs[0], want=cs[0] - cs[1], smooth=False)
        if cap1:
            self._face(vs[-1], want=cs[-1] - cs[-2], smooth=False)

    def cyl_y(self, cx, cz, y0, y1, r0, r1, n=24, cap0=False, cap1=False, smooth=True):
        """A cylinder / cone along Y — every can, band, collar and bell."""
        def ring(y, r):
            return [(cx + r * math.cos(2 * math.pi * i / n), y,
                     cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
        self.loft([ring(y0, r0), ring(y1, r1)], smooth=smooth, cap0=cap0, cap1=cap1)

    def disc_y(self, cx, cz, y, r, facing, n=24):
        """A flat disc in the XZ plane whose face looks along ±Y."""
        vs = [self.bm.verts.new((cx + r * math.cos(2 * math.pi * i / n), y,
                                 cz + r * math.sin(2 * math.pi * i / n))) for i in range(n)]
        self._face(vs, want=Vector((0, facing, 0)))

    def box(self, centre, size, smooth=False):
        c = Vector(centre)
        sx, sy, sz = (s * 0.5 for s in size)
        vs = [self.bm.verts.new(c + Vector((dx, dy, dz)))
              for dx in (-sx, sx) for dy in (-sy, sy) for dz in (-sz, sz)]
        for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
                  (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            fv = [vs[i] for i in f]
            mid = sum((v.co for v in fv), Vector()) / 4
            self._face(fv, want=mid - c, smooth=smooth)

    def prism_x(self, poly_yz, x0, x1, smooth=False):
        """A flat plate in the YZ plane, extruded along X — the fins."""
        a = [self.bm.verts.new((x0, y, z)) for y, z in poly_yz]
        b = [self.bm.verts.new((x1, y, z)) for y, z in poly_yz]
        self._face(a, want=Vector((-1, 0, 0)))
        self._face(b, want=Vector((1, 0, 0)))
        cy = sum(y for y, _ in poly_yz) / len(poly_yz)
        cz = sum(z for _, z in poly_yz) / len(poly_yz)
        for i in range(len(poly_yz)):
            j = (i + 1) % len(poly_yz)
            mid = (a[i].co + b[j].co) * 0.5
            self._face((a[i], a[j], b[j], b[i]), want=mid - Vector(((x0 + x1) / 2, cy, cz)))

    def slab(self, planform, z_mid, thick):
        """A wing: one polygon extruded up and down by thick(x, y)."""
        top = [self.bm.verts.new((x, y, z_mid + thick(x, y))) for x, y in planform]
        bot = [self.bm.verts.new((x, y, z_mid - thick(x, y))) for x, y in planform]
        self._face(top, want=Vector((0, 0, 1)))
        self._face(bot, want=Vector((0, 0, -1)))
        cx = sum(x for x, _ in planform) / len(planform)
        cy = sum(y for _, y in planform) / len(planform)
        for i in range(len(planform)):
            j = (i + 1) % len(planform)
            mid = (top[i].co + bot[j].co) * 0.5
            self._face((top[i], top[j], bot[j], bot[i]), want=Vector((mid.x - cx, mid.y - cy, 0)))

    def tube(self, pts, r, n=8, per_seg=4):
        """A round pipe along a smoothed polyline — the plumbing. Catmull-Rom
        through the waypoints; a frame from the tangent and a fixed reference,
        which twists a little at a bend and is invisible at r = 0.075."""
        P = [Vector(p) for p in pts]
        P = [P[0]] + P + [P[-1]]
        samples = []
        for k in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[k - 1], P[k], P[k + 1], P[k + 2]
            for s in range(per_seg):
                t = s / per_seg
                samples.append(0.5 * ((2 * p1) + (-p0 + p2) * t
                                      + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                                      + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
        samples.append(P[-2])
        rings = []
        for i, c in enumerate(samples):
            t = (samples[min(i + 1, len(samples) - 1)] - samples[max(i - 1, 0)]).normalized()
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            u = t.cross(ref).normalized() * r
            v = t.cross(u).normalized() * r
            rings.append([c + u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)
                          for k in range(n)])
        self.loft(rings, smooth=True, cap0=True, cap1=True)

    def ellipsoid(self, centre, scale, useg=18, vseg=10):
        r = bmesh.ops.create_uvsphere(self.bm, u_segments=useg, v_segments=vseg, radius=1.0)
        c, s = Vector(centre), Vector(scale)
        for v in r['verts']:
            v.co = c + Vector((v.co.x * s.x, v.co.y * s.y, v.co.z * s.z))
        for f in self.bm.faces:
            f.smooth = True

    def quad_uv(self, corners, uvs, want):
        """A single textured quad — the roundels."""
        if self.uv is None:
            self.uv = self.bm.loops.layers.uv.new('UVMap')
        vs = [self.bm.verts.new(c) for c in corners]
        f = self._face(vs, want=want)
        for loop in f.loops:
            loop[self.uv].uv = uvs[vs.index(loop.vert)]

    # -- finish -------------------------------------------------------------
    def realise(self, col):
        if not self.bm.faces:
            return None
        me = bpy.data.meshes.new(self.obj_name)
        self.bm.to_mesh(me)
        self.bm.free()
        ob = bpy.data.objects.new(self.obj_name, me)
        me.materials.append(self.material)
        col.objects.link(ob)
        return ob


def hull_uvs(me):
    """A box projection normalised to the hull's bounds, so the game's panel
    texture (or a painted one later) lands in 0..1 rather than smearing off
    one edge. Seams run along the hull, where panel lines would."""
    uv = me.uv_layers.new(name='UVMap')
    lo = Vector((min(v.co.x for v in me.vertices), min(v.co.y for v in me.vertices), min(v.co.z for v in me.vertices)))
    hi = Vector((max(v.co.x for v in me.vertices), max(v.co.y for v in me.vertices), max(v.co.z for v in me.vertices)))
    span = hi - lo
    for pol in me.polygons:
        n = pol.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        u_i, v_i = {0: (1, 2), 1: (0, 2), 2: (0, 1)}[ax]
        for li in pol.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = ((co[u_i] - lo[u_i]) / max(span[u_i], 1e-6),
                              (co[v_i] - lo[v_i]) / max(span[v_i], 1e-6))


def section_ring(y, w, h, zc, n=24):
    """An ellipse squashed underneath: a sled has a flat-ish belly."""
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        x, z = w * math.cos(a), h * math.sin(a)
        if z < 0:
            z *= 0.65
        out.append((x, y, zc + z))
    return out


def fresh_scene(collection, materials, stub_colour):
    """An empty metric scene, the SHIP collection, and the eight stub materials."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'
    sc.unit_settings.scale_length = 1.0
    col = bpy.data.collections.new(collection)
    sc.collection.children.link(col)
    mats = {}
    for n in materials:
        m = bpy.data.materials.new(n)
        m.use_nodes = True
        c = stub_colour[n]
        m.diffuse_color = (*c, 1.0)
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf:
            bsdf.inputs['Base Color'].default_value = (*c, 1.0)
        mats[n] = m
    return col, mats


def empty_at(col, name, loc):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = 'PLAIN_AXES'
    e.empty_display_size = 0.3
    e.location = loc
    col.objects.link(e)
    return e


def report(tag, objs, pads):
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    size = hi - lo
    print('[%s] %d objects, %d triangles, %.1f wide x %.1f long x %.1f high (m)'
          % (tag, len(objs), tris, size.x, size.y, size.z))
    for i, (px, py, pz) in enumerate(pads):
        print('[%s] pad %d at (%.1f, %.1f, %.1f): runner over it' % (tag, i, px, py, pz))

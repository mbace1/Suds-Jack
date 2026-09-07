"""Render a picture of a pipeline .glb — because a validator cannot see LOOKS.

    blender -b -P pipeline/shot.py -- ../models/land-derrick-01.glb shot.png

It renders THE EXPORTED FILE, not the scene that made it, so what you are
looking at has been through the exporter, Draco and the importer — the same
road the game's loader travels. A landmark that lost its vertex colours on the
way out looks flat here and correct in the authoring scene, which is exactly
the failure this is for.

Workbench in VERTEX colour mode, deliberately: it shows the COLOR_0 buffer
itself rather than whatever material the importer happened to build, so the
picture answers "did the colour survive" and not "is my node tree nice".
A 1.8 m human box stands beside the model, because the only thing a landmark
must get right is how big it reads from far away.
"""
import bpy, sys, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = ARGS[0] if ARGS else '../models/land-derrick-01.glb'
OUT = ARGS[1] if len(ARGS) > 1 else 'shot.png'
RES = (900, 1200)          # portrait, ~1000px wide: it is read on a phone


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        print('[shot] nothing imported from %s' % SRC); return

    # --- 1.8 m of person, for scale -------------------------------------
    lo = min(min((o.matrix_world @ Vector(c)).z for c in o.bound_box) for o in meshes)
    xs = [ (o.matrix_world @ Vector(c)).x for o in meshes for c in o.bound_box ]
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(max(xs) + 1.6, 0, lo + 0.9))
    man = bpy.context.object
    man.scale = (0.25, 0.18, 0.9)          # 0.5 x 0.36 x 1.8 m
    man.name = 'SCALE_1m8'
    # Set it clear of the near leg: standing among the bracing it reads as a
    # bright chip of the model rather than as a person-sized reference.
    man.location.y -= 2.4

    # --- frame everything from three-quarters ----------------------------
    pts = [o.matrix_world @ Vector(c) for o in bpy.context.scene.objects
           if o.type == 'MESH' for c in o.bound_box]
    centre = sum(pts, Vector()) / len(pts)
    radius = max((p - centre).length for p in pts)

    cam_d = bpy.data.cameras.new('shot')
    cam = bpy.data.objects.new('shot', cam_d)
    bpy.context.scene.collection.objects.link(cam)
    # 35 degrees round and 14 up: enough to read the depth of the frame
    # without looking down on it, which shortens anything tall.
    yaw, pitch = math.radians(35.0), math.radians(14.0)
    eye = Vector((math.sin(yaw) * math.cos(pitch),
                  -math.cos(yaw) * math.cos(pitch),
                  math.sin(pitch)))
    bpy.context.scene.camera = cam
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = RES

    # Fitting the bounding SPHERE wastes most of the frame on anything tall
    # and thin — a derrick is 22 m of tower in an 8 m footprint, and the first
    # render put it in the middle third of a portrait page. So place the camera,
    # ask where the corners actually land, and pull in until the widest one sits
    # on the margin. Two passes converge; the third is free insurance.
    dist = radius / math.tan(cam_d.angle * 0.5) * 1.30
    for _ in range(3):
        cam.location = centre + eye * dist
        cam.rotation_euler = (centre - cam.location).normalized()                                  .to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(bpy.context.scene, cam, p) for p in pts]
        # Recentre on what the camera SEES, not on the world-space centroid:
        # under perspective the top of a 22 m tower is much further away than
        # its feet, so a centroid-aimed camera leaves a third of a portrait
        # frame as empty ground.
        cx = (min(c.x for c in uv) + max(c.x for c in uv)) * 0.5
        cy = (min(c.y for c in uv) + max(c.y for c in uv)) * 0.5
        span = 2.0 * dist * math.tan(cam_d.angle * 0.5)
        right = cam.matrix_world.to_quaternion() @ Vector((1, 0, 0))
        up = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
        centre += right * ((cx - 0.5) * span) + up * ((cy - 0.5) * span * RES[1] / RES[0])
        over = max(max(abs(c.x - cx), abs(c.y - cy)) for c in uv)
        dist *= over / 0.46 if over > 1e-6 else 1.0
    cam.location = centre + eye * dist
    cam.rotation_euler = (centre - cam.location).normalized()                              .to_track_quat('-Z', 'Y').to_euler()

    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'VERTEX'        # the point of the whole exercise
    sh.show_shadows = True
    sh.show_cavity = True
    sc.render.film_transparent = False
    # A ground plane at z = 0, because the contract's hardest claim is that the
    # FEET sit on it — floating by a metre is invisible without something to
    # float above.
    bpy.ops.mesh.primitive_plane_add(size=max(60.0, radius * 6), location=(0, 0, 0))
    bpy.context.object.name = 'GROUND'
    sc.world = bpy.data.worlds.new('w')
    sc.world.color = (0.05, 0.05, 0.07)
    # STANDARD, not the default filmic/AgX: this picture is a data check on the
    # COLOR_0 buffer, and a view transform that flatters a render also darkens
    # the very values we are here to read. The first render came back near-black
    # steel and looked like a colour bug rather than a tonemap.
    try:
        sc.view_settings.view_transform = 'Standard'
    except TypeError:
        pass
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = OUT
    bpy.ops.render.render(write_still=True)
    print('[shot] %s -> %s (%dx%d)' % (SRC, OUT, *RES))


if __name__ == '__main__':
    main()

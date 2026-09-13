import bpy, pathlib
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'art-source' / 'warehouse.blend'
OUTPUT = ROOT.parents[2] / 'outputs' / 'concrete-art' / 'warehouse-props.png'

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUTPUT)
scene.render.film_transparent = False
scene.world.color = (0.018, 0.024, 0.029)

def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add(location=(-15.5, 4.6, 12.5))
camera = bpy.context.object
camera.data.lens = 38
look_at(camera, (-26.0, 1.2, 0.0))
scene.camera = camera

bpy.ops.object.light_add(type='AREA', location=(-18.0, 7.5, 7.0))
key = bpy.context.object
key.data.energy = 1500
key.data.shape = 'RECTANGLE'
key.data.size = 8
key.data.color = (0.78, 0.9, 1.0)
look_at(key, (-26.0, 1.0, 0.0))

bpy.ops.object.light_add(type='AREA', location=(-27.0, 4.5, -7.0))
fill = bpy.context.object
fill.data.energy = 900
fill.data.size = 5
fill.data.color = (1.0, 0.55, 0.28)
look_at(fill, (-25.0, 1.0, 0.0))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
print(f'Rendered {OUTPUT}')

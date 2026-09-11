import bpy, json, os
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
out=os.path.dirname(os.path.abspath(__file__))
parts=[]
def part(name,location,scale,shape='box',rotation=(0,0,0)):
    if shape=='sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=location)
    else: bpy.ops.mesh.primitive_cube_add(size=2,location=location)
    o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler=rotation
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if shape=='box':
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=.035;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    # Convert Blender Z-up to runtime Y-up. Keep mesh origins for articulation.
    o.data.calc_loop_triangles()
    verts=[]; normals=[]
    for tri in o.data.loop_triangles:
        for i in tri.vertices:
            v=o.data.vertices[i];verts.extend([v.co.x,v.co.z,-v.co.y]);normals.extend([v.normal.x,v.normal.z,-v.normal.y])
    parts.append(dict(name=name,position=[location[0],location[2],-location[1]],vertices=verts,normals=normals))
# A full articulated human silhouette; replaceable anonymous training cast.
part('leftBoot',(-.15,-.07,.055),(.075,.14,.053),'sphere')
part('rightBoot',(.14,.03,.055),(.075,.14,.053),'sphere')
part('leftLeg',(-.14,-.01,.24),(.072,.080,.20),'sphere',(-.12,-.05,0))
part('rightLeg',(.14,.07,.24),(.072,.080,.20),'sphere',(.10,.08,0))
part('leftThigh',(-.115,0,.52),(.083,.09,.20),'sphere',(0,-.14,0))
part('rightThigh',(.115,.06,.52),(.083,.09,.20),'sphere',(.1,.15,0))
part('hips',(0,.025,.69),(.17,.11,.10),'sphere')
part('jacket',(0,.015,.92),(.18,.12,.23),'sphere',(.08,0,0))
part('vest',(0,-.091,.96),(.14,.035,.15))
part('head',(0,-.018,1.235),(.105,.095,.13),'sphere')
part('helmet',(0,-.008,1.315),(.13,.12,.075),'sphere')
part('visor',(0,-.11,1.25),(.09,.025,.03))
part('leftArm',(-.204,-.005,1.025),(.073,.075,.145),'sphere',(.22,-.2,0))
part('rightArm',(.204,-.015,1.025),(.073,.075,.145),'sphere',(.4,.18,0))
part('leftForearm',(-.15,-.16,.955),(.063,.14,.063),'sphere',(0,0,-.7))
part('rightForearm',(.15,-.155,.94),(.063,.12,.060),'sphere',(0,0,.6))
part('leftHand',(-.085,-.24,.965),(.044,.055,.045),'sphere')
part('rightHand',(.085,-.24,.945),(.044,.055,.045),'sphere')
part('weapon',(.015,-.27,.965),(.04,.24,.034),'box',(0,0,-.42))
part('barrel',(-.11,-.49,.965),(.018,.12,.018),'box',(0,0,-.42))
part('magazine',(.025,-.3,.915),(.024,.05,.065),'box',(0,0,-.42))
part('pack',(0,.14,.99),(.13,.065,.155))
part('belt',(0,.015,.71),(.167,.112,.019))
part('pouchL',(-.095,-.135,.945),(.041,.025,.058))
part('pouchR',(.035,-.135,.945),(.041,.025,.058))
part('collar',(0,.0,1.125),(.10,.09,.033),'sphere')
part('leftKnee',(-.14,-.078,.35),(.066,.022,.065),'sphere')
part('rightKnee',(.14,-.005,.35),(.066,.022,.065),'sphere')
for p in parts:
    p['vertices']=[round(v,5) for v in p['vertices']]
    p['normals']=[round(v,4) for v in p['normals']]
with open(os.path.join(out,'assets','training-figure.json'),'w') as f:json.dump(parts,f,separators=(',',':'))
os.makedirs(os.path.join(out,'.dream-loop'),exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'.dream-loop','training-figure.blend'))
print('Exported training figure',len(parts),'parts')

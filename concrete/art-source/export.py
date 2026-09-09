import bpy, math, pathlib, json, random
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]; MODELS=ROOT/'assets/models'; TEX=ROOT/'assets/textures'; SRC=ROOT/'art-source'
random.seed(31)
def V(p):return Vector((p[0],-p[2],p[1]))
def clean():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.65,metal=0,texture=None,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 if texture:
  for suffix,slot in [('base','Base Color'),('rough','Roughness'),('normal','Normal')]:
   t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(TEX/f'{texture}-{suffix}.png'),check_existing=True)
   if suffix!='base':t.image.colorspace_settings.name='Non-Color'
   if suffix=='normal':b=n.new('ShaderNodeNormalMap');b.inputs['Strength'].default_value=.35;m.node_tree.links.new(t.outputs['Color'],b.inputs['Color']);m.node_tree.links.new(b.outputs['Normal'],p.inputs[slot])
   else:m.node_tree.links.new(t.outputs['Color'],p.inputs[slot])
 return m
def assign(o,m):o.data.materials.append(m);return o
def bevel(o,w=.03,segments=2):
 b=o.modifiers.new('Soft manufactured edges','BEVEL');b.width=w;b.segments=segments;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 for p in o.data.polygons:p.use_smooth=True
 n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
 return o
def box(name,size,pos,m,edge=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(pos));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);assign(o,m)
 if edge:bevel(o,min(edge,min(size)*.3))
 return o
def ell(name,size,pos,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=V(pos));o=bpy.context.object;o.name=name;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);assign(o,m)
 for p in o.data.polygons:p.use_smooth=True
 return o
def rod(name,a,b,r,m,vertices=12):
 av,bv=V(a),V(b);delta=bv-av;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=delta.length,location=(av+bv)/2);o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=delta.to_track_quat('Z','Y');assign(o,m);return bevel(o,min(.012,r*.2))
def mesh(name,verts,faces,m):
 d=bpy.data.meshes.new(name);d.from_pydata([V(v)for v in verts],[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);assign(o,m);return o
def text(name,string,pos,size,m,rot=0):
 cu=bpy.data.curves.new(name,'FONT');cu.body=string;cu.size=size;cu.extrude=.002;cu.align_x='CENTER';o=bpy.data.objects.new(name,cu);bpy.context.collection.objects.link(o);o.location=V(pos);o.rotation_euler=(math.pi/2,0,rot);assign(o,m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def uv_world(o):
 if o.type!='MESH':return
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
 for poly in o.data.polygons:
  normal=poly.normal;axis=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3)if i!=axis]
  for li in poly.loop_indices:
   co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]/3,co[axes[1]]/3)
def join_by_material():
 groups={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and not o.find_armature():groups.setdefault(o.data.materials[0].name,[]).append(o)
 for name,items in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name=name+'_batch'
def export(name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in bpy.context.scene.objects:
  if o.type in ['MESH','ARMATURE']:o.select_set(True)
 args=dict(filepath=str(MODELS/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_yup=True)
 props=bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
 if 'export_animation_mode'in props:args['export_animation_mode']='ACTIONS'
 bpy.ops.export_scene.gltf(**args)
def mobile(name,ratio=.45):
 for o in bpy.context.scene.objects:
  if o.type=='MESH'and len(o.data.polygons)>40:
   mod=o.modifiers.new('Mobile mesh','DECIMATE');mod.ratio=ratio;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for img in bpy.data.images:
  if img.source=='FILE' and img.filepath.endswith('.png'):
   p=pathlib.Path(bpy.path.abspath(img.filepath));mp=p.with_name(p.stem+'-mobile.png')
   if mp.exists():img.filepath=str(mp);img.reload()
 export(name+'-mobile')
def save(name):
 for img in bpy.data.images:
  if img.source=='FILE':img.pack()
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')))
clean()
# Shared materials. Original textures are layered procedural sources in textures.py.
concrete=material('Concrete',(0.48,.5,.5),texture='concrete');wood=material('Plywood',(.55,.38,.22),texture='plywood');paint=material('Painted steel',(.12,.24,.22),texture='painted-steel');metal=material('Bare metal',(.4,.44,.45),.35,.8,texture='metal');dark=material('Charcoal',(.045,.055,.064));cream=material('Cream',(.78,.77,.64));lime=material('Line lime',(.66,.79,.16));glass=material('Window glow',(.48,.64,.72),emission=.45);orange=material('Safety orange',(.72,.2,.055));brick=material('Brick',(.23,.22,.19))
box('Slab',(58,.3,76),(0,-.2,0),concrete)
for x in [-29,29]:
 for z in range(-32,37,12):
  box('Wall bay',(.4,7.3,12),(x,3.55,z),concrete)
  box('Window sill',(.7,.25,9),(x,7.2,z),paint)
  box('Upper wall',(.4,2.3,12),(x,11.8,z),paint)
  box('Clerestory',(.08,3,9),(x,8.95,z),glass,0)
  for dz in [-4.5,-3,-1.5,0,1.5,3,4.5]:box('Window mullion',(.17,3.2,.06),(x,8.95,z+dz),paint)
  box('Window transom',(.17,.07,9),(x,8.9,z),paint)
  for dz in [-5.5,5.5]:box('I beam web',(.25,12.8,.36),(x,6.4,z+dz),paint);box('I beam flange',(.65,12.8,.1),(x,6.4,z+dz-.18),paint);box('Foot plate',(1,.15,1),(x,.08,z+dz),metal)
for z in [-38,38]:box('End wall',(58,13,.4),(0,6.3,z),concrete)
for z in range(-32,38,12):
 box('Cross girder',(57,.34,.28),(0,11.8,z),paint)
 for x in range(-28,28,7):rod('Truss diagonal',(x,11.8,z),(x+3.5,13,z),.06,metal);rod('Truss diagonal',(x+3.5,13,z),(x+7,11.8,z),.06,metal)
 for x in [-14,14]:box('Light fixture',(2.8,.14,.55),(x,11.1,z),paint);box('Diffuser',(2.6,.04,.42),(x,11,z),glass);rod('Hanger',(x,11.2,z),(x,12.3,z),.025,metal)
# Subtle panel seams and service-door construction.
for z in range(-36,38,6):box('Slab joint',(57,.009,.025),(0,-.025,z),dark,0)
for x in range(-24,29,6):box('Slab joint',(.025,.009,75),(x,-.025,0),dark,0)
box('Rolling door frame',(10,7,.3),(18,3.5,-37.7),paint)
for y in range(14):box('Rolling door slat',(9.2,.43,.12),(18,.28+y*.46,-37.48),metal)
text('Warehouse logotype','CONCRETE',(0,7.5,-37.65),2.65,cream)
text('Warehouse number','WAREHOUSE / 01',(0,6.2,-37.6),.5,lime)
# Parabolic ride surfaces match ground() in the game.
def quarter(name,x,z,w,direction):
 verts=[]
 for i in range(49):
  t=i/48
  for sx in [-w/2,w/2]:verts.append((x+sx,3.6*t*t,z+direction*t*6))
 faces=[(i*2,i*2+1,i*2+3,i*2+2)for i in range(48)];o=mesh(name,verts,faces,wood)
 for p in o.data.polygons:p.use_smooth=True
 box('Back of quarter',(w,3.6,.16),(x,1.8,z+direction*6),wood)
 rod('Coping',(x-w/2,3.62,z+direction*6),(x+w/2,3.62,z+direction*6),.055,metal)
 for sx in [-w/2,w/2]:mesh('Quarter side',[(x+sx,0,z),(x+sx,0,z+direction*6)]+[(x+sx,3.6*(i/48)**2,z+direction*i/48*6)for i in range(48,-1,-1)],[tuple(range(51))],paint)
 for sx in range(int(-w/2)+2,int(w/2),4):
  for i in range(1,9):
   t=i/9;ell('Screw',(.013,.009,.013),(x+sx,3.6*t*t+.006,z+direction*t*6),metal)
quarter('North quarter',0,-29,32,-1);quarter('South quarter',-16,28,20,1);quarter('East quarter',22,22,10,1)
verts=[(-4.5,0,-3),(4.5,0,-3),(-4.5,1.5,1),(4.5,1.5,1),(-4.5,1.5,5),(4.5,1.5,5),(-4.5,0,9),(4.5,0,9)]
mesh('Funbox surface',verts,[(0,1,3,2),(2,3,5,4),(4,5,7,6)],wood)
for side in [-1,1]:mesh('Funbox side',[(side*4.5,0,-3),(side*4.5,1.5,1),(side*4.5,1.5,5),(side*4.5,0,9)],[(0,1,2,3)],paint)
for x,z,l,y in [(10,-4,20,1),(-10,-8,16,.85),(0,3,4,2.3)]:
 rod('Grind rail',(x,y,z-l/2),(x,y,z+l/2),.075,metal)
 box('Rail highlight',(.03,.01,l),(x,y+.075,z),lime,0)
 for zz in [z-l/2+.5,z+l/2-.5]:rod('Rail post',(x,0,zz),(x,y,zz),.055,paint);box('Rail plate',(.4,.07,.4),(x,.035,zz),metal)
# Props deliberately sit outside all authored riding surfaces.
for x,z in [(24,-26),(24,-22),(-25,-23),(-25,17)]:
 for zz in [-.7,0,.7]:box('Pallet runner',(1.8,.14,.14),(x,.1,z+zz),wood)
 for xx in [-.8,-.4,0,.4,.8]:box('Pallet slat',(.25,.09,1.8),(x+xx,.21,z),wood)
 box('Shipping crate',(1.5,1.5,1.5),(x,1,z),wood)
 for xx in [-.69,.69]:box('Crate strap',(.09,1.6,1.6),(x+xx,1,z),metal)
for x,z in [(-25,-30),(25,18)]:
 box('Electrical cabinet',(1.2,1.8,.45),(x,1.2,z),paint);box('Cabinet warning',(.35,.35,.02),(x,1.5,z+.24),lime)
for z in [-27,-24]:
 box('Cone base',(.6,.08,.6),(-23,.04,z),dark);bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.22,radius2=.06,depth=.65,location=V((-23,.4,z)));assign(bpy.context.object,orange)
for x,z in [(25,12),(-25,23)]:
 rod('Cable reel spindle',(x-.65,.65,z),(x+.65,.65,z),.35,dark)
 for xx in [x-.65,x+.65]:rod('Cable reel disk',(xx-.035,.65,z),(xx+.035,.65,z),.65,wood)
# A lived-in gear corner: all pieces remain behind the perimeter safety stripe.
for x,z in [(-25.8,-16),(-25.8,-13.5),(-25.8,-11)]:
 box('Gear locker',(1.25,2.35,.72),(x,1.18,z),paint)
 box('Locker door',(1.08,2.12,.035),(x+.66,1.2,z),metal,.01)
 box('Locker handle',(.035,.28,.08),(x+.71,1.2,z+.34),lime,.008)
 for y in [1.62,1.75,1.88]:box('Locker vent',(.03,.035,.55),(x+.72,y,z),dark,0)
for z in [-7.5,7.5]:
 box('Bench seat',(1.15,.14,3.8),(-25.4,.62,z),wood,.035)
 box('Bench lower shelf',(.9,.1,3.55),(-25.4,.22,z),metal,.02)
 for zz in [z-1.55,z+1.55]:
  rod('Bench leg',(-25.4,.08,zz),(-25.4,.62,zz),.055,paint)
  box('Bench foot',(.7,.06,.28),(-25.4,.03,zz),metal,.015)
# Wall-mounted deck rack with complete spare boards, trucks and wheels.
for z in [-4,-1.35,1.35,4]:
 box('Rack rail',(.18,.1,1.75),(-27.9,2.2,z),paint,.02)
 for dz in [-.68,.68]:rod('Rack hook',(-27.72,2.2,z+dz),(-27.18,2.2,z+dz),.035,metal)
 box('Spare deck',(.12,.26,1.55),(-27.08,2.23,z),wood,.08)
 box('Spare grip',(.02,.265,1.35),(-27,2.23,z),dark,.01)
 for dz in [-.48,.48]:
  rod('Spare truck',(-27.16,2.08,z+dz),(-26.92,2.08,z+dz),.035,metal)
  for yy in [2.01,2.15]:ell('Spare wheel',(.055,.055,.085),(-26.87,yy,z+dz),lime)
# Waste and recycling bins add useful scale without entering the play space.
for z,color in [(27,orange),(29.1,lime),(31.2,paint)]:
 box('Utility bin',(1.15,1.28,1.35),(25.8,.66,z),color,.11)
 box('Bin lid',(1.25,.13,1.45),(25.8,1.33,z),dark,.05)
 rod('Bin hinge',(25.3,1.32,z),(26.3,1.32,z),.035,metal)
 for zz in [z-.43,z+.43]:ell('Bin wheel',(.13,.13,.08),(25.25,.18,zz),dark)
rod('Wall vent',(-27.8,5,-26),(-27.8,5,24),.35,metal)
for z in [-24,-12,0,12,24]:rod('Vent band',(-27.8,5,z-.04),(-27.8,5,z+.04),.38,paint)
for x in [-23,23]:
 for z in range(-18,19,3):box('Faded safety stripe',(.24,.007,1),(x,-.02,z),lime,0)
for o in bpy.context.scene.objects:uv_world(o)
save('warehouse');join_by_material();export('warehouse');mobile('warehouse',.38)
# Character: fitted articulated clothing, modeled facial silhouette and distinct board.
clean();skin=material('Skin',(.46,.265,.16),.8);jacket=material('Jacket teal',(.095,.24,.22),.8);accent=material('Jacket rust',(.72,.29,.105),.82);pants=material('Trouser charcoal',(.07,.085,.11),.92);sole=material('Sole ivory',(.82,.80,.68),.8);black=material('Grip rubber',(.035,.04,.046),texture='rubber');silver=material('Truck alloy',(.48,.52,.56),.3,.85);deckmat=material('Deck wood',(.62,.44,.21));limemat=material('Deck graphic',(.66,.8,.15));hair=material('Hair',(.035,.025,.02));white=material('Eyes',(.82,.75,.65))
# Skeleton in meters, keeping ankles fixed during coast.
bones={'root':((0,.18,0),(0,.28,0),None),'hips':((0,.86,0),(0,1.02,0),'root'),'spine':((0,1.02,0),(0,1.36,0),'hips'),'neck':((0,1.36,0),(0,1.47,0),'spine'),'head':((0,1.47,0),(0,1.7,0),'neck'),'upper_arm_l':((-.22,1.31,0),(-.39,1.08,.04),'spine'),'forearm_l':((-.39,1.08,.04),(-.43,.87,.14),'upper_arm_l'),'hand_l':((-.43,.87,.14),(-.43,.79,.17),'forearm_l'),'upper_arm_r':((.22,1.31,0),(.39,1.08,-.04),'spine'),'forearm_r':((.39,1.08,-.04),(.43,.87,.04),'upper_arm_r'),'hand_r':((.43,.87,.04),(.43,.79,.08),'forearm_r'),'thigh_l':((-.11,.87,.05),(-.14,.56,.18),'hips'),'shin_l':((-.14,.56,.18),(-.14,.28,.3),'thigh_l'),'foot_l':((-.14,.28,.3),(-.14,.22,.39),'shin_l'),'thigh_r':((.11,.87,-.05),(.14,.56,-.18),'hips'),'shin_r':((.14,.56,-.18),(.14,.28,-.3),'thigh_r'),'foot_r':((.14,.28,-.3),(.14,.22,-.21),'shin_r')}
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='SkaterRig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,(a,b,parent)in bones.items():
 eb=rig.data.edit_bones.new(name);eb.head=V(a);eb.tail=V(b)
 if parent:eb.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
parts=[]
def bind(o,bone):
 g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o);return o
def cb(name,size,pos,m,bone,edge=.025):return bind(box(name,size,pos,m,edge),bone)
def ce(name,size,pos,m,bone):return bind(ell(name,size,pos,m),bone)
cb('Jacket torso',(.48,.43,.32),(0,1.15,0),jacket,'spine',.10);ce('Jacket shoulder',(.27,.14,.17),(0,1.32,0),jacket,'spine');cb('Rust hem',(.47,.065,.32),(0,.94,0),accent,'hips');cb('Zipper',(.017,.36,.017),(0,1.15,.169),silver,'spine',.002)
for x in [-.13,.13]:cb('Welt pocket',(.115,.025,.017),(x,1.035,.172),accent,'spine',.004)
cb('Collar',(.19,.09,.16),(0,1.39,0),accent,'neck',.025);ce('Neck',(.065,.08,.065),(0,1.435,0),skin,'neck');ce('Head',(.135,.175,.125),(0,1.59,.01),skin,'head');ce('Jaw',(.105,.085,.105),(0,1.50,.035),skin,'head');ce('Nose',(.025,.04,.033),(0,1.595,.136),skin,'head')
for x in [-.137,.137]:ce('Ear',(.023,.043,.023),(x,1.585,.01),skin,'head')
for x in [-.045,.045]:ce('Eye',(.027,.013,.011),(x,1.627,.12),white,'head');ce('Pupil',(.009,.011,.005),(x,1.626,.13),hair,'head');cb('Eyebrow',(.053,.009,.014),(x,1.649,.118),hair,'head',.003)
cb('Mouth',(.043,.008,.006),(0,1.52,.13),hair,'head',.002);ce('Cap crown',(.146,.075,.135),(0,1.725,.002),pants,'head');cb('Cap brim',(.23,.015,.19),(0,1.695,.132),jacket,'head',.014);cb('Cap patch',(.06,.025,.007),(0,1.725,.125),accent,'head',.005)
for side in ['l','r']:
 for part,radius,mat in [('upper_arm',.10,jacket),('forearm',.085,jacket),('thigh',.12,pants),('shin',.10,pants)]:
  bn=part+'_'+side;a,b,_=bones[bn];bind(rod(part,a,b,radius,mat,16),bn)
 for part in ['hand']:
  bn=part+'_'+side;a,b,_=bones[bn];ce('Hand',(.042,.065,.036),tuple((a[i]+b[i])/2 for i in range(3)),skin,bn)
 x=-.14 if side=='l'else .14;z=.3 if side=='l'else -.3
 cb('Shoe sole',(.22,.05,.34),(x,.185,z+.025),sole,'foot_'+side,.02);cb('Shoe upper',(.20,.11,.30),(x,.245,z+.025),jacket,'foot_'+side,.045);cb('Shoe toe',(.19,.065,.115),(x,.225,z+.135),sole,'foot_'+side,.025)
 for dz in [-.015,.025,.065]:cb('Shoelace',(.115,.008,.012),(x,.302,z+dz),sole,'foot_'+side,.002)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();char=parts[0];char.name='Skater';mod=char.modifiers.new('Skater skin','ARMATURE');mod.object=rig;char.parent=rig
# Named, in-place pose clips. Gameplay owns world position and board rotation.
poses={'idle':{},'coast':{'upper_arm_l':(.03,0,-.08),'upper_arm_r':(-.03,0,.08)},'push':{'thigh_r':(.55,0,0),'shin_r':(-.40,0,0),'upper_arm_l':(.15,0,-.2)},'crouch':{'hips':(.08,0,0),'spine':(.14,0,0),'thigh_l':(.35,0,0),'thigh_r':(.35,0,0),'shin_l':(-.55,0,0),'shin_r':(-.55,0,0)},'ollie':{'thigh_l':(.6,0,0),'thigh_r':(.6,0,0),'shin_l':(-.7,0,0),'shin_r':(-.7,0,0),'upper_arm_l':(0,0,-.7),'upper_arm_r':(0,0,.7)},'air':{'upper_arm_l':(0,0,-.5),'upper_arm_r':(0,0,.5),'thigh_l':(.20,0,0),'thigh_r':(.20,0,0)},'land':{'spine':(.18,0,0),'thigh_l':(.25,0,0),'thigh_r':(.25,0,0),'shin_l':(-.4,0,0),'shin_r':(-.4,0,0)},'kickflip':{'thigh_l':(.6,0,-.2),'thigh_r':(.45,0,.2),'shin_l':(-.55,0,0),'shin_r':(-.55,0,0),'upper_arm_l':(0,0,-.8),'upper_arm_r':(0,0,.8)},'grab':{'spine':(.5,0,0),'thigh_l':(.75,0,0),'thigh_r':(.75,0,0),'shin_l':(-.9,0,0),'shin_r':(-.9,0,0),'upper_arm_r':(.7,0,.2),'forearm_r':(.7,0,0)},'grind':{'upper_arm_l':(0,0,-1),'upper_arm_r':(0,0,1),'spine':(.08,0,0)},'bail':{'spine':(.4,0,0),'thigh_l':(.4,0,-.3),'thigh_r':(-.3,0,.3),'upper_arm_l':(0,0,-1.1),'upper_arm_r':(0,0,1.1)},'recover':{'spine':(.2,0,0),'thigh_l':(.3,0,0),'shin_l':(-.5,0,0)}}
rig.animation_data_create()
for name,pose in poses.items():
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in [1,13,25]:
  for bn in rig.pose.bones:
   bn.rotation_mode='XYZ';r=pose.get(bn.name,(0,0,0));f=1 if name not in ['push','ollie','land','recover'] else (1 if frame==13 else 0);bn.rotation_euler=tuple(v*f for v in r);bn.keyframe_insert(data_path='rotation_euler',frame=frame)
 bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=25
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_euler=(0,0,0)
save('skater');export('skater');mobile('skater',.4)
# Board geometry has an actual concave outline and independent wheel axles.
clean();verts=[];faces=[];n=24
for i in range(n+1):
 z=-.53+i/n*1.06;end=max(0,(abs(z)-.36)/.17);width=.17*(1-end*end*.35);height=.135+end*end*.08
 for x in [-width,width]:verts.append((x,height+.012*(x/width)**2,z))
for i in range(n):faces.append((i*2,i*2+1,i*2+3,i*2+2))
o=mesh('Concave deck',verts,faces,deckmat);sol=o.modifiers.new('Seven ply deck','SOLIDIFY');sol.thickness=.025;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name);bevel(o,.01)
mesh('Grip tape',[(x,y+.004,z)for x,y,z in verts],faces,black)
for z in [-.34,.34]:
 rod('Truck axle',(-.21,.085,z),(.21,.085,z),.022,silver)
 box('Truck base',(.12,.025,.1),(0,.105,z),silver)
 for x in [-.19,.19]:rod('Wheel',(x-.026,.062,z),(x+.026,.062,z),.062,sole,20);rod('Bearing',(x-.029,.062,z),(x+.029,.062,z),.022,silver,12)
box('Graphic stripe',(.26,.004,.58),(0,.106,0),limemat,.002)
for x in [-.11,.11]:
 for z in [-.36,-.31,.31,.36]:ell('Deck bolt',(.008,.003,.008),(x,.151,z),silver)
save('board');join_by_material();export('board');mobile('board',.5)
print('CONCRETE Blender production complete')

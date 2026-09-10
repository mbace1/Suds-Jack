from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, pathlib, zipfile, io, json
R=pathlib.Path(__file__).resolve().parents[1]; out=R/'assets'/'textures';out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(412); N=1024; y,x=np.mgrid[:N,:N]
colors={'concrete':(123,130,130),'plywood':(147,113,72),'painted-steel':(57,91,86),'metal':(134,143,145),'fabric':(207,121,62),'rubber':(35,39,40)}
for name,col in colors.items():
 fine=rng.normal(0,1,(N,N));coarse=np.array(Image.fromarray(np.uint8(rng.random((32,32))*255)).resize((N,N),Image.Resampling.BICUBIC))/255-.5
 h=coarse*.2+fine*.035
 if name=='plywood':h+=np.sin(y*.085+np.sin(x*.007)*2+coarse*2)*.14;h+=np.sin(y*.44+np.sin(x*.018))* .045
 if name=='fabric':h=np.sin(x*np.pi)*.03+((x%4<2)^(y%4<2))*.1+fine*.018
 if name=='rubber':h+=((x+y)%28<3)*.10
 if name=='painted-steel':h+=np.where(coarse>.25,coarse*.35,0)
 base=np.clip(np.array(col)[None,None,:]+h[:,:,None]*70,0,255).astype('uint8');Image.fromarray(base).save(out/(name+'-base.png'))
 rough=np.clip((.82 if name in ['concrete','fabric','plywood'] else .5)+h*.5,.15,1)
 Image.fromarray(np.uint8(rough*255)).save(out/(name+'-rough.png'))
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*1.5;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*1.5
 norm=np.stack([-dx,-dy,np.ones_like(h)],axis=2);norm/=np.linalg.norm(norm,axis=2)[:,:,None]
 Image.fromarray(np.uint8((norm*.5+.5)*255)).save(out/(name+'-normal.png'))
 for suffix in ['base','rough','normal']:
  im=Image.open(out/(name+'-'+suffix+'.png')); im.resize((512,512),Image.Resampling.LANCZOS).save(out/(name+'-'+suffix+'-mobile.png'))
# Original painted decal sheets, supplied as editable OpenRaster layers.
fontpath='C:/Windows/Fonts/arialbd.ttf';font=ImageFont.truetype(fontpath,96);small=ImageFont.truetype(fontpath,36)
layers=[]
for label,color,pos in [('CONCRETE',(225,244,177,255),(40,20)),('WAREHOUSE 01',(234,225,204,255),(40,170)),('FIND YOUR LINE',(217,241,96,255),(40,310))]:
 im=Image.new('RGBA',(1024,512));d=ImageDraw.Draw(im);d.text(pos,label,font=font if label=='CONCRETE' else small,fill=color);layers.append((label,im))
merged=Image.new('RGBA',(1024,512))
for _,im in layers:merged.alpha_composite(im)
merged.save(out/'decals.png')
ora=R/'art-source'/'decals.ora'
with zipfile.ZipFile(ora,'w') as z:
 z.writestr('mimetype','image/openraster');xml='<image w="1024" h="512" name="CONCRETE decals"><stack>'
 for i,(name,im) in enumerate(layers):
  b=io.BytesIO();im.save(b,format='PNG');z.writestr(f'data/layer{i}.png',b.getvalue());xml+=f'<layer name="{name}" src="data/layer{i}.png" opacity="1.0" visibility="visible" composite-op="svg:src-over" x="0" y="0"/>'
 z.writestr('stack.xml',xml+'</stack></image>');b=io.BytesIO();merged.save(b,format='PNG');z.writestr('mergedimage.png',b.getvalue())
# Sprite atlas: dust, spark, landing puff, speed streak; each in a 128px tile.
a=Image.new('RGBA',(512,128));yy,xx=np.mgrid[:128,:128]
for i in range(4):
 rx=(xx-64)/64;ry=(yy-64)/64
 if i==1:v=np.exp(-(rx*rx*18+ry*ry*2))
 elif i==3:v=np.exp(-(rx*rx*40+ry*ry*.8))
 else:v=np.clip(1-np.sqrt(rx*rx+ry*ry),0,1)**2
 c=np.zeros((128,128,4),dtype='uint8');c[:,:,:3]=[255,245,214] if i in [1,3] else [211,193,165];c[:,:,3]=np.uint8(v*230);a.paste(Image.fromarray(c),(i*128,0))
a.save(out/'effects.png')
print('Generated six original PBR families, desktop/mobile maps, decals.ora and effects atlas')

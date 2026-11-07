from PIL import Image,ImageDraw,ImageFont,ImageFilter
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];S=1792;shapes=json.loads((R/'sources/master-shapes.json').read_text());meta={}
for name in ['platform','harbour']:
 src=Image.open(R/'sources'/f'{name}.jpg').convert('RGBA')
 # Square source stays at native scale: no distortion, no generative portrait variant.
 # Extend ONLY quiet background beyond original composition for both aspect ratios.
 if name=='platform':
  bg=Image.new('RGBA',(S,S),'#f0e8d7');d=ImageDraw.Draw(bg)
  # Pale graphic street continuation; all important source objects remain untouched.
  for k in range(-1800,2500,160):d.line((k,0,k+1792,1792),fill='#e8e0cf',width=1)
  d=ImageDraw.Draw(src);d.ellipse((464,570,478,588),fill='#263238')
  crop=(0,0,1024,1024);pos=(384,384);face=(545,662,6.2,7.4)
 else:
  bg=Image.new('RGBA',(S,S),'#82959a');d=ImageDraw.Draw(bg)
  # Quay/water boundary continued in the same direction as source; no opposite bank.
  d.polygon([(0,684),(1792,1512),(1792,1792),(0,1792)],fill='#e9d9b9')
  d=ImageDraw.Draw(src)
  for x,y in [(180,594),(212,598)]:
   d.ellipse((x-8,y-9,x+8,y+9),fill='#c18d65')
   d.pieslice((x-8,y-9,x+8,y+9),180,360,fill='#3f332c')
  crop=(0,0,1024,1024);pos=(384,384);face=(464,738,7.5,8.5)
 src=src.crop(crop);w,h=src.size
 # Feather only exterior quiet margin; never a character/vehicle matte.
 alpha=Image.new('L',(w,h),255);ap=alpha.load();edge=35
 for y in range(h):
  for x in range(w):ap[x,y]=max(0,min(255,round(min(x,y,w-1-x,h-1-y)/edge*255)))
 src.putalpha(alpha);bg.alpha_composite(src,pos)
 folder=R/'layers'/name;folder.mkdir(exist_ok=True);bg.save(folder/'00-integrated-extended-plate.png')
 cx,cy,rx,ry=face;cx+=pos[0];cy+=pos[1]
 identity=Image.new('RGBA',(S*3,S*3));d=ImageDraw.Draw(identity)
 d.ellipse(((cx-rx-.6)*3,(cy-ry-.6)*3,(cx+rx+.6)*3,(cy+ry+.6)*3),fill='#fffdf7')
 d.ellipse(((cx-rx)*3,(cy-ry)*3,(cx+rx)*3,(cy+ry)*3),fill='#33b2d2')
 xs=[v for p in shapes.values() for v in p[::2]];u=rx*1.33/(max(xs)-min(xs))
 for p in shapes.values():d.polygon([((cx+(p[i]-350)*u)*3,(cy+(p[i+1]-350)*u*ry/rx)*3) for i in range(0,len(p),2)],fill='white')
 identity=identity.resize((S,S),Image.Resampling.LANCZOS);identity.save(folder/'10-traced-courier.png')
 final=Image.alpha_composite(bg,identity).convert('RGB');final.save(R/'masters'/f'{name}-master.png')
 boxes={'169':(0,392,1792,1400),'916':(392,0,1400,1792)}
 meta[name]={'master_size':[S,S],'native_source_crop':list(crop),'source_paste_origin':list(pos),'source_resampling':'none','common_safe_area':[392,392,1400,1400],'crops':{}}
 for aspect,box in boxes.items():
  im=final.crop(box);im.save(R/'crops'/f'{name}-{aspect}.png');meta[name]['crops'][aspect]={'box':list(box),'size':list(im.size)}
(R/'crop-metadata.json').write_text(json.dumps(meta,indent=2))
f=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
sheet=Image.new('RGB',(1600,1330),'#f4f1e8');d=ImageDraw.Draw(sheet)
d.text((25,18),'TOKO MOVE / HELSINKI VEHICLES + DUAL-CROP CHECK',font=f(26),fill='#15262b')
d.text((25,58),'Same master per location · real crops, no stretching or separately generated portrait art',font=f(17),fill='#69777a')
for row,name in enumerate(['platform','harbour']):
 y=102+row*602;d.text((25,y),name.upper()+' / 16:9',font=f(20),fill='#15262b')
 im=Image.open(R/'crops'/f'{name}-169.png').resize((1008,567),Image.Resampling.LANCZOS);sheet.paste(im,(25,y+30))
 d.text((1070,y),name.upper()+' / 9:16',font=f(20),fill='#15262b')
 im=Image.open(R/'crops'/f'{name}-916.png').resize((319,567),Image.Resampling.LANCZOS);sheet.paste(im,(1070,y+30))
sheet.save(R/'CONTACT.png')
print('2 masters 1792 square; landscape1792x1008; portrait1008x1792; contact1600x1330')

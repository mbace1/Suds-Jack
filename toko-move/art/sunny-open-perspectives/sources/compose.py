from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];SH=json.loads((R/'sources/master-shapes.json').read_text())
conf={'metro':{'face':[434,597,20,23],'169':[0,248,1024,824],'916':[380,0,956,1024]},'kiosk':{'face':[377,319,24,40],'169':[0,200,1024,776],'916':[260,0,836,1024]},'cyclist':{'face':None,'169':[0,152,1024,728],'916':[272,0,848,1024]},'doorway':{'face':[528,180,60,74],'169':[0,64,1024,640],'916':[240,0,816,1024]}}
meta={}
for n,c in conf.items():
 base=Image.open(R/'sources'/f'{n}.jpg').convert('RGBA');d=ImageDraw.Draw(base)
 folder=R/'layers'/n;folder.mkdir(exist_ok=True);base.save(folder/'00-integrated-plate.png')
 identity=Image.new('RGBA',(4096,4096));d=ImageDraw.Draw(identity)
 if c['face'] is not None:
  cx,cy,rx,ry=c['face']
  d.ellipse(((cx-rx-1)*4,(cy-ry-1)*4,(cx+rx+1)*4,(cy+ry+1)*4),fill='#fffdf7');d.ellipse(((cx-rx)*4,(cy-ry)*4,(cx+rx)*4,(cy+ry)*4),fill='#33b2d2')
  xs=[v for p in SH.values() for v in p[::2]];s=rx*1.33/(max(xs)-min(xs))
  for p in SH.values():d.polygon([((cx+(p[i]-350)*s)*4,(cy+(p[i+1]-350)*s*ry/rx)*4) for i in range(0,len(p),2)],fill='white')
 identity=identity.resize((1024,1024),Image.Resampling.LANCZOS);identity.save(folder/'10-exact-courier-identity.png')
 final=Image.alpha_composite(base,identity).convert('RGB');final.save(R/'masters'/f'{n}-master.png')
 meta[n]={'master_size':[1024,1024],'crops':{}}
 for asp in ['169','916']:
  im=final.crop(c[asp]);im.save(R/'crops'/f'{n}-{asp}.png');meta[n]['crops'][asp]={'box':c[asp],'size':list(im.size)}
 a,b=c['169'],c['916'];meta[n]['common_safe_area']=[max(a[0],b[0]),max(a[1],b[1]),min(a[2],b[2]),min(a[3],b[3])]
(R/'crop-metadata.json').write_text(json.dumps(meta,indent=2))
f=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
sheet=Image.new('RGB',(1480,2700),'#f4f1e8');d=ImageDraw.Draw(sheet)
d.text((24,20),'TOKO MOVE / OPEN PERSPECTIVES',font=f(28),fill='#15262b')
d.text((24,62),'Four new cameras/settings · real same-master 16:9 + 9:16 crops · review only',font=f(20),fill='#69777a')
for i,(n,label) in enumerate([('metro','ELEVATED / eastern outdoor metro fragment'),('kiosk','SIDE EYE LEVEL / kiosk pickup'),('cyclist','REAR SHOULDER / cyclist at steps'),('doorway','FRONTAL THRESHOLD / delivery arriving')]):
 y=112+i*634;d.text((24,y),label,font=f(21),fill='#15262b')
 im=Image.open(R/'crops'/f'{n}-169.png');sheet.paste(im,(24,y+36))
 im=Image.open(R/'crops'/f'{n}-916.png').resize((324,576),Image.Resampling.LANCZOS);sheet.paste(im,(1100,y+36))
sheet.save(R/'CONTACT.png')

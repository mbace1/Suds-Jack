from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];SH=json.loads((R/'sources/master-shapes.json').read_text())
conf={'kalasatama':{'face':[404,588,38,39],'169':[0,320,1024,896],'916':[256,0,832,1024]},'station':{'face':[523,451,43,47],'169':[0,224,1024,800],'916':[352,0,928,1024]},'canal':{'face':[518,398,25,28],'169':[0,224,1024,800],'916':[384,0,960,1024]}}
meta={}
for n,c in conf.items():
 base=Image.open(R/'sources'/f'{n}.jpg').convert('RGBA');d=ImageDraw.Draw(base)
 if n=='kalasatama':
  d.rectangle((216,580,279,643),fill='#d9d6be')
 if n=='station':
  d.polygon([(434,414),(774,457),(774,476),(434,433)],fill='#314735')
 if n=='canal':
  px=base.load()
  for yy in range(447,558):
   for xx in range(450,600):
    rr,gg,bb,aa=px[xx,yy]
    if bb>130 and gg>105 and rr<100 and bb>rr*1.5: px[xx,yy]=(222,166,110,aa)
 folder=R/'layers'/n;folder.mkdir(exist_ok=True);base.save(folder/'00-integrated-plate.png')
 identity=Image.new('RGBA',(4096,4096));d=ImageDraw.Draw(identity);cx,cy,rx,ry=c['face']
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
sheet=Image.new('RGB',(1480,2040),'#f4f1e8');d=ImageDraw.Draw(sheet)
d.text((24,20),'TOKO MOVE / THREE NEW SUNNY LOCATIONS',font=f(28),fill='#15262b')
d.text((24,62),'Actual 16:9 + 9:16 crops from each shared master · no padding, stretching or portrait repaint',font=f(17),fill='#69777a')
for i,(n,label) in enumerate([('kalasatama','KALASATAMA APPROACH / orange metro arrival'),('station','CENTRAL STATION / exterior parcel pickup'),('canal','KATAJANOKKA CANAL / walking delivery')]):
 y=112+i*634;d.text((24,y),label,font=f(21),fill='#15262b')
 im=Image.open(R/'crops'/f'{n}-169.png');sheet.paste(im,(24,y+36))
 im=Image.open(R/'crops'/f'{n}-916.png').resize((324,576),Image.Resampling.LANCZOS);sheet.paste(im,(1100,y+36))
sheet.save(R/'CONTACT.png');print('3 masters 1024 square; 6 crops1024x576 /576x1024; contact1480x2040')

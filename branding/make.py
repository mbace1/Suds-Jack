from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops
import random
R='/tmp/ref/'; O='/workspace/branding/'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def hexc(h): return tuple(int(h[i:i+2],16) for i in (1,3,5))
# --- face mask from master art (yellow on white): 4x Lanczos upscale, smooth threshold
src=Image.open(R+'face-yellow-on-white.jpg').convert('RGB')
b=src.split()[2]                       # blue channel: white=255, yellow=low
m=ImageOps.invert(b).point(lambda v:0 if v<60 else 255 if v>140 else int((v-60)*255/80))
bb=m.getbbox(); m=m.crop(bb)
m=m.resize((m.width*4,m.height*4),Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
m=m.point(lambda v:0 if v<110 else 255 if v>146 else int((v-110)*255/36))
def face(w,col,shadow=None):
    f=m.resize((w,int(w*m.height/m.width)),Image.LANCZOS)
    L=Image.new('RGBA',f.size,col+(0,)); L.putalpha(f); return L
def put(c,fl,cx,cy,shadow=None,off=10):
    x,y=cx-fl.width//2,cy-fl.height//2
    if shadow:
        s=Image.new('RGBA',fl.size,shadow+(0,)); s.putalpha(fl.getchannel('A'))
        c.alpha_composite(s,(x+off,y+off))
    c.alpha_composite(fl,(x,y))
def circ(p,out):
    im=Image.open(p).convert('RGBA'); k=Image.new('L',im.size,0)
    ImageDraw.Draw(k).ellipse((0,0)+im.size,fill=255)
    bg=Image.new('RGBA',im.size,(255,255,255,0)); bg.paste(im,(0,0),k); bg.resize((400,400),Image.LANCZOS).save(out)
def cover(p,w,h):
    return ImageOps.fit(Image.open(p).convert('RGB'),(w,h),Image.LANCZOS).convert('RGBA')
def text(d,xy,s,size,fill,anchor='mm',maxw=None):
    f=ImageFont.truetype(BOLD,size)
    while maxw and f.getlength(s)>maxw: size-=2; f=ImageFont.truetype(BOLD,size)
    d.text(xy,s,font=f,fill=fill,anchor=anchor)

# ===== TOKO MIDORI (green carrier: #1c4a38 / #44ff88 from repo CSS, magenta accent) =====
TG,TL,TM,INK=hexc('#1c4a38'),hexc('#44ff88'),hexc('#f0027f'),hexc('#0c0c0e')
T=O+'toko-midori/'
c=Image.new('RGBA',(1080,1080),TG+(255,)); d=ImageDraw.Draw(c)
d.ellipse((90,90,990,990),fill=hexc('#235c45'))
put(c,face(640,TL),540,560,shadow=INK,off=14); c.save(T+'profile-1080.png'); circ(T+'profile-1080.png',T+'profile-circle-preview.png')
games=['g_neonronin-samurai-cover.216c70d9.png','g_tokotrip-jetty.caa95d4c.png','g_piritori-interior-toko.552c6ff7.png','g_og.jpg']
def toko_banner(W,H,sx,sy,sw,sh,name):
    c=Image.new('RGBA',(W,H),INK+(255,))
    n=len(games); tw=W//n
    for i,g in enumerate(games):
        t=cover(R+g,tw+2,H); t=Image.blend(t,Image.new('RGBA',t.size,TG+(255,)),0.55); c.paste(t,(i*tw,0))
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(ov)
    od.rectangle((sx,sy+int(sh*.08),sx+sw,sy+int(sh*.92)),fill=INK+(215,)); c.alpha_composite(ov)
    fh=int(sh*.62); f=face(int(fh*m.width/m.height),TL); put(c,f,sx+int(sh*.12)+f.width//2,sy+sh//2,shadow=TM,off=max(4,fh//40))
    d=ImageDraw.Draw(c); tx=sx+int(sh*.24)+f.width
    text(d,(tx,sy+int(sh*.42)),'TOKO MIDORI GAMES',int(sh*.16),TL,'lm',maxw=sx+sw-tx-int(sh*.08))
    text(d,(tx,sy+int(sh*.64)),'free arcade games in your browser · GO MAKE YOUR OWN',int(sh*.065),(235,235,235),'lm',maxw=sx+sw-tx-int(sh*.08))
    c.convert('RGB').save(T+name)
toko_banner(1500,500,40,0,1420,500,'x-header-1500x500.png')
toko_banner(2560,1440,507,508,1546,423,'youtube-2560x1440.png')
toko_banner(1920,1080,120,240,1680,600,'generic-1920x1080.png')

# ===== RADIO FREE HELSINKI =====
OC,MG,NI=hexc('#e3a33a'),hexc('#f0027f'),hexc('#0d0f16')
F=O+'radio-free-hki/'
def skyline(W,H,base,seed):
    """papercut layers: Helsinki skyline silhouettes + radio mast"""
    L=Image.new('RGBA',(W,H),(0,0,0,0)); rnd=random.Random(seed)
    for li,(col,hf) in enumerate([((28,30,44),.42),((20,22,32),.30),((10,11,17),.18)]):
        lay=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(lay); top=int(base-H*hf); x=0
        while x<W:
            w=rnd.randint(int(W*.02),int(W*.06)); h=rnd.randint(int(H*hf*.3),int(H*hf*.8)); y=base-h
            d.rectangle((x,y,x+w,base+H),fill=col+(255,))
            if rnd.random()<.35: d.polygon([(x,y),(x+w//2,y-w//2),(x+w,y)],fill=col+(255,))
            if li==2:
                for wy in range(y+8,base-6,max(10,H//40)):
                    if rnd.random()<.3: d.rectangle((x+w//4,wy,x+w//4+max(3,W//500),wy+max(3,H//160)),fill=OC+(255,))
            x+=w
        if li==0:  # cathedral dome + mast
            cx=int(W*.66); r=int(H*.07); d.rectangle((cx-r*2,base-int(H*.38),cx+r*2,base+H),fill=col+(255,))
            d.ellipse((cx-r,base-int(H*.38)-r,cx+r,base-int(H*.38)+r),fill=col+(255,)); d.rectangle((cx-3,base-int(H*.38)-r*2,cx+3,base),fill=col+(255,))
            mx=int(W*.88); mt=base-int(H*.62)
            d.polygon([(mx-W//60,base),(mx,mt),(mx+W//60,base)],fill=col+(255,))
            for k in range(1,4):
                rr=k*H//30; d.arc((mx-rr,mt-rr,mx+rr,mt+rr),200,340,fill=MG+(255,),width=max(3,H//200))
            d.ellipse((mx-H//90,mt-H//90,mx+H//90,mt+H//90),fill=MG+(255,))
        sh=Image.new('RGBA',(W,H),(0,0,0,0)); sh.putalpha(lay.getchannel('A').filter(ImageFilter.GaussianBlur(H//150)).point(lambda v:v*.6))
        L.alpha_composite(sh,(0,-H//200)); L.alpha_composite(lay)
    return L
def badge(sz):
    c=Image.new('RGBA',(sz,sz),(0,0,0,0)); d=ImageDraw.Draw(c)
    d.ellipse((sz*.04+sz*.03,sz*.04+sz*.03,sz*.96+sz*.03,sz*.96+sz*.03),fill=(0,0,0,150))
    d.ellipse((sz*.04,sz*.04,sz*.96,sz*.96),fill=MG+(255,)); d.ellipse((sz*.1,sz*.1,sz*.9,sz*.9),outline=OC+(255,),width=max(3,sz//60))
    put(c,face(int(sz*.58),(255,255,255)),sz//2,int(sz*.52),shadow=(120,0,60),off=max(3,sz//90)); return c
p=Image.new('RGBA',(1080,1080),NI+(255,)); p.alpha_composite(skyline(1080,1080,1080,3).resize((1080,1080))); 
p=Image.blend(p,Image.new('RGBA',p.size,NI+(255,)),0.5); p.alpha_composite(badge(860),(110,110)); p.save(F+'profile-1080.png'); circ(F+'profile-1080.png',F+'profile-circle-preview.png')
def rfh_banner(W,H,sx,sy,sw,sh,name,align='c'):
    """minimal: flat dark field, off-white wordmark, ONE accent (magenta thin rule)"""
    c=Image.new('RGBA',(W,H),NI+(255,)); d=ImageDraw.Draw(c)
    fs=int(sh*.17); f=ImageFont.truetype(BOLD,fs); word='RADIO FREE HELSINKI'
    while f.getlength(word)>sw*.86: fs-=2; f=ImageFont.truetype(BOLD,fs)
    tw=f.getlength(word); cx=sx+sw//2 if align=='c' else sx+sw-int(tw/2)
    cy=sy+sh//2; d.text((cx,cy),word,font=f,fill=(236,232,224),anchor='mm')
    rw=int(tw*.18); ry=cy+int(fs*.85); d.rectangle((cx-rw//2,ry,cx+rw//2,ry+max(3,fs//22)),fill=MG)
    c.convert('RGB').save(F+name)
# X header: wordmark pushed right so the avatar (bottom-left) has room
rfh_banner(1500,500,520,60,900,300,'x-header-1500x500.png',align='r')
rfh_banner(2560,1440,507,508,1546,423,'youtube-2560x1440.png')
rfh_banner(1920,1080,140,260,1640,560,'generic-1920x1080.png')
# safe-area overlays
for dd in (T,F):
    y=Image.open(dd+'youtube-2560x1440.png').convert('RGBA'); o=ImageDraw.Draw(y)
    o.rectangle((507,508,2053,931),outline=(255,0,0),width=6); o.rectangle((0,0,2559,1439),outline=(0,160,255),width=6)
    text(o,(1280,960),'1546×423 safe area (all devices)',36,(255,60,60),'mt'); y.convert('RGB').save(dd+'youtube-safe-area-check.png')

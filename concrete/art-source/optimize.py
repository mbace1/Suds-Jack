import struct,json,pathlib,io
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
for p in (ROOT/'assets/models').glob('*.glb'):
 data=p.read_bytes();n=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+n]);binary=data[28+n:];replacements={};cap=512 if 'mobile'in p.name else 1024
 for im in j.get('images',[]):
  if im.get('mimeType')=='image/webp':continue
  v=j['bufferViews'][im['bufferView']];raw=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']];img=Image.open(io.BytesIO(raw));img.thumbnail((cap,cap),Image.Resampling.LANCZOS);out=io.BytesIO();img.save(out,format='WEBP',quality=90,method=6);replacements[im['bufferView']]=out.getvalue();im['mimeType']='image/webp'
 if not replacements:continue
 new=bytearray()
 for i,v in enumerate(j['bufferViews']):
  b=replacements.get(i,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);new.extend(b'\x00'*((-len(new))%4));v['byteOffset']=len(new);v['byteLength']=len(b);new.extend(b)
 for t in j.get('textures',[]):
  if 'source'in t:t.setdefault('extensions',{})['EXT_texture_webp']={'source':t.pop('source')}
 for field in ['extensionsUsed','extensionsRequired']:
  if 'EXT_texture_webp'not in j.setdefault(field,[]):j[field].append('EXT_texture_webp')
 j['buffers'][0]['byteLength']=len(new);new.extend(b'\x00'*((-len(new))%4));js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((-len(js))%4);p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(new))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(new),0x004e4942)+new);print(p.name,len(data),'->',p.stat().st_size)

import struct,json,pathlib,hashlib
R=pathlib.Path(__file__).resolve().parents[1];manifest=json.loads((R/'assets/manifest.json').read_text());stats={}
for p in (R/'assets/models').glob('*.glb'):
 b=p.read_bytes();magic,version,total=struct.unpack_from('<III',b);assert magic==0x46546c67 and version==2 and total==len(b);n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binaryLength=struct.unpack_from('<I',b,20+n)[0]
 for v in j.get('bufferViews',[]):assert v.get('byteOffset',0)+v['byteLength']<=binaryLength
 tris=sum(j['accessors'][q['indices']]['count']//3 for m in j.get('meshes',[])for q in m['primitives']);draws=sum(len(m['primitives'])for m in j.get('meshes',[]));clips=[a['name']for a in j.get('animations',[])]
 if p.name.startswith('skater'):assert set(clips)==set(manifest['animationClips']);assert any('skin'in node for node in j['nodes'])
 stats[p.name]={'bytes':len(b),'triangles':tris,'primitives':draws,'clips':clips,'sha256':hashlib.sha256(b).hexdigest()}
for tier in ['desktop','mobile']:
 names=[manifest['models'][k][tier].split('/')[-1].split('?')[0]for k in manifest['models']];suffix='-mobile'if tier=='mobile'else'';textures=['effects.png','decals.png',f'fabric-normal{suffix}.png',f'fabric-rough{suffix}.png'];size=sum(stats[n]['bytes']for n in names)+sum((R/'assets/textures'/t).stat().st_size for t in textures);tri=sum(stats[n]['triangles']for n in names);prims=sum(stats[n]['primitives']for n in names);budget=manifest['quality'][tier];assert size<=budget['maxArtBytes'];assert tri<=budget['maxTriangles'];assert prims<=budget['maxDrawCalls'];stats[tier]={'artBytes':size,'uniqueTriangles':tri,'meshPrimitives':prims};print(tier,stats[tier])
(R/'assets/validation.json').write_text(json.dumps(stats,indent=2));print('PASS all GLB buffer bounds, skins, twelve clips, and both quality budgets')

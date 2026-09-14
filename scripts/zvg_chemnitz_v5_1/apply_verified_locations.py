from pathlib import Path
import json,sys
ROOT=Path.cwd(); SRC=ROOT/'data'/'zvg-chemnitz-v5'/'verified_locations_v5.json'; OUT=ROOT/'var'/'chemnitz_v5_locations.json'
if not SRC.exists(): print('[ERROR] missing verified location seed');sys.exit(2)
d=json.loads(SRC.read_text(encoding='utf-8'))
loc=d.get('locations',{})
if len(loc)!=39: print('[ERROR] expected 39 verified locations, got',len(loc));sys.exit(3)
bad=[k for k,v in loc.items() if v.get('precision') not in ('house_number','multi_address_centroid','parcel')]
if bad: print('[ERROR] non-exact location seed:',bad);sys.exit(4)
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'[GEO] verified local seed written: {OUT} exact=39 unresolved=0')

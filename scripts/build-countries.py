# Builds data/countries.geo.json from Natural Earth 1:50m admin-0 countries.
# Usage: python3 scripts/build-countries.py ne_50m_admin_0_countries.geojson data/countries.geo.json
# Source: https://github.com/nvkelso/natural-earth-vector (public domain)
import json,sys
src,dst=sys.argv[1],sys.argv[2]
SCOPE={"TUR","SYR","LBN","ISR","PSE","JOR","IRQ","IRN","SAU","YEM","OMN","ARE","QAT","BHR","KWT","EGY","CYP"}
W,S,E,N=18,5,68,46
d=json.load(open(src))
def rnd(c):
  if isinstance(c[0],(int,float)): return [round(c[0],3),round(c[1],3)]
  return [rnd(x) for x in c]
def bbox(c,acc):
  if isinstance(c[0],(int,float)): acc.append(c); return
  for x in c: bbox(x,acc)
out=[]
for f in d['features']:
  p=f['properties']; iso=p['ADM0_A3']
  if iso=='CYN': iso='CYP_N'
  if iso=='PSX': iso='PSE'
  pts=[]; bbox(f['geometry']['coordinates'],pts)
  xs=[x for x,_ in pts]; ys=[y for _,y in pts]
  if max(xs)<W or min(xs)>E or max(ys)<S or min(ys)>N: continue
  if iso in ('RUS','USA','FRA'): continue
  geom=f['geometry']; geom={"type":geom['type'],"coordinates":rnd(geom['coordinates'])}
  out.append({"type":"Feature","properties":{"iso":iso,"name":{'PSE':'Palestine','TUR':'Türkiye'}.get(iso,p['NAME_EN']),"in_scope":iso in SCOPE,"label_lng":round(p['LABEL_X'],3),"label_lat":round(p['LABEL_Y'],3)},"geometry":geom})
json.dump({"type":"FeatureCollection","features":out},open(dst,'w'),separators=(',',':'))
print(len(out), sorted(f['properties']['iso'] for f in out))
print(sorted(SCOPE-{f['properties']['iso'] for f in out}))
for f in out:
  if f['properties']['in_scope']: print(f['properties']['iso'], f['properties']['name'])

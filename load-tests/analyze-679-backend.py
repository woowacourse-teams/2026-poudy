import sys
import json,pathlib,re,statistics
p=(pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent)
phases=json.loads((p/'summary.json').read_text());rows=[json.loads(s) for s in (p/'be-resources.jsonl').read_text().splitlines()]
def metrics(row):
 out={}
 for s in row.get('metrics',[]):
  a,b=s.rsplit(' ',1)
  if 'HikariPool-1' in a:out[a.split('{')[0]]=float(b)
 return out
for q in phases:
 rs=[r for r in rows if q['start']<=r['at']<=q['end'] and 'error' not in r];ms=[metrics(r) for r in rs]
 if len(ms)<2:continue
 out={'samples':len(rs),'pendingMax':max(m.get('hikaricp_connections_pending',0) for m in ms),'activeMax':max(m.get('hikaricp_connections_active',0) for m in ms),'images':list(dict.fromkeys(r.get('image') for r in rs))}
 for key in ['acquire','usage']:
  stem='hikaricp_connections_'+key+'_seconds_';n=ms[-1].get(stem+'count',0)-ms[0].get(stem+'count',0);s=ms[-1].get(stem+'sum',0)-ms[0].get(stem+'sum',0)
  out[key+'MeanMs']=1000*s/n if n>0 else None
 cpus=[float(r['container'].split('%')[0]) for r in rs if r.get('container')];out['containerCpuMax']=max(cpus) if cpus else None;out['containerCpuMean']=statistics.mean(cpus) if cpus else None
 q['backend']=out
(p/'summary.json').write_text(json.dumps(phases,indent=2))
for q in phases:print(q['label'],q.get('backend'))

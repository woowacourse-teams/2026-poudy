import sys
import json,pathlib,statistics,datetime
root=(pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent)
f=root;o=root
def load(name):return json.loads((f/name).read_text())
def vals(x,key):return x['metrics'].get(key,{}).get('values',{})
def phase(name):
 x=load(name+'.json');h=[json.loads(s) for s in (f/(name+'-health.jsonl')).read_text().splitlines()]
 start=h[0]['at'];end=datetime.datetime.fromisoformat(x['metadata']['generatedAt'].replace('Z','+00:00')).timestamp()
 return {'label':name,'start':start,'end':end,'requests':vals(x,'http_reqs')['count'],'duration':vals(x,'http_req_duration'),'failed':vals(x,'http_req_failed')['rate'],'invalid':vals(x,'invalid_payload')['rate'],'dropped':vals(x,'dropped_iterations').get('count',0),'endpoints':{r['name']:vals(x,'http_req_duration{endpoint:'+r['name']+'}') for r in x['metadata']['routes']}}
phases=[]
for name in ['pre679-467-7rps','pre679-467-44rps-local','post679-366-7rps','post679-366-44rps-local']:
 if (f/(name+'.json')).exists():phases.append(phase(name))
if (o/'db-resources.jsonl').exists():
 rows=[json.loads(s) for s in (o/'db-resources.jsonl').read_text().splitlines()]
 for p in phases:
  rs=[r for r in rows if p['start']<=r['at']<=p['end']]
  if rs:p['db']={'samples':len(rs),'cpuMean':statistics.mean(r['cpu'] for r in rs),'cpuMax':max(r['cpu'] for r in rs),'memMinMiB':min(r['memAvailableKiB'] for r in rs)/1024,'swapMaxKiB':max(r['swapUsedKiB'] for r in rs)}
(o/'summary.json').write_text(json.dumps(phases,indent=2))
for p in phases:print(p['label'],p['requests'],p['duration']['p(95)'],p['duration']['p(99)'],p.get('db'))

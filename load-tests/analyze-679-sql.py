import sys
import json,pathlib
p=(pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent)
for phase,a,b in [('pre7','pre7','post7'),('pre44','pre44','post44'),('post7','new-before7','new-after7'),('post44','new-before44','new-after44')]:
 if not (p/(b+'.json')).exists():continue
 before=json.loads((p/(a+'.json')).read_text());after=json.loads((p/(b+'.json')).read_text());bm={r['queryid']:r for r in before['rows']};rows=[]
 for r in after['rows']:
  old=bm.get(r['queryid'],{});d={k:r[k]-old.get(k,0) for k in ['calls','total_exec_time','rows','shared_blks_hit','shared_blks_read','temp_blks_written']};d['queryid']=r['queryid']
  if d['calls']>0:rows.append(d)
 out={'start':before['at'],'end':after['at'],'resetUnchanged':before['reset']==after['reset'],'calls':sum(r['calls'] for r in rows),'rowsReturned':sum(r['rows'] for r in rows),'totalExecMs':sum(r['total_exec_time'] for r in rows),'queries':sorted(rows,key=lambda r:-r['total_exec_time'])}
 out['usedForBeforeAfterComparison']=phase in ['pre44','post44']
 if phase=='post7':out['boundaryNote']='Snapshot includes subsequent standalone probes; do not use as paired SQL comparison.'
 (p/(phase+'-sql-delta.json')).write_text(json.dumps(out,indent=2));print(phase,out['calls'],out['rowsReturned'],round(out['totalExecMs'],1))

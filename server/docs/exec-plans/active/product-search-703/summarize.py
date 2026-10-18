"""pgbench 트랜잭션 로그에서 질의·형식별 회차 p50/p95(ms)를 뽑는다. 순위는 nearest-rank 다."""
import collections, math, pathlib, re, sys

def pct(values, p):
    ordered = sorted(values)
    return ordered[max(0, math.ceil(p / 100 * len(ordered)) - 1)]

logs = pathlib.Path(sys.argv[1])
rounds = collections.defaultdict(dict)
for path in logs.iterdir():
    m = re.match(r"(.+)\.r(\d+)\.\d+$", path.name)
    if not m:
        continue
    # 회차마다 처음 6번은 접속마다 계획을 세우는 구간이라 뺀다(report.py 의 SKIP 과 같다).
    latencies = [int(line.split()[2]) / 1000 for line in path.read_text().splitlines() if line.strip()][6:]
    rounds[m.group(1)][int(m.group(2))] = (pct(latencies, 50), pct(latencies, 95), len(latencies))
print("| query | shape | p50 median | p95 by round | max p95 |")
print("|---|---|---:|---|---:|")
for name in sorted(rounds):
    qid, shape = name.split("__")
    rs = [rounds[name][r] for r in sorted(rounds[name])]
    p50s = sorted(r[0] for r in rs)
    print(f"| {qid} | {shape} | {p50s[len(p50s) // 2]:.2f} | {' / '.join(f'{r[1]:.2f}' for r in rs)} | {max(r[1] for r in rs):.2f} |")

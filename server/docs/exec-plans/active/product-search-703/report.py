"""측정 결과를 한 표로 모은다.

usage:
  report.py baseline <snap-logs> <x20-logs> <snap-plans> <x20-plans> > baseline-<sha>.tsv
  report.py compare <baseline.tsv> <limits.tsv> <snap-logs> <x20-logs> <snap-plans> <x20-plans>

baseline 은 질의·형식마다 회차별 p95 중 최댓값(허용 시간)과 p50 중앙값, 공유 버퍼 hit 을 TSV 로 쓴다.
회차마다 처음 SKIP 번은 빼고 센다.
compare 는 같은 값을 다시 계산해 허용 시간과 비교한 마크다운 표를 쓴다. limits.tsv 에 적은 질의는 자기 기준선 대신
대응하는 완성형 질의의 허용 시간을 쓴다(예전에 빈 결과를 빨리 돌려준 시간과 비교하지 않는다).
"""
import collections, math, pathlib, re, sys

SHAPES = ["suggest", "list_default", "list_price", "count", "exists"]
# 회차마다 새 접속이라 plpgsql 이 처음 5번은 실행마다 계획을 세우고 6번째에 일반 계획으로 바꾼다. 이 6번은 접속 준비 비용이라 뺀다.
SKIP = 6


def pct(values, p):
    ordered = sorted(values)
    return ordered[max(0, math.ceil(p / 100 * len(ordered)) - 1)]


def latencies(logs):
    rounds = collections.defaultdict(dict)
    for path in pathlib.Path(logs).iterdir():
        m = re.match(r"(.+)\.r(\d+)\.\d+$", path.name)
        if m:
            values = [int(line.split()[2]) / 1000 for line in path.read_text().splitlines() if line.strip()][SKIP:]
            rounds[m.group(1)][int(m.group(2))] = (pct(values, 50), pct(values, 95))
    result = {}
    for name, by_round in rounds.items():
        p50s = sorted(v[0] for v in by_round.values())
        result[name] = (p50s[len(p50s) // 2], max(v[1] for v in by_round.values()))
    return result


def hits(plans):
    result = {}
    for path in pathlib.Path(plans).glob("*.plan"):
        found = re.search(r"Buffers: shared hit=(\d+)", path.read_text(encoding="utf-8", errors="replace").rsplit("duration:", 1)[-1])
        result[path.stem] = int(found.group(1)) if found else None
    return result


def measure(snap_logs, x20_logs, snap_plans, x20_plans):
    snap, x20, snap_hit, x20_hit = latencies(snap_logs), latencies(x20_logs), hits(snap_plans), hits(x20_plans)
    for name in sorted(snap, key=lambda n: (n.split("__")[0], SHAPES.index(n.split("__")[1]))):
        yield name, snap[name], x20[name], snap_hit.get(name), x20_hit.get(name)


def baseline(args):
    print("query\tshape\tsnap_p50\tsnap_p95_max\tsnap_hit\tx20_p50\tx20_p95_max\tx20_hit")
    for name, s, x, sh, xh in measure(*args):
        qid, shape = name.split("__")
        print(f"{qid}\t{shape}\t{s[0]:.2f}\t{s[1]:.2f}\t{sh}\t{x[0]:.2f}\t{x[1]:.2f}\t{xh}")


def compare(args):
    base = {}
    for line in pathlib.Path(args[0]).read_text(encoding="utf-8").splitlines()[1:]:
        qid, shape, _, snap_max, _, _, x20_max, _ = line.split("\t")
        base[(qid, shape)] = (float(snap_max), float(x20_max))
    reference = dict(line.split("\t")[:2] for line in pathlib.Path(args[1]).read_text(encoding="utf-8").splitlines()
                     if line.strip() and not line.startswith("#"))
    print("| query | shape | 스냅샷 p95 / 허용 | 20배 p95 / 허용 | 통과 |")
    print("|---|---|---:|---:|---|")
    failed = 0
    for name, s, x, _, _ in measure(*args[2:]):
        qid, shape = name.split("__")
        limit = base[(reference.get(qid, qid), shape)]
        ok = s[1] <= limit[0] and x[1] <= limit[1]
        failed += not ok
        print(f"| {qid} | {shape} | {s[1]:.2f} / {limit[0]:.2f} | {x[1]:.2f} / {limit[1]:.2f} | {'예' if ok else '아니오'} |")
    print(f"\n허용 시간을 넘은 행: {failed}")


if __name__ == "__main__":
    {"baseline": baseline, "compare": compare}[sys.argv[1]](sys.argv[2:])

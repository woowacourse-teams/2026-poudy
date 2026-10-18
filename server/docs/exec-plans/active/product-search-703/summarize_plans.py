"""explain.sh 결과에서 질의·형식별 바깥 문장의 실행 시간, 공유 버퍼 hit 합과 쓰인 인덱스·순차 스캔을 뽑는다."""
import pathlib, re, sys

plans = pathlib.Path(sys.argv[1])
print("| query | shape | top ms | shared hit | product_search_document 접근 |")
print("|---|---|---:|---:|---|")
for path in sorted(plans.glob("*.plan")):
    qid, shape = path.stem.split("__")
    text = path.read_text(encoding="utf-8", errors="replace")
    durations = [float(m) for m in re.findall(r"duration: ([0-9.]+) ms", text)]
    # auto_explain 은 안쪽 문장부터 남기므로 마지막 duration 이 바깥 문장이다.
    top = durations[-1] if durations else float("nan")
    top_hit = re.search(r"Buffers: shared hit=(\d+)", text.rsplit("duration:", 1)[-1])
    access = sorted(set(re.findall(r"(?:Bitmap Index Scan|Index Scan|Index Only Scan) on (ix_product_search_document_\w+)", text))
                    | {"Seq Scan" for _ in re.findall(r"Seq Scan on product_search_document", text)[:1]})
    print(f"| {qid} | {shape} | {top:.2f} | {top_hit.group(1) if top_hit else '-'} | {', '.join(access) or '-'} |")

"""V46 마크 통합·V47 근거 공유·현재 검색을 같은 트랜잭션·자료에서 교대로 측정한다. 전용 테스트 DB에서만 실행한다.

예: python3 benchmark.py /tmp/search-975 psql -U postgres -d poudy_search_975
psql 대신 docker exec -i <container> psql ... 명령도 받을 수 있다.
측정용 함수·데이터는 마지막 ROLLBACK으로 모두 되돌린다.
SEARCH_BENCH_PRODUCTS/WARMUP/ITERATIONS로 자료 수·준비 호출·표본 수를 조절한다.
SEARCH_BENCH_QUERIES/ROUTES는 쉼표로 구분한다. 기본값은 1,000개·20회·50회다.
"""

import json
import math
import os
import re
import statistics
import subprocess
import sys
from pathlib import Path

server = Path(__file__).resolve().parents[3]
output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
command = sys.argv[2:]
product_count = int(os.environ.get("SEARCH_BENCH_PRODUCTS", "1000"))
warmup = int(os.environ.get("SEARCH_BENCH_WARMUP", "20"))
iterations = int(os.environ.get("SEARCH_BENCH_ITERATIONS", "50"))
queries = os.environ.get("SEARCH_BENCH_QUERIES", "ㅂ,피디알엔,검증스내일,닥터지블랙검증,닥터지썬크림,선크림,무기자차 검증표식,연관브랜드 수분,성능 검증 젤").split(",")
routes = os.environ.get("SEARCH_BENCH_ROUTES", "SEARCH,SUGGEST,RELATED,LIST_FILTERED,COUNT_FILTERED,COMPAT_ALL").split(",")
migrations = server / "src/main/resources/db/migration"
fixtures = server / "src/test/resources/db"


def function(file, name):
    source = (migrations / file).read_text()
    start = source.find("CREATE OR REPLACE FUNCTION " + name + "(")
    if start < 0:
        start = source.index("CREATE FUNCTION " + name + "(")
    if file.startswith("V40") and name == "search_product_has_spelling":
        return source[start : source.index(";", start) + 1]
    return source[start : source.index("$$;", source.index("AS $$", start) + 5) + 3]


# 과거 V43·검색 V46·V47 표본은 705bda11 기준 자료다. 현재 스키마의 비교 기준은 dev V46이다.
mark_source = (server / "src/main/java/com/poudy/product/domain/Mark.java").read_text()
marks = [{"code": code, "name": name} for code, name in re.findall(r'\w+\("([A-Z_]+)", "([^"]+)"', mark_source)]
group_source = (server / "src/main/java/com/poudy/product/domain/MarkFilterGroup.java").read_text()
filter_marks = [(code, group) for group, members in re.findall(r'(\w+)\("[^"]+", List\.of\(([^)]+)\)\)', group_source)
                for code in re.findall(r'Mark\.(\w+)', members)]
def text_array(values):
    return "array[" + ",".join("'" + value + "'" for value in values) + "]::text[]"

marks.append({"code": "BENCH975", "name": "검증표식"})
marks_sql = "'" + json.dumps(marks, ensure_ascii=False).replace("'", "''") + "'::jsonb"
names = [
    ("V40__product_search_standard_form.sql", "search_product_has_spelling"),
    ("V40__product_search_standard_form.sql", "search_product_query_tokens"),
    ("V41__shared_product_search.sql", "search_product_queries"),
    ("V46__unify_product_marks.sql", "search_product_metadata_hits"),
    ("V46__unify_product_marks.sql", "search_product_hits"),
    ("V46__unify_product_marks.sql", "search_products_core_v2"),
    ("V46__unify_product_marks.sql", "search_correct_product_query_v2"),
    ("V46__unify_product_marks.sql", "search_products_page_v2"),
    ("V46__unify_product_marks.sql", "search_products_v2"),
]
sql = "BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL jit=off;\n"
sql += "DO $$ BEGIN PERFORM similarity('warmup', 'warmup'); END $$;\n"
for file, name in names:
    definition = function(file, name)
    for _, original in names:
        definition = definition.replace(original + "(", original + "_before975(")
    sql += definition + "\n"
v47 = (migrations / "V47__product_search_match_evidence.sql").read_text()
v47_names = re.findall(r"CREATE (?:OR REPLACE )?FUNCTION (\w+)\(", v47)
for name in v47_names:
    definition = function("V47__product_search_match_evidence.sql", name)
    definition = re.sub(r"\b(" + "|".join(v47_names) + r")\(", lambda match: match[1] + "_v47(", definition)
    sql += definition + "\n"
for file in ("search-test-data.sql", "product-equivalent-spelling-test-data.sql", "related-keyword-test-data.sql"):
    sql += (fixtures / file).read_text() + "\n"
sql += """
INSERT INTO product(id,brand_id,category_id,product_name,moisture_level,oil_level,updated_at)
SELECT 200000+n,90000,2,'성능 검증 젤 '||n,1,1,now() FROM generate_series(1,__PRODUCTS__) n;
INSERT INTO product_variant(id,product_id,display_order,price,volume_value,volume_unit,status)
SELECT id,id,0,1000,100,'ml','active' FROM product WHERE id BETWEEN 200001 AND 200000+__PRODUCTS__;
INSERT INTO mark(code) VALUES ('BENCH975');
INSERT INTO product_mark(product_id,mark_code) VALUES (90101,'BENCH975'),(90107,'BENCH975'),(90101,'MINERAL');
REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
ANALYZE product_search_document;
CREATE TEMP TABLE samples(route text, query text, phase text, iteration int, ms double precision);
CREATE TEMP TABLE operations(route text, phase text, statement text);
"""
sql = sql.replace("__PRODUCTS__", str(product_count))
related = (fixtures / "product-related-keywords-before-975.sql").read_text()
for _, name in names:
    related = related.replace(name + "(", name + "_before975(")
related = related.replace(":limit, 2)", ":limit, 2, __MARKS__)")
related = related.replace("search_product_metadata_hits_before975(result.query)",
                          "search_product_metadata_hits_before975(result.query, __MARKS__)")
related = related.replace(":keyword", "$1").replace(":limit", "5").replace(":maxLength", "100")
# Repository와 같은 필터·선택지 집계 SQL. 카드/브랜드 로딩과 JDBC 왕복은 제외한다.
repository = (server / "src/main/java/com/poudy/product/repository/ProductQueryRepository.java").read_text()
def template(name):
    return re.search(r'private static final String ' + name + r' = """(.*?)""";', repository, re.S)[1]

parameters = {
    "markSelections": "array[]::text[]", "filterMarkCodes": text_array(code for code, _ in filter_marks),
    "filterMarkGroups": text_array(group for _, group in filter_marks),
    "brands": "array[90000]::bigint[]", "categories": "array[]::bigint[]",
    "skins": "array[]::text[]", "sensitiveSkin": "false", "moisture": "array[]::double precision[]",
    "oil": "array[]::double precision[]", "sensoryExcludedCategories": "array[]::text[]",
    "includedGroups": "array[]::text[]", "options": "true", "size": "20", "offset": "0",
}
def repository_query(phase, count):
    if phase == "after":
        searched = "select * from search_product_results($1,2,__MARKS__)"
        score, join, order = "searched.rank", "join searched on searched.product_id=p.id", "m.search_rank"
    else:
        suffix = "_before975" if phase == "before" else "_v47"
        searched = "select (item->>'productId')::bigint as id, (item->>'rank')::bigint as search_rank from search_products_v2" + suffix + "($1,0,null,2,__MARKS__) r, jsonb_array_elements(r.items) item"
        score, join, order = "searched.search_rank", "join searched on searched.id=p.id", "m.search_rank"
    statement = template("CANDIDATES") % ("searched as materialized (" + searched + "), ", score, join, "", "")
    statement += " select count(*) from matched" if count else template("PAGE") % (order, "", order)
    return re.sub(r"(?<!:):([a-zA-Z]+)", lambda match: parameters[match[1]], statement)

operations = []
for phase, suffix in (("before", "_before975"), ("v47", "_v47"), ("after", "")):
    operations.extend([
        ("SEARCH", phase, "select * from search_product_results($1,2,__MARKS__)" if phase == "after" else "select * from search_products_v2" + suffix + "($1,0,null,2,__MARKS__)"),
        ("SUGGEST", phase, "select * from search_product_suggestions($1,0,20,2,__MARKS__)" if phase == "after" else "select * from search_products_v2" + suffix + "($1,0,20,2,__MARKS__)"),
        ("COMPAT_ALL", phase, "select * from search_products_v2" + suffix + "($1,0,null,2,__MARKS__)"),
        ("RELATED", phase, related if phase == "before" else "select * from search_product_related_keywords" + suffix + "($1,5,100,__MARKS__)"),
        ("LIST_FILTERED", phase, repository_query(phase, False)),
        ("COUNT_FILTERED", phase, repository_query(phase, True)),
    ])
operations = [operation for operation in operations if operation[0] in routes]
for route, phase, statement in operations:
    sql += "INSERT INTO operations VALUES ('%s','%s',%s);\n" % (
        route, phase, "'" + statement.replace("__MARKS__", marks_sql).replace("'", "''") + "'"
    )
sql += """
-- 대량 자료에서도 페이지·전체 JSON 계약이 같은지 시간 측정 전에 확인한다.
DO $equivalence$
DECLARE
    query text;
    page_limit int;
    current_result jsonb;
    previous_result jsonb;
BEGIN
    FOREACH query IN ARRAY ARRAY[__QUERIES__] LOOP
        FOR page_limit IN SELECT n FROM (VALUES (20), (NULL::int)) limits(n) LOOP
            SELECT to_jsonb(r) INTO current_result FROM search_products_v2(query,0,page_limit,2,__MARKS__) r;
            SELECT to_jsonb(r) INTO previous_result FROM search_products_v2_before975(query,0,page_limit,2,__MARKS__) r;
            IF current_result IS DISTINCT FROM previous_result THEN
                RAISE EXCEPTION 'dev V46 비교 실패: query %, limit %', query, page_limit;
            END IF;
            SELECT to_jsonb(r) INTO previous_result FROM search_products_v2_v47(query,0,page_limit,2,__MARKS__) r;
            IF current_result IS DISTINCT FROM previous_result THEN
                RAISE EXCEPTION '검색 V47 비교 실패: query %, limit %', query, page_limit;
            END IF;
        END LOOP;
    END LOOP;
END
$equivalence$;
DO $measure$
DECLARE
    query text;
    route_name text;
    operation record;
    iteration int;
    started timestamptz;
BEGIN
    FOREACH query IN ARRAY ARRAY[__QUERIES__] LOOP
        FOREACH route_name IN ARRAY ARRAY[__ROUTES__] LOOP
            FOR iteration IN 1..__RUNS__ LOOP
                FOR operation IN SELECT * FROM operations WHERE route=route_name
                    ORDER BY CASE WHEN iteration % 2 = 0 THEN phase END ASC,
                             CASE WHEN iteration % 2 = 1 THEN phase END DESC LOOP
                    started := clock_timestamp();
                    EXECUTE operation.statement USING query;
                    IF iteration > __WARMUP__ THEN
                        INSERT INTO samples VALUES(route_name,query,operation.phase,iteration-__WARMUP__,
                            extract(epoch FROM clock_timestamp()-started)*1000);
                    END IF;
                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END
$measure$;
SELECT jsonb_build_object('environment', jsonb_build_object(
    'server',version(),'products',(select count(*) from product),'jit',current_setting('jit'),
    'work_mem',current_setting('work_mem'),'shared_buffers',current_setting('shared_buffers'),
    'warmup',__WARMUP__,'iterations',__ITERATIONS__),
    'samples',(SELECT jsonb_agg(to_jsonb(s) ORDER BY route,query,phase,iteration) FROM samples s));
"""
sql = sql.replace("__QUERIES__", ",".join("'" + query.replace("'", "''") + "'" for query in queries))
sql = sql.replace("__ROUTES__", ",".join("'" + route.replace("'", "''") + "'" for route in routes))
sql = sql.replace("__RUNS__", str(warmup + iterations)).replace("__WARMUP__", str(warmup)).replace("__ITERATIONS__", str(iterations))
# 설정으로 인라이닝을 막은 evaluate의 내부 SQL도 같은 generic plan으로 살펴본다.
evaluation = function("V48__separate_product_search_stages.sql", "search_product_evaluate").split("AS $$", 1)[1].rsplit("$$;", 1)[0]
for index, parameter in enumerate(("p_parts", "p_offset", "p_limit", "p_max_tier", "p_include_metadata", "p_details", "p_marks"), 1):
    evaluation = re.sub(r"\b" + parameter + r"\b", "$" + str(index), evaluation)
sql += "SET LOCAL plan_cache_mode=force_generic_plan;\nPREPARE search_975_evaluation(product_search_part[],bigint,int,int,boolean,boolean,jsonb) AS " + evaluation + ";\n"
for query in ("선크림", "닥터지썬크림", "피디알엔", "성능 검증 젤"):
    for phase, statement in (
        ("candidate", "select * from search_product_candidate_ids(search_product_analyze('%s'))"),
        ("evidence", "select * from search_product_match_evidence(search_product_analyze('%s'),true,__MARKS__)"),
        ("summary", "EXECUTE search_975_evaluation(search_product_analyze('%s'),0,null,2,true,false,__MARKS__)"),
        ("page_details", "EXECUTE search_975_evaluation(search_product_analyze('%s'),0,20,2,true,true,__MARKS__)"),
    ):
        sql += "SELECT '%s:%s';\nEXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) %s;\n" % (phase, query, statement % query)
for query in ("ㅂ", "성능 검증 젤"):
    for route, phase, statement in operations:
        if route not in ("SEARCH", "SUGGEST", "LIST_FILTERED", "COUNT_FILTERED"):
            continue
        sql += "SELECT '%s:%s:%s';\nEXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) %s;\n" % (route, phase, query, statement.replace("$1", "'" + query + "'"))
sql += "ROLLBACK;\n"
sql = sql.replace("__MARKS__", marks_sql)
(output / "benchmark.sql").write_text(sql)
completed = subprocess.run(command + ["-X", "-q", "-t", "-A", "-v", "ON_ERROR_STOP=1"], input=sql, text=True, capture_output=True)
(output / "stdout.txt").write_text(completed.stdout)
(output / "stderr.txt").write_text(completed.stderr)
completed.check_returncode()
data = json.loads(completed.stdout.splitlines()[0])
(output / "samples.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
groups = {}
for sample in data["samples"]:
    groups.setdefault((sample["route"], sample["query"], sample["phase"]), []).append(sample["ms"])
lines = ["route\tquery\tphase\tp50_ms\tp95_ms\tsamples"]
for key, values in sorted(groups.items()):
    ordered = sorted(values)
    lines.append("\t".join(key) + "\t%.3f\t%.3f\t%d" % (statistics.median(values), ordered[math.ceil(.95*len(values))-1], len(values)))
(output / "summary.tsv").write_text("\n".join(lines) + "\n")
print("\n".join(lines))

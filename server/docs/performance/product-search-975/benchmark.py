"""V43과 현재 검색을 같은 트랜잭션·자료에서 교대로 측정한다. 전용 테스트 DB에서만 실행한다.

예: python3 benchmark.py /tmp/search-975 psql -U postgres -d poudy_search_975
psql 대신 docker exec -i <container> psql ... 명령도 받을 수 있다.
측정용 함수·데이터는 마지막 ROLLBACK으로 모두 되돌린다.
"""

import json
import math
import statistics
import subprocess
import sys
from pathlib import Path

server = Path(__file__).resolve().parents[3]
output = Path(sys.argv[1])
output.mkdir(parents=True, exist_ok=True)
command = sys.argv[2:]
migrations = server / "src/main/resources/db/migration"
fixtures = server / "src/test/resources/db"


def function(file, name):
    source = (migrations / file).read_text()
    start = source.find("CREATE OR REPLACE FUNCTION " + name + "(")
    if start < 0:
        start = source.index("CREATE FUNCTION " + name + "(")
    if name == "search_product_has_spelling":
        return source[start : source.index(";", start) + 1]
    return source[start : source.index("$$;", source.index("AS $$", start) + 5) + 3]


names = [
    ("V40__product_search_standard_form.sql", "search_product_has_spelling"),
    ("V40__product_search_standard_form.sql", "search_product_query_tokens"),
    ("V41__shared_product_search.sql", "search_product_queries"),
    ("V41__shared_product_search.sql", "search_product_metadata_hits"),
    ("V43__rank_combined_brand_product_search.sql", "search_product_hits"),
    ("V41__shared_product_search.sql", "search_products_core_v2"),
    ("V33__product_metadata_search.sql", "search_products_page_v2"),
    ("V33__product_metadata_search.sql", "search_products_v2"),
]
sql = "BEGIN ISOLATION LEVEL SERIALIZABLE; SET LOCAL jit=off;\n"
for file, name in names:
    definition = function(file, name)
    for _, original in names:
        definition = definition.replace(original + "(", original + "_before975(")
    sql += definition + "\n"
for file in ("search-test-data.sql", "product-equivalent-spelling-test-data.sql", "related-keyword-test-data.sql"):
    sql += (fixtures / file).read_text() + "\n"
sql += """
INSERT INTO product(id,brand_id,category_id,product_name,moisture_level,oil_level,updated_at)
SELECT 200000+n,90000,2,'성능 검증 젤 '||n,1,1,now() FROM generate_series(1,1000) n;
INSERT INTO product_variant(id,product_id,display_order,price,volume_value,volume_unit,status)
SELECT id,id,0,1000,100,'ml','active' FROM product WHERE id BETWEEN 200001 AND 201000;
INSERT INTO badge(code,name) VALUES ('BENCH975','검증표식');
INSERT INTO product_badge(product_id,badge_code) VALUES (90101,'BENCH975'),(90107,'BENCH975');
INSERT INTO product_attribute_value(product_id,attribute_id,value_code)
SELECT 90101,id,'MINERAL' FROM attribute WHERE code='UV_FILTER_TYPE';
REFRESH MATERIALIZED VIEW product_search_document;
REFRESH MATERIALIZED VIEW search_vocabulary;
ANALYZE product_search_document;
CREATE TEMP TABLE samples(route text, query text, phase text, iteration int, ms double precision);
CREATE TEMP TABLE operations(route text, phase text, statement text);
"""
related = (fixtures / "product-related-keywords-before-975.sql").read_text()
for _, name in names:
    related = related.replace(name + "(", name + "_before975(")
related = related.replace(":keyword", "$1").replace(":limit", "5").replace(":maxLength", "100")
operations = [
    ("SUGGEST", "before", "select * from search_products_v2_before975($1,0,20,2)"),
    ("SUGGEST", "after", "select * from search_products_v2($1,0,20,2)"),
    ("SEARCH", "before", "select * from search_products_v2_before975($1,0,null,2)"),
    ("SEARCH", "after", "select * from search_products_v2($1,0,null,2)"),
    ("RELATED", "before", related),
    ("RELATED", "after", "select * from search_product_related_keywords($1,5,100)"),
]
for route, phase, statement in operations:
    sql += "INSERT INTO operations VALUES ('%s','%s',%s);\n" % (
        route, phase, "'" + statement.replace("'", "''") + "'"
    )
sql += """
DO $measure$
DECLARE
    query text;
    route_name text;
    operation record;
    iteration int;
    started timestamptz;
BEGIN
    FOREACH query IN ARRAY ARRAY['ㅂ','피디알엔','검증스내일','닥터지블랙검증','닥터지썬크림','선크림',
                                '무기자차 검증표식','연관브랜드 수분','성능 검증 젤'] LOOP
        FOREACH route_name IN ARRAY ARRAY['SEARCH','SUGGEST','RELATED'] LOOP
            FOR iteration IN 1..70 LOOP
                FOR operation IN SELECT * FROM operations WHERE route=route_name
                    ORDER BY CASE WHEN iteration % 2 = 0 THEN phase END ASC,
                             CASE WHEN iteration % 2 = 1 THEN phase END DESC LOOP
                    started := clock_timestamp();
                    EXECUTE operation.statement USING query;
                    IF iteration > 20 THEN
                        INSERT INTO samples VALUES(route_name,query,operation.phase,iteration-20,
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
    'work_mem',current_setting('work_mem'),'shared_buffers',current_setting('shared_buffers')),
    'samples',(SELECT jsonb_agg(to_jsonb(s) ORDER BY route,query,phase,iteration) FROM samples s));
"""
for query in ("선크림", "닥터지썬크림", "피디알엔", "성능 검증 젤"):
    for phase, statement in (
        ("candidate", "select * from search_product_candidate_ids(search_product_analyze('%s'))"),
        ("evidence", "select * from search_product_match_evidence(search_product_analyze('%s'),true)"),
    ):
        sql += "SELECT '%s:%s';\nEXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) %s;\n" % (phase, query, statement % query)
sql += "ROLLBACK;\n"
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
